import test from "node:test";
import assert from "node:assert/strict";
import { canDeleteTeam } from "../lib/domain/team";

test("team leaders and team administrators can delete teams", () => {
  assert.equal(canDeleteTeam({ id: "leader", canManageUsers: false }, "leader"), true);
  assert.equal(canDeleteTeam({ id: "admin", canManageUsers: true }, "leader"), true);
});

test("membership and unrelated accounts do not permit deletion", () => {
  assert.equal(canDeleteTeam({ id: "member", canManageUsers: false }, "leader"), false);
  assert.equal(canDeleteTeam({ id: "other", canManageUsers: false }, "leader"), false);
});
