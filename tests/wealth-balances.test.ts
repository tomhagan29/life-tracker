import assert from "node:assert/strict";
import test from "node:test";
import { getCreditDebt, getNetWorthBalance } from "../lib/wealth-balances";

test("credit balances preserve their sign in net worth", () => {
  assert.equal(
    getNetWorthBalance({ type: "credit", balance: -3400 }),
    -3400,
  );
  assert.equal(
    getNetWorthBalance({ type: "credit", balance: 125 }),
    125,
  );
});

test("credit debt excludes positive overpayment balances", () => {
  assert.equal(getCreditDebt(-3400), 3400);
  assert.equal(getCreditDebt(125), 0);
});
