import test from "node:test";
import assert from "node:assert/strict";
import { activeNavHref } from "../lib/domain/navigation";

const items = [
  ["Home", "/admin", "Gauge"],
  ["Workshops", "/admin/workshops", "Book"],
  ["Bookings", "/admin/workshops/bookings", "Book"],
] as const;

test("only the most specific sidebar destination is active", () => {
  assert.equal(activeNavHref(items, "/admin/workshops/bookings", new URLSearchParams()), "/admin/workshops/bookings");
  assert.equal(activeNavHref(items, "/admin/workshops/123", new URLSearchParams()), "/admin/workshops");
  assert.equal(activeNavHref(items, "/administrator", new URLSearchParams()), undefined);
});

test("reviewer filters and nested detail pages select the right destination", () => {
  const nav = [
    ["Home", "/reviewer", "Gauge"],
    ["Pending", "/reviewer?view=pending", "Book"],
    ["UdbhAV", "/reviewer/udbhav", "Rocket"],
  ] as const;
  assert.equal(activeNavHref(nav, "/reviewer", new URLSearchParams("view=pending")), "/reviewer?view=pending");
  assert.equal(activeNavHref(nav, "/reviewer/udbhav/123", new URLSearchParams()), "/reviewer/udbhav");
});
