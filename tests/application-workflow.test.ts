import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma, PrismaClient } from "@prisma/client";
import { templates } from "../lib/forms/templates";
import { formBuilderInput } from "../lib/validation/form-builder";
import { isFieldVisible, validateDynamicAnswers } from "../lib/validation/dynamic-form";
import { saveDraft, submitApplication } from "../lib/services/applications";
import { retryTransaction } from "../lib/services/transaction-retry";

function published(name: string) {
  return formBuilderInput.parse({ sections: templates[name] }).sections.map((section, i) => ({
    ...section,
    fields: section.fields.map((field, j) => ({ ...field, id: `field_${i}_${j}` })),
  }));
}
function fixture(name = "Basic registration", failEmail = false) {
  const sections = published(name);
  const fields = sections.flatMap((section) => section.fields);
  const answers = Object.fromEntries(
    fields
      .filter((field) => !["FILE", "HEADING", "HELP_TEXT"].includes(field.type))
      .map((field) => [
        field.key,
        field.type === "EMAIL"
          ? "student@example.com"
          : field.type === "PHONE"
            ? "9876543210"
            : field.type === "NUMBER"
              ? 100
              : field.type === "CONSENT"
                ? true
                : "Student response",
      ]),
  );
  const record = {
    id: "application",
    referenceId: "TEST-2026-ABC",
    userId: "student",
    programId: "program",
    status: "DRAFT",
    submittedAt: null as Date | null,
    lastSavedAt: new Date(),
    editOverrideUntil: null,
    program: {
      status: "REGISTRATION_OPEN",
      registrationOpenAt: null,
      registrationCloseAt: null,
      participationMode: "INDIVIDUAL",
      teamMinSize: 1,
      teamMaxSize: 3,
      allowsEditAfterSubmit: false,
      editDeadline: null,
      requiresReview: false,
      capacity: null,
      waitlistEnabled: false,
      name: "Test event",
    },
    user: { email: "student@example.com" },
    team: null as null | { name: string; createdAt: Date; members: { name: string; createdAt: Date }[] },
    answers: [] as { field: (typeof fields)[number]; value: unknown }[],
    files: fields
      .filter((field) => field.type === "FILE")
      .map((field) => ({
        id: `file_${field.id}`,
        fieldId: field.id,
        originalFilename: "proposal.pdf",
        mimeType: "application/pdf",
        size: 100,
        deletedAt: null as Date | null,
      })),
    formVersion: { sections },
  };
  const calls = { revisions: [] as Prisma.InputJsonValue[], emails: 0, notifications: 0, transactions: 0 };
  const tx = {
    $executeRaw: async () => 1,
    application: {
      findUnique: async ({ where }: { where: { userId: string } }) => (where.userId === record.userId ? record : null),
      count: async () => 0,
      update: async ({ data }: { data: Partial<typeof record> }) => Object.assign(record, data),
    },
    applicationAnswer: {
      deleteMany: async ({ where }: { where: { fieldId: { in: string[] } } }) => {
        record.answers = record.answers.filter((answer) => !where.fieldId.in.includes(answer.field.id));
      },
      createMany: async ({ data }: { data: { fieldId: string; value: unknown }[] }) => {
        record.answers.push(
          ...data.map((item) => ({ field: fields.find((field) => field.id === item.fieldId)!, value: item.value })),
        );
      },
    },
    applicationRevision: {
      count: async () => calls.revisions.length,
      create: async ({ data }: { data: { snapshot: Prisma.InputJsonValue } }) => {
        calls.revisions.push(data.snapshot);
      },
    },
    applicationStatusHistory: { create: async () => ({}) },
    auditLog: { create: async () => ({}) },
  };
  const client = {
    $transaction: async (run: (tx: Prisma.TransactionClient) => Promise<unknown>) => {
      calls.transactions++;
      return run(tx as unknown as Prisma.TransactionClient);
    },
    notification: {
      create: async () => {
        calls.notifications++;
        return {};
      },
    },
    emailDelivery: {
      create: async () => {
        calls.emails++;
        if (failEmail) throw new Error("Queue unavailable");
        return { id: "receipt_email" };
      },
    },
  } as unknown as PrismaClient;
  return { record, calls, client, answers, fields };
}

for (const name of Object.keys(templates)) {
  test(`${name}: published template submits final answers and queues a receipt`, async () => {
    const f = fixture(name);
    const result = await submitApplication("application", "student", f.answers, f.client);
    assert.equal(result.application.status, "CONFIRMED");
    assert.equal(result.emailDeliveryId, "receipt_email");
    assert.equal(f.record.answers.length, Object.keys(f.answers).length);
    assert.equal(f.calls.revisions.length, 1);
    assert.equal(f.calls.emails, 1);
    assert.equal(f.calls.notifications, 1);
    assert.ok(f.record.submittedAt);
  });
}

test("invalid final answers identify fields and never submit or queue email", async () => {
  const f = fixture();
  await assert.rejects(
    submitApplication("application", "student", { ...f.answers, email: "invalid" }, f.client),
    (error: unknown) => {
      assert.equal((error as { code: string }).code, "VALIDATION_ERROR");
      assert.match((error as { fields: Record<string, string> }).fields.email, /email/i);
      return true;
    },
  );
  assert.equal(f.record.status, "DRAFT");
  assert.equal(f.calls.emails, 0);
  assert.equal(f.calls.revisions.length, 0);
});

test("latest answers replace saved values and a later draft cannot overwrite submission", async () => {
  const f = fixture();
  await saveDraft("application", "student", { ...f.answers, name: "Old" }, f.client);
  await submitApplication("application", "student", { ...f.answers, name: "Final" }, f.client);
  assert.equal(f.record.answers.find((item) => item.field.key === "name")?.value, "Final");
  await assert.rejects(saveDraft("application", "student", { name: "Stale" }, f.client), /no longer be edited/);
  await assert.rejects(submitApplication("application", "student", f.answers, f.client), /already been submitted/);
  assert.equal(f.calls.emails, 1);
});

test("receipt queue failure leaves application available to admin", async () => {
  const f = fixture("Basic registration", true);
  const result = await submitApplication("application", "student", f.answers, f.client);
  assert.equal(result.application.status, "CONFIRMED");
  assert.equal(result.emailDeliveryId, null);
  assert.ok(f.record.answers.length);
  assert.equal(f.calls.revisions.length, 1);
});

test("team snapshot is JSON-safe and missing team is explained", async () => {
  const f = fixture();
  f.record.program.participationMode = "TEAM";
  await assert.rejects(submitApplication("application", "student", f.answers, f.client), /highlighted answers/);
  f.record.team = { name: "Builders", createdAt: new Date(), members: [{ name: "Student", createdAt: new Date() }] };
  await submitApplication("application", "student", f.answers, f.client);
  const snapshot = f.calls.revisions[0] as { team: { createdAt: unknown } };
  assert.equal(typeof snapshot.team.createdAt, "string");
});

test("custom and modified fields validate optional checkboxes, conditions and required files", () => {
  const base = {
    ...fixture().fields[0],
    options: null,
    conditionFieldKey: null,
    conditionOperator: null,
    conditionValue: null,
  };
  const fields = [
    { ...base, key: "age", type: "NUMBER", required: true },
    { ...base, key: "newsletter", type: "CHECKBOX", required: false },
    {
      ...base,
      id: "document",
      key: "document",
      type: "FILE",
      required: true,
      conditionFieldKey: "age",
      conditionOperator: "==",
      conditionValue: "18",
    },
  ];
  assert.deepEqual(validateDynamicAnswers(fields, { age: 20, newsletter: false }, []), {});
  assert.ok(validateDynamicAnswers(fields, { age: 18, newsletter: false }, []).document);
  assert.deepEqual(validateDynamicAnswers(fields, { age: 18, newsletter: false }, [{ fieldId: "document" }]), {});
  assert.ok(validateDynamicAnswers(fields, { age: true }, []).age);
  assert.ok(validateDynamicAnswers(fields, { age: " " }, []).age);
  assert.equal(
    isFieldVisible(
      { conditionFieldKey: "consent", conditionOperator: "==", conditionValue: "true" },
      { consent: true },
    ),
    true,
  );
});

test("modified template saves a changed field type with final answers", async () => {
  const f = fixture();
  Object.assign(f.fields[0], { type: "NUMBER", label: "Team size", minNumber: 1, maxNumber: 10 });
  const result = await submitApplication("application", "student", { ...f.answers, name: 5 }, f.client);
  assert.equal(result.application.status, "CONFIRMED");
  assert.equal(f.record.answers.find((answer) => answer.field.key === "name")?.value, 5);
});

test("closed registrations and other users cannot submit", async () => {
  const f = fixture();
  f.record.program.status = "REGISTRATION_CLOSED";
  await assert.rejects(submitApplication("application", "student", f.answers, f.client), /closed/);
  await assert.rejects(submitApplication("application", "someone_else", f.answers, f.client), /not found/);
  assert.equal(f.calls.revisions.length, 0);
});

test("serialization failures are retried, unrelated errors are not", async () => {
  let tries = 0;
  assert.equal(
    await retryTransaction(async () => {
      if (++tries < 3) throw { code: "P2034" };
      return "committed";
    }),
    "committed",
  );
  assert.equal(tries, 3);
  tries = 0;
  await assert.rejects(
    retryTransaction(async () => {
      tries++;
      throw new Error("validation");
    }),
    /validation/,
  );
  assert.equal(tries, 1);
});
