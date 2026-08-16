import test from "node:test";
import assert from "node:assert/strict";
import {
  assertDeadline,
  assertTeamSize,
  canEditSubmitted,
  registrationState,
  submissionStatus,
} from "../lib/domain/program";
import { calculateWeightedScore } from "../lib/domain/evaluation";
import { validateDynamicAnswers } from "../lib/validation/dynamic-form";
import { canAccessApplication } from "../lib/domain/access";
import { canTransitionApplication, participantVisibleStatus } from "../lib/domain/status";
import { formBuilderInput } from "../lib/validation/form-builder";

test("registration deadlines are enforced server-side", () => {
  const now = new Date("2026-08-16T12:00:00Z");
  assert.equal(
    registrationState(
      {
        status: "REGISTRATION_OPEN",
        registrationOpenAt: new Date("2026-08-15"),
        registrationCloseAt: new Date("2026-08-17"),
      },
      now,
    ),
    "OPEN",
  );
  assert.throws(
    () =>
      assertDeadline(
        { status: "REGISTRATION_OPEN", registrationOpenAt: null, registrationCloseAt: new Date("2026-08-15") },
        now,
      ),
    /closed/,
  );
});

test("team size rules reject undersized and oversized teams", () => {
  assert.doesNotThrow(() => assertTeamSize("TEAM", 2, 4, 3));
  assert.throws(() => assertTeamSize("TEAM", 2, 4, 1), /between 2 and 4/);
  assert.throws(() => assertTeamSize("TEAM", 2, 4, 5), /between 2 and 4/);
});

test("no-review capacity programs confirm available places and waitlist overflow", () => {
  assert.equal(
    submissionStatus({ requiresReview: false, capacity: 50, currentCount: 49, waitlistEnabled: true }),
    "CONFIRMED",
  );
  assert.equal(
    submissionStatus({ requiresReview: false, capacity: 50, currentCount: 50, waitlistEnabled: true }),
    "WAITLISTED",
  );
  assert.throws(
    () => submissionStatus({ requiresReview: false, capacity: 50, currentCount: 50, waitlistEnabled: false }),
    /reached capacity/,
  );
  assert.equal(
    submissionStatus({ requiresReview: true, capacity: null, currentCount: 0, waitlistEnabled: false }),
    "SUBMITTED",
  );
});

test("edit windows honor explicit admin overrides", () => {
  const now = new Date("2026-08-16T12:00:00Z");
  assert.equal(
    canEditSubmitted({ allowsEditAfterSubmit: false, editDeadline: null }, new Date("2026-08-17"), now),
    true,
  );
  assert.equal(
    canEditSubmitted({ allowsEditAfterSubmit: true, editDeadline: new Date("2026-08-15") }, null, now),
    false,
  );
});

test("weighted evaluation score is normalized to 100", () => {
  assert.equal(
    calculateWeightedScore([
      { score: 8, maxScore: 10, weight: 2 },
      { score: 5, maxScore: 10, weight: 1 },
    ]),
    70,
  );
  assert.throws(() => calculateWeightedScore([{ score: 11, maxScore: 10, weight: 1 }]), /outside/);
});

test("application access prevents IDOR across participant, reviewer, and manager scopes", () => {
  assert.equal(canAccessApplication("read", { owns: true, assigned: false, manages: false }), true);
  assert.equal(canAccessApplication("read", { owns: false, assigned: false, manages: false }), false);
  assert.equal(canAccessApplication("review", { owns: false, assigned: true, manages: false }), true);
  assert.equal(canAccessApplication("review", { owns: false, assigned: false, manages: false }), false);
  assert.equal(canAccessApplication("read", { owns: false, assigned: false, manages: true }), true);
  assert.equal(canAccessApplication("edit", { owns: false, assigned: false, manages: true }), false);
});

test("private decisions remain hidden until results are published", () => {
  assert.equal(participantVisibleStatus("SELECTED", null), "UNDER_REVIEW");
  assert.equal(participantVisibleStatus("REJECTED", null), "UNDER_REVIEW");
  assert.equal(participantVisibleStatus("SELECTED", new Date()), "SELECTED");
});

test("application status transitions reject invalid workflow jumps", () => {
  assert.equal(canTransitionApplication("SUBMITTED", "UNDER_REVIEW"), true);
  assert.equal(canTransitionApplication("SUBMITTED", "CONFIRMED"), false);
  assert.equal(canTransitionApplication("CHANGES_REQUESTED", "SUBMITTED"), true);
});

test("SSIP-style change requests and resubmission use the generic workflow", () => {
  assert.equal(canTransitionApplication("SUBMITTED", "CHANGES_REQUESTED"), true);
  assert.equal(canTransitionApplication("CHANGES_REQUESTED", "SUBMITTED"), true);
  assert.equal(canTransitionApplication("SUBMITTED", "APPROVED"), false);
  assert.equal(canTransitionApplication("UNDER_REVIEW", "APPROVED"), true);
});

test("UdbhAV-style review and round progression use generic transitions", () => {
  assert.equal(canTransitionApplication("SUBMITTED", "UNDER_REVIEW"), true);
  assert.equal(canTransitionApplication("UNDER_REVIEW", "SHORTLISTED"), true);
  assert.equal(canTransitionApplication("SHORTLISTED", "UNDER_REVIEW"), true);
  assert.equal(canTransitionApplication("SHORTLISTED", "SELECTED"), true);
});

test("form builder rejects duplicate keys across sections", () => {
  const result = formBuilderInput.safeParse({
    sections: [
      { title: "One", fields: [{ key: "email", type: "EMAIL", label: "Email", required: true, allowedFileTypes: [] }] },
      {
        title: "Two",
        fields: [{ key: "email", type: "SHORT_TEXT", label: "Backup", required: false, allowedFileTypes: [] }],
      },
    ],
  });
  assert.equal(result.success, false);
});

test("dynamic form validation enforces required and typed answers", () => {
  const base = {
    id: "f1",
    minLength: null,
    maxLength: null,
    minNumber: null,
    maxNumber: null,
    options: null,
    conditionFieldKey: null,
    conditionOperator: null,
    conditionValue: null,
  };
  const fields = [
    { ...base, key: "email", type: "EMAIL", label: "Email", required: true },
    { ...base, id: "f2", key: "consent", type: "CONSENT", label: "Consent", required: true },
  ];
  assert.deepEqual(validateDynamicAnswers(fields, { email: "hello@example.com", consent: true }), {});
  assert.ok(validateDynamicAnswers(fields, { email: "bad", consent: false }).email);
  assert.ok(validateDynamicAnswers(fields, { email: "bad", consent: false }).consent);
});
