import assert from "node:assert/strict";
import test from "node:test";
import {
  DailyLogReferenceError,
  assertDailyLogReferencesExist,
  collectDailyLogReferenceIds,
  getDailyLogForeignKeyErrorMessage,
} from "../lib/daily-log-references";

const input = {
  transactions: [
    {
      direction: "outgoing",
      accountId: 1,
      categoryId: 10,
      transferAccountId: null,
    },
    {
      direction: "transfer",
      accountId: 2,
      categoryId: null,
      transferAccountId: 3,
    },
  ],
  habitIds: [20, 20, 21],
  investmentSnapshots: [{ accountId: 4 }],
  includeInvestmentSnapshots: true,
};

test("daily-log reference IDs include only submitted records that will be used", () => {
  assert.deepEqual(collectDailyLogReferenceIds(input), {
    accountIds: [1, 2, 3, 4],
    categoryIds: [10],
    habitIds: [20, 21],
  });

  assert.deepEqual(
    collectDailyLogReferenceIds({
      ...input,
      includeInvestmentSnapshots: false,
    }).accountIds,
    [1, 2, 3],
  );
});

test("daily-log reference validation reports the stale destination account", () => {
  assert.throws(
    () =>
      assertDailyLogReferencesExist(input, {
        accounts: [
          { id: 1, name: "Current", type: "current" },
          { id: 2, name: "Savings", type: "savings" },
          { id: 4, name: "Investments", type: "investment" },
        ],
        categories: [{ id: 10, name: "Food" }],
        habits: [
          { id: 20, name: "Run" },
          { id: 21, name: "Read" },
        ],
      }),
    (error) =>
      error instanceof DailyLogReferenceError &&
      error.message ===
        "The destination account (ID 3) no longer exists. Please refresh and try again.",
  );
});

test("daily-log reference validation rejects stale investment snapshot accounts", () => {
  assert.throws(
    () =>
      assertDailyLogReferencesExist(input, {
        accounts: [
          { id: 1, name: "Current", type: "current" },
          { id: 2, name: "Savings", type: "savings" },
          { id: 3, name: "Cash", type: "current" },
          { id: 4, name: "Former ISA", type: "savings" },
        ],
        categories: [{ id: 10, name: "Food" }],
        habits: [
          { id: 20, name: "Run" },
          { id: 21, name: "Read" },
        ],
      }),
    (error) =>
      error instanceof DailyLogReferenceError &&
      error.message ===
        'The account "Former ISA" is no longer an investment account. Please refresh and try again.',
  );
});

test("daily-log FK fallback messages are field specific", () => {
  assert.equal(
    getDailyLogForeignKeyErrorMessage("Transaction_transferAccountId_fkey"),
    "The destination account no longer exists. Please refresh and try again.",
  );
  assert.equal(
    getDailyLogForeignKeyErrorMessage("HabitCompletion_habitId_fkey"),
    "The selected habit no longer exists. Please refresh and try again.",
  );
});
