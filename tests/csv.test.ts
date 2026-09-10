import test from "node:test";
import assert from "node:assert/strict";
import { csvCell } from "../lib/domain/csv";

test("exports quote ordinary text without losing commas, quotes, or newlines", () => {
  assert.equal(csvCell('A, "B"\nC'), '"A, ""B""\nC"');
  assert.equal(csvCell(null), '""');
  assert.equal(csvCell(42), '"42"');
});
test("exports neutralize formulas and whitespace-prefixed formulas", () => {
  for (const value of ["=1+1", "+1", "-1", "@SUM(A1)", "  =1", "\t=1", "\r=1", "\n=1"]) {
    assert.ok(csvCell(value).startsWith("\"'"), value);
  }
});
