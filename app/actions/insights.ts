"use server";

import {
  Prisma,
  type AccountType,
  type TransactionType,
} from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type InsightChartMode = "stacked" | "netWorth" | "cashFlow";

export type InsightSeriesPoint = {
  key: string;
  label: string;
  current: number;
  savings: number;
  creditDebt: number;
  netWorth: number;
  income: number;
  outgoing: number;
  cashFlow: number;
  wealthGain: number;
  savingsRate: number | null;
};

export type InsightMilestone = {
  label: string;
  value: string;
  dateLabel: string;
  detail: string;
  isCurrent: boolean;
  isReached: boolean;
};

export type InsightAllocation = {
  label: string;
  value: string;
  percent: number;
  tone: "emerald" | "sky" | "rose";
};

export type InsightCategoryFlow = {
  label: string;
  value: string;
  percent: number;
};

export type InsightGoalProgress = {
  label: string;
  value: string;
  detail: string;
  percent: number;
};

export type InsightDataGap = {
  label: string;
  detail: string;
};

export type InsightsData = {
  hasData: boolean;
  milestones: InsightMilestone[];
  series: InsightSeriesPoint[];
  allocation: InsightAllocation[];
  categoryFlow: InsightCategoryFlow[];
  goals: InsightGoalProgress[];
  dataGaps: InsightDataGap[];
  stats: {
    wealthCreated: string;
    incomeGrowth: string;
    bestSingleMonth: string;
    averageMonthlyGain: string;
    latestSavingsRate: string;
    averageSavingsRate: string;
    emergencyCoverage: string;
    burnRate: string;
    totalDebt: string;
    debtBurden: string;
    debtPayments: string;
  };
};

const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

const monthYearFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "numeric",
});

const monthFormatter = new Intl.DateTimeFormat("en-GB", { month: "short" });

const shortDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
});

const MILESTONE_TARGETS = [
  1_000, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 750_000,
  1_000_000,
];

const ESSENTIAL_KEYWORDS = [
  "rent",
  "mortgage",
  "housing",
  "utility",
  "utilities",
  "council",
  "electric",
  "energy",
  "gas",
  "water",
  "insurance",
  "grocery",
  "groceries",
  "food",
  "transport",
  "commute",
  "train",
  "fuel",
  "petrol",
  "diesel",
  "health",
  "medical",
  "childcare",
  "debt",
  "loan",
  "credit",
  "minimum",
];

const DEBT_KEYWORDS = [
  "debt",
  "loan",
  "credit",
  "card",
  "minimum",
  "repayment",
  "finance",
];

type AccountBalance = {
  id: number;
  type: AccountType;
  balance: Prisma.Decimal;
};

type InsightTransaction = {
  date: Date;
  type: TransactionType;
  amount: Prisma.Decimal;
  accountId: number;
  transferAccountId: number | null;
  category: { name: string } | null;
};

function formatCurrency(amount: number) {
  return currencyFormatter.format(amount);
}

function formatPercent(amount: number) {
  return `${Math.round(amount)}%`;
}

function getStartOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getNextMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

function getMonthBuckets(startDate: Date, today: Date) {
  const monthCount = getMonthsBetween(startDate, today) + 1;

  return Array.from({ length: monthCount }, (_, index) => {
    const start = new Date(
      startDate.getFullYear(),
      startDate.getMonth() + index,
      1,
    );

    return {
      key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(
        2,
        "0",
      )}`,
      label: monthFormatter.format(start),
      dateLabel: monthYearFormatter.format(start),
      start,
      end: getNextMonth(start),
    };
  });
}

function getRawBalancesAt(
  accounts: AccountBalance[],
  transactions: InsightTransaction[],
  cutoff: Date,
) {
  const balances = new Map(
    accounts.map((account) => [account.id, account.balance.toNumber()]),
  );

  for (const transaction of transactions) {
    if (transaction.date < cutoff) {
      continue;
    }

    const amount = transaction.amount.toNumber();
    const sourceBalance = balances.get(transaction.accountId) ?? 0;

    if (transaction.type === "transfer" && transaction.transferAccountId !== null) {
      balances.set(transaction.accountId, sourceBalance + amount);
      balances.set(
        transaction.transferAccountId,
        (balances.get(transaction.transferAccountId) ?? 0) - amount,
      );
      continue;
    }

    balances.set(transaction.accountId, sourceBalance - amount);
  }

  return balances;
}

function getBalanceBreakdown(
  accounts: AccountBalance[],
  rawBalances: Map<number, number>,
) {
  return accounts.reduce(
    (breakdown, account) => {
      const rawBalance = rawBalances.get(account.id) ?? 0;

      if (account.type === "credit") {
        breakdown.creditDebt += Math.abs(rawBalance);
        breakdown.netWorth -= Math.abs(rawBalance);
        return breakdown;
      }

      if (account.type === "savings") {
        breakdown.savings += rawBalance;
      } else {
        breakdown.current += rawBalance;
      }

      breakdown.netWorth += rawBalance;
      return breakdown;
    },
    { current: 0, savings: 0, creditDebt: 0, netWorth: 0 },
  );
}

function getMonthsBetween(firstDate: Date, lastDate: Date) {
  return Math.max(
    0,
    (lastDate.getFullYear() - firstDate.getFullYear()) * 12 +
      lastDate.getMonth() -
      firstDate.getMonth(),
  );
}

function matchesKeywords(values: string[], keywords: string[]) {
  const searchable = values.join(" ").toLowerCase();

  return keywords.some((keyword) => searchable.includes(keyword));
}

function getGoalProgress(currentAmount: number | null, targetAmount: number | null) {
  if (currentAmount === null || targetAmount === null || targetAmount <= 0) {
    return 0;
  }

  return Math.min(Math.round((currentAmount / targetAmount) * 100), 100);
}

function getAverageDefined(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildMilestones(
  series: InsightSeriesPoint[],
  buckets: ReturnType<typeof getMonthBuckets>,
) {
  const firstPoint = series[0];
  const latestPoint = series[series.length - 1];
  const firstBucket = buckets[0];
  const latestBucket = buckets[buckets.length - 1];
  const journeyTargets = MILESTONE_TARGETS.filter(
    (target) => target > firstPoint.netWorth,
  );
  const fallbackTargets =
    journeyTargets.length > 0
      ? journeyTargets
      : MILESTONE_TARGETS.slice(Math.max(MILESTONE_TARGETS.length - 3, 0));
  const firstUnreachedIndex = fallbackTargets.findIndex(
    (target) => latestPoint.netWorth < target,
  );
  const visibleTargetStart =
    firstUnreachedIndex === -1
      ? Math.max(fallbackTargets.length - 3, 0)
      : firstUnreachedIndex === 0
        ? 0
        : Math.min(firstUnreachedIndex - 1, Math.max(fallbackTargets.length - 3, 0));
  const visibleTargets = fallbackTargets
    .slice(visibleTargetStart, visibleTargetStart + 3)
    .map((target, index) => ({
      target,
      milestoneNumber: visibleTargetStart + index + 1,
    }));

  let hasNextMilestone = false;
  const targetMilestones = visibleTargets.map(({ target, milestoneNumber }) => {
    const reachedIndex = series.findIndex((point) => point.netWorth >= target);
    const reached = reachedIndex >= 0;
    const reachedBucket = reached ? buckets[reachedIndex] : null;
    const isNext = !reached && !hasNextMilestone;

    if (isNext) {
      hasNextMilestone = true;
    }

    return {
      label: `Milestone ${milestoneNumber}`,
      value: formatCurrency(target),
      dateLabel: reached ? reachedBucket?.dateLabel ?? "" : isNext ? "Next" : "Upcoming",
      detail: reached ? "Milestone reached" : isNext ? "In progress" : "",
      isCurrent: false,
      isReached: reached,
    };
  });

  const nextVisibleTargetIndex = visibleTargets.findIndex(
    ({ target }) => latestPoint.netWorth < target,
  );
  const nowMilestone = {
    label: "Now",
    value: formatCurrency(latestPoint.netWorth),
    dateLabel: latestBucket.dateLabel,
    detail: `${getMonthsBetween(firstBucket.start, latestBucket.start)} months tracked`,
    isCurrent: true,
    isReached: true,
  };
  const startingMilestone = {
    label: "Starting point",
    value: formatCurrency(firstPoint.netWorth),
    dateLabel: firstBucket.dateLabel,
    detail: "First chart month",
    isCurrent: false,
    isReached: true,
  };

  if (nextVisibleTargetIndex === -1) {
    return [startingMilestone, ...targetMilestones, nowMilestone];
  }

  return [
    startingMilestone,
    ...targetMilestones.slice(0, nextVisibleTargetIndex),
    nowMilestone,
    ...targetMilestones.slice(nextVisibleTargetIndex),
  ];
}

export async function getInsightsData(): Promise<InsightsData> {
  const today = new Date();
  const currentMonthStart = getStartOfMonth(today);
  const [accounts, firstTransaction, budgetItems, goals] = await Promise.all([
    prisma.account.findMany({
      orderBy: { id: "asc" },
      select: { id: true, type: true, balance: true },
    }),
    prisma.transaction.findFirst({
      orderBy: { date: "asc" },
      select: { date: true },
    }),
    prisma.budgetItem.findMany({
      orderBy: { id: "asc" },
      select: {
        name: true,
        amount: true,
        category: { select: { name: true } },
        account: { select: { type: true } },
      },
    }),
    prisma.goal.findMany({
      orderBy: { id: "asc" },
      select: {
        name: true,
        type: true,
        targetAmount: true,
        currentAmount: true,
        isComplete: true,
        deadline: true,
        milestones: {
          select: { isComplete: true },
        },
      },
    }),
  ]);
  const typedAccounts: AccountBalance[] = accounts;

  if (typedAccounts.length === 0) {
    return {
      hasData: false,
      milestones: [],
      series: [],
      allocation: [],
      categoryFlow: [],
      goals: [],
      dataGaps: [
        {
          label: "Investment contributions vs market growth",
          detail: "Add investment account types or contribution tracking to split deposits from returns.",
        },
        {
          label: "Inflation-adjusted growth",
          detail: "Add an inflation data source or manual inflation rate to calculate real growth.",
        },
      ],
      stats: {
        wealthCreated: formatCurrency(0),
        incomeGrowth: `${formatCurrency(0)} to ${formatCurrency(0)}`,
        bestSingleMonth: formatCurrency(0),
        averageMonthlyGain: formatCurrency(0),
        latestSavingsRate: "No income yet",
        averageSavingsRate: "No income yet",
        emergencyCoverage: "No expenses yet",
        burnRate: formatCurrency(0),
        totalDebt: formatCurrency(0),
        debtBurden: "No debt",
        debtPayments: formatCurrency(0),
      },
    };
  }

  const firstActivityMonth = firstTransaction
    ? getStartOfMonth(firstTransaction.date)
    : currentMonthStart;
  const rangeStart =
    firstActivityMonth > currentMonthStart
      ? currentMonthStart
      : firstActivityMonth;
  const buckets = getMonthBuckets(rangeStart, today);
  const transactions = await prisma.transaction.findMany({
    where: {
      date: {
        gte: rangeStart,
      },
    },
    orderBy: { date: "asc" },
    select: {
      date: true,
      amount: true,
      type: true,
      accountId: true,
      transferAccountId: true,
      category: { select: { name: true } },
    },
  });
  const typedTransactions: InsightTransaction[] = transactions;

  const series: InsightSeriesPoint[] = [];

  buckets.forEach((bucket, index) => {
    const balances = getRawBalancesAt(
      typedAccounts,
      typedTransactions,
      bucket.end,
    );
    const breakdown = getBalanceBreakdown(typedAccounts, balances);
    const bucketTransactions = typedTransactions.filter(
      (transaction) =>
        transaction.date >= bucket.start && transaction.date < bucket.end,
    );
    const income = bucketTransactions.reduce((sum, transaction) => {
      if (transaction.type !== "income") {
        return sum;
      }

      return sum + transaction.amount.toNumber();
    }, 0);
    const outgoing = bucketTransactions.reduce((sum, transaction) => {
      if (transaction.type !== "outgoing") {
        return sum;
      }

      return sum + Math.abs(transaction.amount.toNumber());
    }, 0);
    const previousNetWorth =
      index > 0 ? series[index - 1].netWorth : breakdown.netWorth;

    series.push({
      key: bucket.key,
      label: bucket.label,
      current: breakdown.current,
      savings: breakdown.savings,
      creditDebt: breakdown.creditDebt,
      netWorth: breakdown.netWorth,
      income,
      outgoing,
      cashFlow: income - outgoing,
      wealthGain: index === 0 ? 0 : breakdown.netWorth - previousNetWorth,
      savingsRate: income > 0 ? ((income - outgoing) / income) * 100 : null,
    });
  });

  const latestPoint = series[series.length - 1];
  const firstPoint = series[0];
  const monthlyGains = series.slice(1).map((point) => point.wealthGain);
  const averageMonthlyGain =
    monthlyGains.length > 0
      ? monthlyGains.reduce((sum, gain) => sum + gain, 0) / monthlyGains.length
      : 0;
  const bestSingleMonth =
    monthlyGains.length > 0 ? Math.max(...monthlyGains) : 0;
  const savingsRates = series.flatMap((point) =>
    point.savingsRate === null ? [] : [point.savingsRate],
  );
  const averageSavingsRate = getAverageDefined(savingsRates);
  const latestCurrent = Math.max(latestPoint.current, 0);
  const latestSavings = Math.max(latestPoint.savings, 0);
  const grossExposure = latestCurrent + latestSavings + latestPoint.creditDebt;
  const liquidCash = latestCurrent + latestSavings;
  const budgetTotal = budgetItems.reduce(
    (sum, item) => sum + item.amount.toNumber(),
    0,
  );
  const essentialBudgetTotal = budgetItems.reduce((sum, item) => {
    const isEssential = matchesKeywords(
      [item.name, item.category.name],
      ESSENTIAL_KEYWORDS,
    );

    return isEssential ? sum + item.amount.toNumber() : sum;
  }, 0);
  const essentialMonthlyCost =
    essentialBudgetTotal > 0 ? essentialBudgetTotal : budgetTotal;
  const emergencyCoverage =
    essentialMonthlyCost > 0 ? liquidCash / essentialMonthlyCost : null;
  const recentIncomeAverage =
    getAverageDefined(
      series.slice(-3).flatMap((point) => (point.income > 0 ? [point.income] : [])),
    ) ?? latestPoint.income;
  const debtToIncome =
    latestPoint.creditDebt > 0 && recentIncomeAverage > 0
      ? (latestPoint.creditDebt / recentIncomeAverage) * 100
      : null;
  const debtPayments = budgetItems.reduce((sum, item) => {
    const isDebtPayment =
      item.account.type === "credit" ||
      matchesKeywords([item.name, item.category.name], DEBT_KEYWORDS);

    return isDebtPayment ? sum + item.amount.toNumber() : sum;
  }, 0);
  const latestBucket = buckets[buckets.length - 1];
  const latestOutgoingTransactions = typedTransactions.filter(
    (transaction) =>
      transaction.type === "outgoing" &&
      transaction.date >= latestBucket.start &&
      transaction.date < latestBucket.end,
  );
  const latestOutgoingByCategory = latestOutgoingTransactions.reduce(
    (groups, transaction) => {
      const label = transaction.category?.name ?? "Uncategorised";
      const current = groups.get(label) ?? 0;
      groups.set(label, current + Math.abs(transaction.amount.toNumber()));
      return groups;
    },
    new Map<string, number>(),
  );
  const latestOutgoingTotal = Array.from(latestOutgoingByCategory.values()).reduce(
    (sum, value) => sum + value,
    0,
  );
  const categoryFlow = Array.from(latestOutgoingByCategory.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({
      label,
      value: formatCurrency(value),
      percent:
        latestOutgoingTotal > 0
          ? Math.max(Math.round((value / latestOutgoingTotal) * 100), 1)
          : 0,
    }));
  const goalProgress = goals
    .map((goal) => {
      if (goal.type === "numerical") {
        const currentAmount = goal.currentAmount?.toNumber() ?? null;
        const targetAmount = goal.targetAmount?.toNumber() ?? null;
        const percent = goal.isComplete
          ? 100
          : getGoalProgress(currentAmount, targetAmount);

        return {
          label: goal.name,
          value: `${percent}% funded`,
          detail:
            currentAmount !== null && targetAmount !== null
              ? `${formatCurrency(currentAmount)} of ${formatCurrency(targetAmount)}`
              : goal.deadline
                ? `Due ${shortDateFormatter.format(goal.deadline)}`
                : "No target amount",
          percent,
        };
      }

      const milestoneCount = goal.milestones.length;
      const completeCount = goal.milestones.filter(
        (milestone) => milestone.isComplete,
      ).length;
      const percent =
        goal.isComplete || milestoneCount === 0
          ? goal.isComplete
            ? 100
            : 0
          : Math.round((completeCount / milestoneCount) * 100);

      return {
        label: goal.name,
        value: goal.isComplete ? "Complete" : `${percent}% complete`,
        detail:
          milestoneCount > 0
            ? `${completeCount} of ${milestoneCount} milestones`
            : goal.deadline
              ? `Due ${shortDateFormatter.format(goal.deadline)}`
              : "Milestone goal",
        percent,
      };
    })
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 4);
  const allocation: InsightAllocation[] = [
    {
      label: "Current accounts",
      value: formatCurrency(latestPoint.current),
      percent:
        grossExposure > 0
          ? Math.round((latestCurrent / grossExposure) * 100)
          : 0,
      tone: "emerald",
    },
    {
      label: "Savings",
      value: formatCurrency(latestPoint.savings),
      percent:
        grossExposure > 0
          ? Math.round((latestSavings / grossExposure) * 100)
          : 0,
      tone: "sky",
    },
    {
      label: "Credit debt",
      value: formatCurrency(latestPoint.creditDebt),
      percent:
        grossExposure > 0
          ? Math.round((latestPoint.creditDebt / grossExposure) * 100)
          : 0,
      tone: "rose",
    },
  ];

  return {
    hasData: true,
    milestones: buildMilestones(series, buckets),
    series,
    allocation,
    categoryFlow,
    goals: goalProgress,
    dataGaps: [
      {
        label: "Investment contributions vs market growth",
        detail: "The tracked account model has cash, savings, and credit only, so returns cannot be separated from contributions yet.",
      },
      {
        label: "Inflation-adjusted growth",
        detail: "Nominal tracked account growth is shown above. Real growth needs an inflation rate or CPI feed to adjust this trend.",
      },
      {
        label: "Debt interest rates",
        detail: "Total debt and budgeted payments are shown, but interest-rate tracking needs a field on debt accounts.",
      },
    ],
    stats: {
      wealthCreated: formatCurrency(latestPoint.netWorth - firstPoint.netWorth),
      incomeGrowth: `${formatCurrency(firstPoint.income)} to ${formatCurrency(
        latestPoint.income,
      )}`,
      bestSingleMonth: formatCurrency(bestSingleMonth),
      averageMonthlyGain: formatCurrency(averageMonthlyGain),
      latestSavingsRate:
        latestPoint.savingsRate === null
          ? "No income yet"
          : formatPercent(latestPoint.savingsRate),
      averageSavingsRate:
        averageSavingsRate === null
          ? "No income yet"
          : formatPercent(averageSavingsRate),
      emergencyCoverage:
        emergencyCoverage === null
          ? "No expenses yet"
          : `${emergencyCoverage.toFixed(1)} months`,
      burnRate: formatCurrency(essentialMonthlyCost),
      totalDebt: formatCurrency(latestPoint.creditDebt),
      debtBurden:
        latestPoint.creditDebt <= 0
          ? "No debt"
          : debtToIncome === null
            ? formatCurrency(latestPoint.creditDebt)
            : `${formatPercent(debtToIncome)} of income`,
      debtPayments: formatCurrency(debtPayments),
    },
  };
}
