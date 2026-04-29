"use server";

import { Prisma, type AccountType } from "@/app/generated/prisma/client";
import { dailyQuotes } from "@/lib/daily-quotes";
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
  week: DashboardMoneyFlowBar[];
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
  name: string;
  category: string;
  summary: string;
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

export type SidebarUpcomingBill = {
  id: number;
  name: string;
  amount: string;
  dueLabel: string;
};

export type SidebarAccountWarning = {
  accountId: number;
  accountName: string;
  balance: string;
  totalDue: string;
  shortfall: string;
};

export type SidebarSetupChecklist = {
  hasAccounts: boolean;
  hasCategories: boolean;
  hasHabits: boolean;
  hasGoals: boolean;
};

export type SidebarSnapshot = {
  upcomingBills: SidebarUpcomingBill[];
  accountWarnings: SidebarAccountWarning[];
  setup: SidebarSetupChecklist;
  quote: {
    text: string;
    author: string;
  };
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

function formatCurrency(amount: number) {
  return currencyFormatter.format(amount);
}

function formatDetailedCurrency(amount: number) {
  return detailedCurrencyFormatter.format(amount);
}

function getDailyQuote(date: Date) {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const dayIndex = Math.floor(
    (getStartOfDay(date).getTime() - startOfYear.getTime()) / 86_400_000,
  );

  return dailyQuotes[dayIndex % dailyQuotes.length];
}

function getStartOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getStartOfWeek(date: Date) {
  const start = getStartOfDay(date);
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + mondayOffset);

  return start;
}

function getNextWeek(date: Date) {
  const nextWeek = new Date(getStartOfWeek(date));
  nextWeek.setDate(nextWeek.getDate() + 7);

  return nextWeek;
}

function getStartOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getNextMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getBudgetDueDate(today: Date, dueDay: number) {
  const startOfToday = getStartOfDay(today);
  const currentMonthDueDay = Math.min(
    dueDay,
    getDaysInMonth(today.getFullYear(), today.getMonth()),
  );
  const currentMonthDueDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    currentMonthDueDay,
  );

  if (currentMonthDueDate >= startOfToday) {
    return currentMonthDueDate;
  }

  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const nextMonthDueDay = Math.min(
    dueDay,
    getDaysInMonth(nextMonth.getFullYear(), nextMonth.getMonth()),
  );

  return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), nextMonthDueDay);
}

function getDueLabel(today: Date, dueDate: Date) {
  const daysUntil = Math.round(
    (getStartOfDay(dueDate).getTime() - getStartOfDay(today).getTime()) /
      86_400_000,
  );

  if (daysUntil === 0) {
    return "Due today";
  }

  if (daysUntil === 1) {
    return "Due tomorrow";
  }

  if (daysUntil <= 7) {
    return `Due in ${daysUntil} days`;
  }

  return `Due ${activityDateFormatter.format(dueDate)}`;
}

function getGoalProgress(currentAmount: number | null, targetAmount: number | null) {
  if (currentAmount === null || targetAmount === null || targetAmount <= 0) {
    return 0;
  }

  return Math.min(Math.round((currentAmount / targetAmount) * 100), 100);
}

function getHabitProgress(habit: {
  rangeStart: Date;
  rangeEnd: Date;
  isDaily: boolean;
  frequency: number | null;
  completions: { date: Date }[];
}) {
  const target =
    habit.isDaily ? 7 : habit.frequency === null ? 1 : habit.frequency;

  if (target <= 0) {
    return 0;
  }

  const completionCount =
    habit.completions.filter(
      (completion) =>
        completion.date >= habit.rangeStart && completion.date < habit.rangeEnd,
    ).length;

  return Math.min(Math.round((completionCount / target) * 100), 100);
}

function getHabitScheduleLabel(isDaily: boolean, frequency: number | null) {
  if (isDaily) {
    return "Daily habit";
  }

  if (frequency === null) {
    return "Monthly habit";
  }

  return `${frequency} ${frequency === 1 ? "time" : "times"}/week`;
}

function getWeek(today: Date, completions: { date: Date }[]) {
  const weekStart = getStartOfWeek(today);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const daysAgo = Math.floor(
      (getStartOfDay(today).getTime() - getStartOfDay(date).getTime()) /
        86_400_000,
    );

    return {
      label: dayFormatter.format(date),
      completed:
        daysAgo >= 0 &&
        completions.some(
          (completion) =>
            getStartOfDay(completion.date).getTime() === getStartOfDay(date).getTime(),
        ),
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

function getCurrentWeekDays(today: Date) {
  const weekStart = getStartOfWeek(today);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);

    return {
      label: dayFormatter.format(date),
      start: date,
      end: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
    };
  });
}

const ACCOUNT_WARNING_DAYS = 30;
const DASHBOARD_ITEM_LIMIT = 4;

export async function getSidebarSnapshot(): Promise<SidebarSnapshot> {
  const today = new Date();
  const [
    budgetItems,
    accountCount,
    financeCategoryCount,
    habitCategoryCount,
    habitCount,
    goalCount,
  ] = await Promise.all([
    prisma.budgetItem.findMany({
      where: { dueDay: { not: null } },
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        amount: true,
        dueDay: true,
        account: { select: { id: true, name: true, balance: true } },
      },
    }),
    prisma.account.count(),
    prisma.financeCategory.count(),
    prisma.habitCategory.count(),
    prisma.habit.count(),
    prisma.goal.count(),
  ]);

  const scheduledBudgetItems = budgetItems as Array<
    (typeof budgetItems)[number] & { dueDay: number }
  >;

  const upcomingBills = scheduledBudgetItems
    .map((item) => {
      const dueDate = getBudgetDueDate(today, item.dueDay);

      return {
        id: item.id,
        name: item.name,
        amount: formatDetailedCurrency(item.amount.toNumber()),
        dueLabel: getDueLabel(today, dueDate),
        dueTime: dueDate.getTime(),
      };
    })
    .sort((a, b) => a.dueTime - b.dueTime)
    .slice(0, DASHBOARD_ITEM_LIMIT)
    .map((bill) => ({
      id: bill.id,
      name: bill.name,
      amount: bill.amount,
      dueLabel: bill.dueLabel,
    }));

  const warningCutoff = new Date(
    getStartOfDay(today).getTime() + ACCOUNT_WARNING_DAYS * 86_400_000,
  );
  const accountTotals = new Map<
    number,
    { name: string; balance: number; total: number }
  >();
  for (const item of scheduledBudgetItems) {
    const dueDate = getBudgetDueDate(today, item.dueDay);
    if (dueDate > warningCutoff) continue;
    const existing = accountTotals.get(item.account.id);
    if (existing) {
      existing.total += item.amount.toNumber();
    } else {
      accountTotals.set(item.account.id, {
        name: item.account.name,
        balance: item.account.balance.toNumber(),
        total: item.amount.toNumber(),
      });
    }
  }
  const accountWarnings = Array.from(accountTotals.entries())
    .filter(([, data]) => data.balance < data.total)
    .map(([id, data]) => ({
      accountId: id,
      accountName: data.name,
      balance: formatDetailedCurrency(data.balance),
      totalDue: formatDetailedCurrency(data.total),
      shortfall: formatDetailedCurrency(data.total - data.balance),
    }));

  return {
    upcomingBills,
    accountWarnings,
    setup: {
      hasAccounts: accountCount > 0,
      hasCategories: financeCategoryCount > 0 || habitCategoryCount > 0,
      hasHabits: habitCount > 0,
      hasGoals: goalCount > 0,
    },
    quote: getDailyQuote(today),
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  const today = new Date();
  const weekStart = getStartOfWeek(today);
  const nextWeek = getNextWeek(today);
  const monthStart = getStartOfMonth(today);
  const nextMonth = getNextMonth(today);
  const months = getLastTwelveMonths(today);
  const weekDays = getCurrentWeekDays(today);
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
        include: {
          category: true,
          completions: {
            where: {
              date: {
                gte: monthStart,
                lt: nextMonth,
              },
            },
            select: { date: true },
        },
      },
    }),
    prisma.transaction.findMany({
      where: {
        date: {
          gte: months[0].start,
          lt: nextMonth,
        },
      },
      orderBy: { date: "desc" },
      include: { account: true, category: true, transferAccount: true },
    }),
  ]);

  const accountRows = accounts.map((account) => ({
    id: account.id,
    name: account.name,
    type: account.type,
    balance: formatDetailedCurrency(account.balance.toNumber()),
  }));

  const netWorth = accounts.reduce((sum, account) => {
    const balance =
      account.type === "credit" ? account.balance.abs().negated() : account.balance;
    return sum.plus(balance);
  }, new Prisma.Decimal(0));

  const monthTransactions = transactions.filter(
    (transaction) => transaction.date >= monthStart && transaction.date < nextMonth,
  );
  const monthlyIncome = monthTransactions.reduce((sum, transaction) => {
    if (transaction.transferAccountId !== null) {
      return sum;
    }

    return transaction.amount.gt(0) ? sum.plus(transaction.amount) : sum;
  }, new Prisma.Decimal(0));
  const monthlyOutgoing = monthTransactions.reduce((sum, transaction) => {
    if (transaction.transferAccountId !== null) {
      return sum;
    }

    return transaction.amount.lt(0) ? sum.plus(transaction.amount.abs()) : sum;
  }, new Prisma.Decimal(0));
  const cashFlow = monthlyIncome.minus(monthlyOutgoing);

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
  const budgetLeft = totalBudget - monthlyOutgoing.toNumber();

  const goalRows = goals.slice(0, DASHBOARD_ITEM_LIMIT).map((goal) => {
    const currentAmount = goal.currentAmount?.toNumber() ?? null;
    const targetAmount = goal.targetAmount?.toNumber() ?? null;
    const progress = goal.isComplete
      ? 100
      : getGoalProgress(currentAmount, targetAmount);
    const detail =
      goal.isComplete
        ? "Complete"
        : goal.type === "numerical" && currentAmount !== null && targetAmount !== null
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

  const habitRows = habits.slice(0, DASHBOARD_ITEM_LIMIT).map((habit) => ({
    id: habit.id,
    name: habit.name,
    streak: `${habit.streak} ${habit.streak === 1 ? "day" : "days"}`,
    progress: getHabitProgress({
      ...habit,
      rangeStart:
        habit.isDaily || habit.frequency !== null ? weekStart : monthStart,
      rangeEnd: habit.isDaily || habit.frequency !== null ? nextWeek : nextMonth,
    }),
  }));
  const habitScore =
    habits.length > 0
      ? Math.round(
          habits.reduce(
            (sum, habit) =>
              sum +
              getHabitProgress({
                ...habit,
                rangeStart:
                  habit.isDaily || habit.frequency !== null ? weekStart : monthStart,
                rangeEnd:
                  habit.isDaily || habit.frequency !== null ? nextWeek : nextMonth,
              }),
            0,
          ) / habits.length,
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
        if (transaction.transferAccountId !== null) {
          return sum;
        }

        const amount = transaction.amount.toNumber();
        return amount > 0 ? sum + amount : sum;
      }, 0);
      const outgoing = bucketTransactions.reduce((sum, transaction) => {
        if (transaction.transferAccountId !== null) {
          return sum;
        }

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
    week: buildMoneyFlowBars(weekDays),
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
  const habitItems = habits.slice(0, DASHBOARD_ITEM_LIMIT).map((habit) => ({
    id: `habit-${habit.id}`,
    task: habit.name,
    status: getHabitScheduleLabel(habit.isDaily, habit.frequency),
    meta: `${habit.streak} day streak`,
  }));
  const todayItems = [...goalItems, ...budgetItemsDueToday, ...habitItems].slice(
    0,
    DASHBOARD_ITEM_LIMIT,
  );

  const recentTransactions = transactions.slice(0, 6).map((transaction) => {
    const isTransfer = transaction.transferAccountId !== null;
    const amount = formatDetailedCurrency(Math.abs(transaction.amount.toNumber()));

    if (isTransfer) {
      return {
        id: `transaction-${transaction.id}`,
        name:
          transaction.transferAccount
            ? `${transaction.account.name} to ${transaction.transferAccount.name}`
            : transaction.account.name,
        category: "Transfer",
        summary: amount,
      };
    }

    return {
      id: `transaction-${transaction.id}`,
      name: transaction.account.name,
      category: transaction.category?.name ?? "Uncategorised",
      summary: formatDetailedCurrency(transaction.amount.toNumber()),
    };
  });
  const recentHabits = habits.slice(0, 3).map((habit) => ({
    id: `habit-${habit.id}`,
    name: habit.name,
    category: habit.category.name,
    summary: `${habit.streak} day streak`,
  }));
  const recentGoals = goals.slice(0, 3).map((goal) => {
    const currentAmount = goal.currentAmount?.toNumber() ?? null;
    const targetAmount = goal.targetAmount?.toNumber() ?? null;

    return {
      id: `goal-${goal.id}`,
      name: goal.name,
      category: "Goal",
      summary:
        goal.isComplete
          ? "Complete"
          : goal.type === "numerical"
          ? `${getGoalProgress(currentAmount, targetAmount)}%`
          : goal.deadline
            ? `Due ${activityDateFormatter.format(goal.deadline)}`
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
        value: formatCurrency(netWorth.toNumber()),
        detail: `${accounts.length} tracked ${accounts.length === 1 ? "account" : "accounts"}`,
      },
      cashFlow: {
        value: formatCurrency(cashFlow.toNumber()),
        detail: `${formatCurrency(monthlyIncome.toNumber())} in, ${formatCurrency(monthlyOutgoing.toNumber())} out`,
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
    week: getWeek(
      today,
      habits.flatMap((habit) => habit.completions),
    ),
    moneyFlow,
    todayItems,
    recentActivity: [...recentTransactions, ...recentHabits, ...recentGoals].slice(0, 8),
  };
}
