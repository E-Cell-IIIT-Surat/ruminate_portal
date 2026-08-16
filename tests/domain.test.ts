import test from "node:test";
import assert from "node:assert/strict";
import { assertDeadline, assertTeamSize, canEditSubmitted, registrationState } from "../lib/domain/program";
import { calculateWeightedScore } from "../lib/domain/evaluation";
import { validateDynamicAnswers } from "../lib/validation/dynamic-form";

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
  assert.throws(() => calculateWeightedScore([{ score: 11, maxScore: 10, weight: 1 }]), /Invalid/);
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
