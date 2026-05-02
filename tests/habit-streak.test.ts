import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateHabitStreak,
  calculateHabitStreaks,
  formatHabitStreak,
} from "../lib/habit-streak";

function date(value: string) {
  return new Date(`${value}T12:00:00Z`);
}

test("daily streaks are derived from consecutive completion dates", () => {
  const habit = { isDaily: true, frequency: null };

  assert.equal(
    calculateHabitStreak(habit, [
      { date: date("2026-04-10") },
      { date: date("2026-04-30") },
      { date: date("2026-05-01") },
      { date: date("2026-05-02") },
    ]),
    3,
  );

  assert.equal(
    calculateHabitStreak(habit, [
      { date: date("2026-04-30") },
      { date: date("2026-05-02") },
    ]),
    1,
  );
});

test("weekly streaks count consecutive weeks that meet the frequency", () => {
  const habit = { isDaily: false, frequency: 2 };

  assert.equal(
    calculateHabitStreak(habit, [
      { date: date("2026-04-06") },
      { date: date("2026-04-08") },
      { date: date("2026-04-13") },
      { date: date("2026-04-15") },
      { date: date("2026-04-20") },
    ]),
    2,
  );
});

test("monthly streaks count consecutive months with completions", () => {
  const habit = { isDaily: false, frequency: null };

  assert.equal(
    calculateHabitStreak(habit, [
      { date: date("2026-01-01") },
      { date: date("2026-02-14") },
      { date: date("2026-04-01") },
    ]),
    1,
  );
});

test("habit streak maps are grouped by habit id", () => {
  const streaks = calculateHabitStreaks(
    [
      { id: 1, isDaily: true, frequency: null },
      { id: 2, isDaily: false, frequency: null },
    ],
    [
      { habitId: 1, date: date("2026-05-01") },
      { habitId: 1, date: date("2026-05-02") },
      { habitId: 2, date: date("2026-04-01") },
    ],
  );

  assert.equal(streaks.get(1), 2);
  assert.equal(streaks.get(2), 1);
});

test("streak labels use the habit schedule unit", () => {
  assert.equal(formatHabitStreak({ isDaily: true, frequency: null, streak: 2 }), "2 days");
  assert.equal(formatHabitStreak({ isDaily: false, frequency: 3, streak: 1 }), "1 week");
  assert.equal(formatHabitStreak({ isDaily: false, frequency: null, streak: 4 }), "4 months");
});
