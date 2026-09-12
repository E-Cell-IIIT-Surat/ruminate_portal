import test from "node:test";
import assert from "node:assert/strict";
import { launchWindow, registrationState, assertDeadline } from "../lib/domain/program";
import { eventTimeInput, eventTimeToIso } from "../lib/domain/event-time";

test("event administration preserves IST across browsers and UTC servers", () => {
  assert.equal(eventTimeToIso("2026-10-07T23:59"), "2026-10-07T18:29:00.000Z");
  assert.equal(eventTimeInput("2026-10-07T18:29:00.000Z"), "2026-10-07T23:59");
  assert.equal(eventTimeToIso(""), null);
});

const now = new Date("2026-09-12T08:00:00Z");
const tomorrow = new Date("2026-09-13T08:00:00Z");
test("launch now overrides a future opening and accepts registration immediately", () => {
  const window = launchWindow("now", tomorrow, new Date("2026-10-01"), now);
  assert.equal(registrationState({ status: "REGISTRATION_OPEN", ...window }, now), "OPEN");
});
test("scheduled registration opens and closes at its boundaries without a worker", () => {
  const close = new Date("2026-09-14T08:00:00Z");
  const program = { status: "PUBLISHED", ...launchWindow("schedule", close, tomorrow, now) };
  assert.equal(registrationState(program, now), "UPCOMING");
  assert.equal(registrationState(program, tomorrow), "OPEN");
  assert.equal(registrationState(program, close), "CLOSED");
  assert.throws(() => assertDeadline(program, close), /closed/);
});
test("launch rejects expired closing dates and missing or past scheduled openings", () => {
  assert.throws(() => launchWindow("now", now, undefined, now));
  assert.throws(() => launchWindow("schedule", tomorrow, undefined, now));
  assert.throws(() => launchWindow("schedule", tomorrow, now, now));
});
test("draft and deleted programs never accept registrations; completed events are closed", () => {
  const window = { registrationOpenAt: null, registrationCloseAt: null };
  for (const status of ["DRAFT", "ARCHIVED"]) assert.throws(() => assertDeadline({ status, ...window }, now));
  for (const status of ["REGISTRATION_CLOSED", "IN_PROGRESS", "COMPLETED"])
    assert.equal(registrationState({ status, ...window }, now), "CLOSED");
});
