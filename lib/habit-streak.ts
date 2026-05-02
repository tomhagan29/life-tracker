export type HabitStreakSchedule = {
  isDaily: boolean;
  frequency: number | null;
};

export type HabitStreakHabit = HabitStreakSchedule & {
  id: number;
};

export type HabitStreakCompletion = {
  habitId: number;
  date: Date;
};

const MS_PER_DAY = 86_400_000;

function getUtcDayIndex(date: Date) {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) /
      MS_PER_DAY,
  );
}

function getUtcMonthIndex(date: Date) {
  return date.getUTCFullYear() * 12 + date.getUTCMonth();
}

function getUtcWeekIndex(date: Date) {
  const dayIndex = getUtcDayIndex(date);
  const day = new Date(dayIndex * MS_PER_DAY).getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  return Math.floor((dayIndex + mondayOffset) / 7);
}

function countConsecutivePeriods(periods: Set<number>) {
  if (periods.size === 0) {
    return 0;
  }

  let currentPeriod = Math.max(...periods);
  let streak = 0;

  while (periods.has(currentPeriod)) {
    streak += 1;
    currentPeriod -= 1;
  }

  return streak;
}

export function calculateHabitStreak(
  habit: HabitStreakSchedule,
  completions: { date: Date }[],
) {
  if (habit.isDaily) {
    return countConsecutivePeriods(
      new Set(completions.map((completion) => getUtcDayIndex(completion.date))),
    );
  }

  if (habit.frequency === null) {
    return countConsecutivePeriods(
      new Set(completions.map((completion) => getUtcMonthIndex(completion.date))),
    );
  }

  const requiredCompletions = Math.max(1, habit.frequency);
  const weeklyCompletionCounts = completions.reduce((counts, completion) => {
    const week = getUtcWeekIndex(completion.date);
    counts.set(week, (counts.get(week) ?? 0) + 1);
    return counts;
  }, new Map<number, number>());
  const completedWeeks = new Set(
    Array.from(weeklyCompletionCounts.entries())
      .filter(([, completionCount]) => completionCount >= requiredCompletions)
      .map(([week]) => week),
  );

  return countConsecutivePeriods(completedWeeks);
}

export function calculateHabitStreaks(
  habits: HabitStreakHabit[],
  completions: HabitStreakCompletion[],
) {
  const completionsByHabitId = completions.reduce((groups, completion) => {
    const group = groups.get(completion.habitId) ?? [];
    group.push(completion);
    groups.set(completion.habitId, group);
    return groups;
  }, new Map<number, HabitStreakCompletion[]>());

  return new Map(
    habits.map((habit) => [
      habit.id,
      calculateHabitStreak(habit, completionsByHabitId.get(habit.id) ?? []),
    ]),
  );
}

export function formatHabitStreak(habit: HabitStreakSchedule & { streak: number }) {
  const unit = habit.isDaily ? "day" : habit.frequency === null ? "month" : "week";

  return `${habit.streak} ${habit.streak === 1 ? unit : `${unit}s`}`;
}
