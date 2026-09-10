import test from "node:test";
import assert from "node:assert/strict";
import { hasVerifiedEmailAccess } from "../lib/domain/identity";

test("an unverified signup cannot gain access by claiming an allowlisted email", () => {
  assert.equal(
    hasVerifiedEmailAccess({ email: "admin@example.org", emailVerified: null }, new Set(["admin@example.org"])),
    false,
  );
});
test("verified ownership still requires an allowlisted address", () => {
  const allowlist = new Set(["admin@example.org"]);
  assert.equal(hasVerifiedEmailAccess({ email: "ADMIN@example.org", emailVerified: new Date() }, allowlist), true);
  assert.equal(hasVerifiedEmailAccess({ email: "other@example.org", emailVerified: new Date() }, allowlist), false);
});
