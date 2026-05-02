import assert from "node:assert/strict";
import test from "node:test";
import { buildRecentActivity } from "../lib/dashboard-activity";

function date(value: string) {
  return new Date(`${value}T12:00:00Z`);
}

const formatAmount = (amount: number) =>
  amount < 0 ? `-£${Math.abs(amount).toFixed(2)}` : `£${amount.toFixed(2)}`;
const formatDate = (value: Date) => value.toISOString().slice(5, 10);

test("recent activity labels transfers with explicit direction context", () => {
  const rows = buildRecentActivity({
    transactions: [
      {
        id: 1,
        date: date("2026-05-02"),
        type: "transfer",
        amount: -35,
        accountName: "Current",
        categoryName: null,
        transferAccountName: "Savings",
      },
    ],
    habits: [],
    formatAmount,
    formatDate,
    limit: 8,
  });

  assert.deepEqual(rows, [
    {
      id: "transaction-1",
      name: "Current -> Savings",
      category: "Transfer out",
      summary: "£35.00",
    },
  ]);
});

test("recent activity sorts transactions and actual habit completions by date", () => {
  const rows = buildRecentActivity({
    transactions: [
      {
        id: 1,
        date: date("2026-05-01"),
        type: "outgoing",
        amount: -12.5,
        accountName: "Current",
        categoryName: "Food",
        transferAccountName: null,
      },
    ],
    habits: [
      {
        id: 2,
        name: "Run",
        categoryName: "Health",
        completions: [{ date: date("2026-05-02") }],
      },
      {
        id: 3,
        name: "Read",
        categoryName: "Personal",
        completions: [],
      },
    ],
    formatAmount,
    formatDate,
    limit: 8,
  });

  assert.deepEqual(rows, [
    {
      id: "habit-2",
      name: "Run",
      category: "Health",
      summary: "Completed 05-02",
    },
    {
      id: "transaction-1",
      name: "Current",
      category: "Food",
      summary: "-£12.50",
    },
  ]);
});
