"use server";

import type { AccountType } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type DashboardAccount = {
  id: number;
  name: string;
  type: AccountType;
  balance: string;
};

export type DashboardBudget = {
  label: string;
  total: string;
  percent: number;
};

export type DashboardGoal = {
  id: number;
  title: string;
  detail: string;
  progress: number;
};

export type DashboardHabit = {
  id: number;
  name: string;
  streak: string;
  progress: number;
};

export type DashboardWeekDay = {
  label: string;
  completed: boolean;
  isToday: boolean;
};

export type DashboardMoneyFlowBar = {
  label: string;
  incomePercent: number;
  outgoingPercent: number;
};

export type DashboardMoneyFlow = {
  month: DashboardMoneyFlowBar[];
  year: DashboardMoneyFlowBar[];
};

export type DashboardTodayItem = {
  id: string;
  task: string;
  status: string;
  meta: string;
};

export type DashboardActivityRow = {
  id: string;
  entry: string;
  category: string;
  date: string;
  amount: string;
};

export type DashboardData = {
  stats: {
    netWorth: { value: string; detail: string };
    cashFlow: { value: string; detail: string };
    budgetLeft: { value: string; detail: string };
    habitScore: { value: string; detail: string };
  };
  accounts: DashboardAccount[];
  budgets: DashboardBudget[];
  goals: DashboardGoal[];
  habits: DashboardHabit[];
  week: DashboardWeekDay[];
  moneyFlow: DashboardMoneyFlow;
  todayItems: DashboardTodayItem[];
  recentActivity: DashboardActivityRow[];
};

export type SidebarSnapshot = {
  title: string;
  text: string;
};

const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

const detailedCurrencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dayFormatter = new Intl.DateTimeFormat("en-GB", { weekday: "narrow" });
const monthFormatter = new Intl.DateTimeFormat("en-GB", { month: "short" });
const activityDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
});
const snapshotMonthFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "long",
});

function formatCurrency(amount: number) {
  return currencyFormatter.format(amount);
}

function formatDetailedCurrency(amount: number) {
  return detailedCurrencyFormatter.format(amount);
}

function getStartOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getStartOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getNextMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

function getGoalProgress(currentAmount: number | null, targetAmount: number | null) {
  if (currentAmount === null || targetAmount === null || targetAmount <= 0) {
    return 0;
  }

  return Math.min(Math.round((currentAmount / targetAmount) * 100), 100);
}

function getHabitProgress(habit: {
  isDaily: boolean;
  streak: number;
  frequency: number | null;
}) {
  if (habit.isDaily) {
    return Math.min(Math.round((habit.streak / 7) * 100), 100);
  }

  return Math.min(Math.round(((habit.frequency ?? 0) / 7) * 100), 100);
}

function getWeek(today: Date, habits: { streak: number }[]) {
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + mondayOffset + index);
    const daysAgo = Math.floor(
      (getStartOfDay(today).getTime() - getStartOfDay(date).getTime()) /
        86_400_000,
    );

    return {
      label: dayFormatter.format(date),
      completed: daysAgo >= 0 && habits.some((habit) => habit.streak > daysAgo),
      isToday: daysAgo === 0,
    };
  });
}

function getLastTwelveMonths(today: Date) {
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - 11 + index, 1);

    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: monthFormatter.format(date),
      start: date,
      end: getNextMonth(date),
    };
  });
}

function getCurrentMonthDays(today: Date) {
  const daysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0,
  ).getDate();

  return Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth(), index + 1);

    return {
      label: String(index + 1),
      start: date,
      end: new Date(today.getFullYear(), today.getMonth(), index + 2),
    };
  });
}

export async function getSidebarSnapshot(): Promise<SidebarSnapshot> {
  const today = new Date();
  const monthStart = getStartOfMonth(today);
  const nextMonth = getNextMonth(today);

  const [budgetItems, transactions, habits] = await Promise.all([
    prisma.budgetItem.findMany({
      select: { amount: true },
    }),
    prisma.transaction.findMany({
      where: {
        date: {
          gte: monthStart,
          lt: nextMonth,
        },
        amount: {
          lt: 0,
        },
      },
      select: { amount: true },
    }),
    prisma.habit.findMany({
      select: {
        streak: true,
        isDaily: true,
        frequency: true,
      },
    }),
  ]);

  const totalBudget = budgetItems.reduce(
    (sum, item) => sum + item.amount.toNumber(),
    0,
  );
  const outgoing = transactions.reduce(
    (sum, transaction) => sum + Math.abs(transaction.amount.toNumber()),
    0,
  );
  const budgetBalance = totalBudget - outgoing;
  const habitsOnPace = habits.filter((habit) => getHabitProgress(habit) > 0).length;

  const budgetText =
    totalBudget > 0
      ? `You are ${formatCurrency(Math.abs(budgetBalance))} ${
          budgetBalance >= 0 ? "under" : "over"
        } budget`
      : "No monthly budget set";
  const habitText =
    habits.length > 0
      ? `${habitsOnPace} of ${habits.length} ${
          habits.length === 1 ? "habit is" : "habits are"
        } on pace`
      : "no habits tracked yet";

  return {
    title: `${snapshotMonthFormatter.format(today)} snapshot`,
    text: `${budgetText}, with ${habitText}.`,
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  const today = new Date();
  const monthStart = getStartOfMonth(today);
  const nextMonth = getNextMonth(today);
  const months = getLastTwelveMonths(today);
  const monthDays = getCurrentMonthDays(today);

  const [accounts, budgetItems, goals, habits, transactions] = await Promise.all([
    prisma.account.findMany({ orderBy: { id: "asc" } }),
    prisma.budgetItem.findMany({
      orderBy: { id: "asc" },
      include: { category: true, account: true },
    }),
    prisma.goal.findMany({ orderBy: { id: "asc" } }),
    prisma.habit.findMany({
      orderBy: [{ streak: "desc" }, { id: "asc" }],
      include: { category: true },
    }),
    prisma.transaction.findMany({
      where: {
        date: {
          gte: months[0].start,
          lt: nextMonth,
        },
      },
      orderBy: { date: "desc" },
      include: { account: true, category: true },
    }),
  ]);

  const accountRows = accounts.map((account) => ({
    id: account.id,
    name: account.name,
    type: account.type,
    balance: formatDetailedCurrency(account.balance.toNumber()),
  }));

  const netWorth = accounts.reduce((sum, account) => {
    const balance = account.balance.toNumber();
    return sum + (account.type === "credit" ? -Math.abs(balance) : balance);
  }, 0);

  const monthTransactions = transactions.filter(
    (transaction) => transaction.date >= monthStart && transaction.date < nextMonth,
  );
  const monthlyIncome = monthTransactions.reduce((sum, transaction) => {
    const amount = transaction.amount.toNumber();
    return amount > 0 ? sum + amount : sum;
  }, 0);
  const monthlyOutgoing = monthTransactions.reduce((sum, transaction) => {
    const amount = transaction.amount.toNumber();
    return amount < 0 ? sum + Math.abs(amount) : sum;
  }, 0);
  const cashFlow = monthlyIncome - monthlyOutgoing;

  const categoryBudgets = Array.from(
    budgetItems
      .reduce((groups, item) => {
        const current = groups.get(item.category.name) ?? 0;
        groups.set(item.category.name, current + item.amount.toNumber());
        return groups;
      }, new Map<string, number>())
      .entries(),
  );
  const totalBudget = categoryBudgets.reduce((sum, [, total]) => sum + total, 0);
  const budgetRows = categoryBudgets.map(([label, total]) => ({
    label,
    total: formatCurrency(total),
    percent: totalBudget > 0 ? Math.round((total / totalBudget) * 100) : 0,
  }));
  const budgetLeft = totalBudget - monthlyOutgoing;

  const goalRows = goals.slice(0, 4).map((goal) => {
    const currentAmount = goal.currentAmount?.toNumber() ?? null;
    const targetAmount = goal.targetAmount?.toNumber() ?? null;
    const progress = getGoalProgress(currentAmount, targetAmount);
    const detail =
      goal.type === "numerical" && currentAmount !== null && targetAmount !== null
        ? `${formatCurrency(currentAmount)} of ${formatCurrency(targetAmount)}`
        : goal.deadline
          ? `Due ${activityDateFormatter.format(goal.deadline)}`
          : "Milestone";

    return {
      id: goal.id,
      title: goal.name,
      detail,
      progress,
    };
  });

  const habitRows = habits.slice(0, 4).map((habit) => ({
    id: habit.id,
    name: habit.name,
    streak: `${habit.streak} ${habit.streak === 1 ? "day" : "days"}`,
    progress: getHabitProgress(habit),
  }));
  const habitScore =
    habits.length > 0
      ? Math.round(
          habits.reduce((sum, habit) => sum + getHabitProgress(habit), 0) /
            habits.length,
        )
      : 0;

  function buildMoneyFlowBars(
    buckets: { label: string; start: Date; end: Date }[],
  ) {
    const flowBuckets = buckets.map((bucket) => {
      const bucketTransactions = transactions.filter(
        (transaction) =>
          transaction.date >= bucket.start && transaction.date < bucket.end,
      );
      const income = bucketTransactions.reduce((sum, transaction) => {
        const amount = transaction.amount.toNumber();
        return amount > 0 ? sum + amount : sum;
      }, 0);
      const outgoing = bucketTransactions.reduce((sum, transaction) => {
        const amount = transaction.amount.toNumber();
        return amount < 0 ? sum + Math.abs(amount) : sum;
      }, 0);

      return {
        label: bucket.label,
        income,
        outgoing,
      };
    });
    const maxFlow = Math.max(
      ...flowBuckets.map((bucket) => Math.max(bucket.income, bucket.outgoing)),
      0,
    );

    return flowBuckets.map((bucket) => ({
      label: bucket.label,
      incomePercent:
        maxFlow > 0
          ? Math.max(Math.round((bucket.income / maxFlow) * 100), 4)
          : 0,
      outgoingPercent:
        maxFlow > 0
          ? Math.max(Math.round((bucket.outgoing / maxFlow) * 100), 4)
          : 0,
    }));
  }
  const moneyFlow: DashboardMoneyFlow = {
    month: buildMoneyFlowBars(monthDays),
    year: buildMoneyFlowBars(months),
  };

  const todaysDueDay = today.getDate();
  const goalItems = goals
    .filter((goal) => {
      if (!goal.deadline) {
        return false;
      }

      return getStartOfDay(goal.deadline).getTime() === getStartOfDay(today).getTime();
    })
    .map((goal) => ({
      id: `goal-${goal.id}`,
      task: goal.name,
      status: "Deadline today",
      meta: "Goal",
    }));
  const budgetItemsDueToday = budgetItems
    .filter((item) => item.dueDay === todaysDueDay)
    .map((item) => ({
      id: `budget-${item.id}`,
      task: item.name,
      status: "Due today",
      meta: formatDetailedCurrency(item.amount.toNumber()),
    }));
  const habitItems = habits.slice(0, 4).map((habit) => ({
    id: `habit-${habit.id}`,
    task: habit.name,
    status: habit.isDaily ? "Daily habit" : `${habit.frequency ?? 0}/week habit`,
    meta: `${habit.streak} day streak`,
  }));
  const todayItems = [...goalItems, ...budgetItemsDueToday, ...habitItems].slice(0, 4);

  const recentTransactions = transactions.slice(0, 6).map((transaction) => ({
    id: `transaction-${transaction.id}`,
    entry: transaction.category.name,
    category: transaction.account.name,
    date: activityDateFormatter.format(transaction.date),
    amount: formatDetailedCurrency(transaction.amount.toNumber()),
  }));
  const recentHabits = habits.slice(0, 3).map((habit) => ({
    id: `habit-${habit.id}`,
    entry: habit.name,
    category: habit.category.name,
    date: "Tracked",
    amount: `${habit.streak} day streak`,
  }));
  const recentGoals = goals.slice(0, 3).map((goal) => {
    const currentAmount = goal.currentAmount?.toNumber() ?? null;
    const targetAmount = goal.targetAmount?.toNumber() ?? null;

    return {
      id: `goal-${goal.id}`,
      entry: goal.name,
      category: "Goal",
      date: goal.deadline ? activityDateFormatter.format(goal.deadline) : "No deadline",
      amount:
        goal.type === "numerical"
          ? `${getGoalProgress(currentAmount, targetAmount)}%`
          : "Milestone",
    };
  });

  const daysRemaining =
    new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() -
    today.getDate() +
    1;

  return {
    stats: {
      netWorth: {
        value: formatCurrency(netWorth),
        detail: `${accounts.length} tracked ${accounts.length === 1 ? "account" : "accounts"}`,
      },
      cashFlow: {
        value: formatCurrency(cashFlow),
        detail: `${formatCurrency(monthlyIncome)} in, ${formatCurrency(monthlyOutgoing)} out`,
      },
      budgetLeft: {
        value: formatCurrency(budgetLeft),
        detail: `${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} remaining`,
      },
      habitScore: {
        value: `${habitScore}%`,
        detail: `${habits.length} tracked ${habits.length === 1 ? "habit" : "habits"}`,
      },
    },
    accounts: accountRows,
    budgets: budgetRows,
    goals: goalRows,
    habits: habitRows,
    week: getWeek(today, habits),
    moneyFlow,
    todayItems,
    recentActivity: [...recentTransactions, ...recentHabits, ...recentGoals].slice(0, 8),
  };
}
