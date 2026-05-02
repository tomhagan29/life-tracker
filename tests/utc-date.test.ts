import assert from "node:assert/strict";
import test from "node:test";
import {
  getUtcDateKey,
  isSameUtcDate,
  parseUtcDateInput,
  utcDisplayDateFormatter,
  utcShortDateFormatter,
} from "../lib/utc-date";

test("date inputs are parsed as UTC calendar dates", () => {
  const deadline = parseUtcDateInput("2026-03-15");

  assert.ok(deadline);
  assert.equal(deadline.toISOString(), "2026-03-15T00:00:00.000Z");
  assert.equal(getUtcDateKey(deadline), "2026-03-15");
});

test("UTC date comparisons ignore local timezone offsets", () => {
  assert.equal(
    isSameUtcDate(
      new Date("2026-03-15T00:00:00.000Z"),
      new Date("2026-03-15T23:59:59.999Z"),
    ),
    true,
  );
  assert.equal(
    isSameUtcDate(
      new Date("2026-03-15T00:00:00.000Z"),
      new Date("2026-03-14T23:59:59.999Z"),
    ),
    false,
  );
});

test("UTC deadline formatters render the stored date", () => {
  const deadline = new Date("2026-03-15T00:00:00.000Z");

  assert.equal(utcShortDateFormatter.format(deadline), "15 Mar");
  assert.equal(utcDisplayDateFormatter.format(deadline), "15 Mar 2026");
});
