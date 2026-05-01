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

export type InsightsData = {
  hasData: boolean;
  milestones: InsightMilestone[];
  series: InsightSeriesPoint[];
  allocation: InsightAllocation[];
  stats: {
    wealthCreated: string;
    incomeGrowth: string;
    bestSingleMonth: string;
    averageMonthlyGain: string;
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

const MILESTONE_TARGETS = [
  1_000, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 750_000,
  1_000_000,
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
};

function formatCurrency(amount: number) {
  return currencyFormatter.format(amount);
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
  const [accounts, firstTransaction] = await Promise.all([
    prisma.account.findMany({
      orderBy: { id: "asc" },
      select: { id: true, type: true, balance: true },
    }),
    prisma.transaction.findFirst({
      orderBy: { date: "asc" },
      select: { date: true },
    }),
  ]);
  const typedAccounts: AccountBalance[] = accounts;

  if (typedAccounts.length === 0) {
    return {
      hasData: false,
      milestones: [],
      series: [],
      allocation: [],
      stats: {
        wealthCreated: formatCurrency(0),
        incomeGrowth: `${formatCurrency(0)} to ${formatCurrency(0)}`,
        bestSingleMonth: formatCurrency(0),
        averageMonthlyGain: formatCurrency(0),
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
  const latestCurrent = Math.max(latestPoint.current, 0);
  const latestSavings = Math.max(latestPoint.savings, 0);
  const grossExposure = latestCurrent + latestSavings + latestPoint.creditDebt;
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
    stats: {
      wealthCreated: formatCurrency(latestPoint.netWorth - firstPoint.netWorth),
      incomeGrowth: `${formatCurrency(firstPoint.income)} to ${formatCurrency(
        latestPoint.income,
      )}`,
      bestSingleMonth: formatCurrency(bestSingleMonth),
      averageMonthlyGain: formatCurrency(averageMonthlyGain),
    },
  };
}
