"use server";

import {
  Prisma,
  type AccountType,
  type TransactionType,
} from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { utcShortDateFormatter } from "@/lib/utc-date";

export type InsightChartMode = "stacked" | "netWorth" | "cashFlow";

export type InsightSeriesPoint = {
  key: string;
  label: string;
  current: number;
  savings: number;
  investment: number;
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
  tone: "emerald" | "sky" | "violet" | "rose";
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

export type InsightLongTermSignal = {
  label: string;
  value: string;
  detail: string;
  info: string;
};

export type InsightsData = {
  hasData: boolean;
  milestones: InsightMilestone[];
  series: InsightSeriesPoint[];
  allocation: InsightAllocation[];
  categoryFlow: InsightCategoryFlow[];
  goals: InsightGoalProgress[];
  longTermSignals: InsightLongTermSignal[];
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

const ASSUMED_ANNUAL_INFLATION_RATE = 0.03;

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

type InsightInvestmentSnapshot = {
  accountId: number;
  date: Date;
  value: Prisma.Decimal;
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
  investmentSnapshots: InsightInvestmentSnapshot[],
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

  const investmentAccounts = accounts.filter(
    (account) => account.type === "investment",
  );
  for (const account of investmentAccounts) {
    const latestSnapshot = investmentSnapshots
      .filter(
        (snapshot) => snapshot.accountId === account.id && snapshot.date < cutoff,
      )
      .sort((a, b) => b.date.getTime() - a.date.getTime())[0];

    if (!latestSnapshot) {
      continue;
    }

    let balance = latestSnapshot.value.toNumber();
    for (const transaction of transactions) {
      if (transaction.date < latestSnapshot.date || transaction.date >= cutoff) {
        continue;
      }

      const amount = Math.abs(transaction.amount.toNumber());

      if (transaction.type === "transfer") {
        if (transaction.transferAccountId === account.id) {
          balance += amount;
        } else if (transaction.accountId === account.id) {
          balance -= amount;
        }
        continue;
      }

      if (transaction.accountId === account.id) {
        balance += transaction.amount.toNumber();
      }
    }

    balances.set(account.id, balance);
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

      if (account.type === "investment") {
        breakdown.investment += rawBalance;
      } else if (account.type === "savings") {
        breakdown.savings += rawBalance;
      } else {
        breakdown.current += rawBalance;
      }

      breakdown.netWorth += rawBalance;
      return breakdown;
    },
    { current: 0, savings: 0, investment: 0, creditDebt: 0, netWorth: 0 },
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
  const [accounts, firstTransaction, firstSnapshot, budgetItems, goals] =
    await Promise.all([
    prisma.account.findMany({
      orderBy: { id: "asc" },
      select: { id: true, type: true, balance: true },
    }),
    prisma.transaction.findFirst({
      orderBy: { date: "asc" },
      select: { date: true },
    }),
    prisma.investmentSnapshot.findFirst({
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
      longTermSignals: [
        {
          label: "Investment contributions vs returns",
          value: formatCurrency(0),
          detail: "Add investment accounts and first-of-month snapshots",
          info: "Compares net transfers into investment accounts with growth inferred from monthly valuation snapshots.",
        },
        {
          label: "Interest earned",
          value: formatCurrency(0),
          detail: "No interest income logged yet",
          info: "Sums income logged with an Interest category.",
        },
        {
          label: "Inflation-adjusted growth",
          value: formatCurrency(0),
          detail: "Estimated using 3% annual inflation",
          info: "Estimates real tracked account growth by reducing nominal growth with a fixed annual inflation assumption.",
        },
        {
          label: "Debt payoff pace",
          value: "No debt",
          detail: "Based on current credit debt and budgeted repayments",
          info: "Estimates how long tracked credit debt would take to clear at the current budgeted repayment level, before interest.",
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

  const firstActivityDate =
    firstTransaction && firstSnapshot
      ? firstTransaction.date < firstSnapshot.date
        ? firstTransaction.date
        : firstSnapshot.date
      : firstTransaction?.date ?? firstSnapshot?.date ?? null;
  const firstActivityMonth = firstActivityDate
    ? getStartOfMonth(firstActivityDate)
    : currentMonthStart;
  const rangeStart =
    firstActivityMonth > currentMonthStart
      ? currentMonthStart
      : firstActivityMonth;
  const buckets = getMonthBuckets(rangeStart, today);
  const [transactions, investmentSnapshots] = await Promise.all([
    prisma.transaction.findMany({
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
    }),
    prisma.investmentSnapshot.findMany({
      where: {
        date: {
          lt: buckets[buckets.length - 1].end,
        },
      },
      orderBy: { date: "asc" },
      select: {
        accountId: true,
        date: true,
        value: true,
      },
    }),
  ]);
  const typedTransactions: InsightTransaction[] = transactions;
  const typedInvestmentSnapshots: InsightInvestmentSnapshot[] =
    investmentSnapshots;
  const series: InsightSeriesPoint[] = [];

  buckets.forEach((bucket, index) => {
    const balances = getRawBalancesAt(
      typedAccounts,
      typedTransactions,
      typedInvestmentSnapshots,
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
      investment: breakdown.investment,
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
  const latestInvestment = Math.max(latestPoint.investment, 0);
  const grossExposure =
    latestCurrent + latestSavings + latestInvestment + latestPoint.creditDebt;
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
  const investmentAccountIds = new Set(
    typedAccounts
      .filter((account) => account.type === "investment")
      .map((account) => account.id),
  );
  const interestEarned = typedTransactions.reduce((sum, transaction) => {
    const isInterest =
      transaction.type === "income" &&
      transaction.category?.name.toLowerCase().includes("interest");

    return isInterest ? sum + transaction.amount.toNumber() : sum;
  }, 0);
  const investmentSnapshotsByAccount = new Map<
    number,
    InsightInvestmentSnapshot[]
  >();
  for (const snapshot of typedInvestmentSnapshots) {
    const existing = investmentSnapshotsByAccount.get(snapshot.accountId) ?? [];
    existing.push(snapshot);
    investmentSnapshotsByAccount.set(snapshot.accountId, existing);
  }
  let investmentContributions = 0;
  let investmentReturns = 0;
  let investmentReturnIntervals = 0;
  for (const snapshots of investmentSnapshotsByAccount.values()) {
    const orderedSnapshots = snapshots.sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );

    for (let index = 1; index < orderedSnapshots.length; index += 1) {
      const startingSnapshot = orderedSnapshots[index - 1];
      const endingSnapshot = orderedSnapshots[index];
      const netContributions = typedTransactions.reduce((sum, transaction) => {
        if (
          transaction.type !== "transfer" ||
          transaction.date < startingSnapshot.date ||
          transaction.date >= endingSnapshot.date
        ) {
          return sum;
        }

        const amount = Math.abs(transaction.amount.toNumber());

        if (transaction.transferAccountId === endingSnapshot.accountId) {
          return sum + amount;
        }

        if (transaction.accountId === endingSnapshot.accountId) {
          return sum - amount;
        }

        return sum;
      }, 0);

      investmentContributions += netContributions;
      investmentReturns +=
        endingSnapshot.value.toNumber() -
        startingSnapshot.value.toNumber() -
        netContributions;
      investmentReturnIntervals += 1;
    }
  }
  const rangeMonths = Math.max(
    getMonthsBetween(buckets[0].start, buckets[buckets.length - 1].start),
    1,
  );
  const inflationFactor = Math.pow(
    1 + ASSUMED_ANNUAL_INFLATION_RATE,
    rangeMonths / 12,
  );
  const nominalTrackedGrowth = latestPoint.netWorth - firstPoint.netWorth;
  const inflationAdjustedGrowth =
    (latestPoint.netWorth - firstPoint.netWorth * inflationFactor) /
    inflationFactor;
  const payoffMonths =
    latestPoint.creditDebt > 0 && debtPayments > 0
      ? Math.ceil(latestPoint.creditDebt / debtPayments)
      : null;
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
                ? `Due ${utcShortDateFormatter.format(goal.deadline)}`
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
              ? `Due ${utcShortDateFormatter.format(goal.deadline)}`
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
      label: "Investments",
      value: formatCurrency(latestPoint.investment),
      percent:
        grossExposure > 0
          ? Math.round((latestInvestment / grossExposure) * 100)
          : 0,
      tone: "violet",
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
    longTermSignals: [
      {
        label: "Investment contributions vs returns",
        value: `${formatCurrency(investmentContributions)} / ${formatCurrency(
          investmentReturns,
        )}`,
        detail:
          investmentReturnIntervals > 0
            ? "Net transfers vs inferred valuation change"
            : investmentAccountIds.size > 0
              ? "Add at least two monthly snapshots"
              : "Add an investment account to track this",
        info: "Uses monthly investment snapshots and transfers to estimate returns: ending value minus starting value minus net contributions.",
      },
      {
        label: "Interest earned",
        value: formatCurrency(interestEarned),
        detail: "Income logged with an Interest category",
        info: "Interest is tracked as ordinary income credited to an account, usually a savings account.",
      },
      {
        label: "Inflation-adjusted growth",
        value: formatCurrency(inflationAdjustedGrowth),
        detail: `${formatCurrency(nominalTrackedGrowth)} nominal, using 3% annual inflation`,
        info: "This estimates real tracked account growth with a fixed 3% annual inflation assumption until a CPI feed or manual inflation setting exists.",
      },
      {
        label: "Debt payoff pace",
        value: payoffMonths === null ? "No active payoff" : `${payoffMonths} months`,
        detail:
          latestPoint.creditDebt <= 0
            ? "No tracked credit debt"
            : debtPayments > 0
              ? `${formatCurrency(latestPoint.creditDebt)} debt at ${formatCurrency(
                  debtPayments,
                )}/month`
              : "Add a debt repayment budget to estimate pace",
        info: "Estimates payoff time from current tracked credit debt and budgeted debt repayments. It does not include interest because account interest rates are not stored yet.",
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
