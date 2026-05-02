import assert from "node:assert/strict";
import test from "node:test";
import { toMoneyDecimal } from "../lib/money";

test("money decimals are quantized to two decimal places", () => {
  assert.equal(toMoneyDecimal("12.345").toFixed(2), "12.35");
  assert.equal(toMoneyDecimal("12.344").toFixed(2), "12.34");
  assert.equal(toMoneyDecimal("-12.345").toFixed(2), "-12.35");
});

test("repeated money arithmetic is rounded before persistence", () => {
  const balance = Array.from({ length: 10 }, () => "0.10").reduce(
    (sum, amount) => toMoneyDecimal(sum.plus(amount)),
    toMoneyDecimal("0.00"),
  );

  assert.equal(balance.toFixed(2), "1.00");
});
