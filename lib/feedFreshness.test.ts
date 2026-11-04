import assert from "node:assert/strict";
import { test } from "node:test";
import { hasNewListings } from "./feedFreshness.ts";

const listing = (id: string, createdAt = "2026-11-05T09:00:00Z") => ({
  id,
  createdAt,
});

test("detects a newly posted listing without changing the current list", () => {
  const current = [listing("one"), listing("two", "2026-11-04T09:00:00Z")];
  const incoming = [listing("new", "2026-11-05T09:01:00Z"), ...current];
  assert.equal(hasNewListings(current, incoming), true);
  assert.deepEqual(
    current.map(({ id }) => id),
    ["one", "two"],
  );
});

test("does not announce engagement changes or reordered existing listings as new", () => {
  const current = [listing("one"), listing("two")];
  assert.equal(hasNewListings(current, [...current].reverse()), false);
});

test("does not announce an older listing resurfaced by personalization as newly posted", () => {
  assert.equal(
    hasNewListings([listing("one")], [listing("old", "2026-10-15T09:00:00Z")]),
    false,
  );
});

test("notifies an empty feed when an eligible listing becomes available", () => {
  assert.equal(hasNewListings([], [listing("new")]), true);
  assert.equal(hasNewListings([], []), false);
});

test("detects distinct listings sharing a creation timestamp and ignores invalid dates", () => {
  assert.equal(hasNewListings([listing("one")], [listing("two")]), true);
  assert.equal(
    hasNewListings([listing("one")], [listing("two", "invalid")]),
    false,
  );
});
