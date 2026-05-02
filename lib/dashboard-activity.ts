export type DashboardActivityRow = {
  id: string;
  name: string;
  category: string;
  summary: string;
};

export type DashboardActivityTransaction = {
  id: number;
  date: Date;
  type: string;
  amount: number;
  accountName: string;
  categoryName: string | null;
  transferAccountName: string | null;
};

export type DashboardActivityHabit = {
  id: number;
  name: string;
  categoryName: string;
  completions: { date: Date }[];
};

type DatedActivityRow = DashboardActivityRow & {
  occurredAt: number;
  order: number;
};

export type BuildRecentActivityInput = {
  transactions: DashboardActivityTransaction[];
  habits: DashboardActivityHabit[];
  formatAmount: (amount: number) => string;
  formatDate: (date: Date) => string;
  limit: number;
};

function latestCompletionDate(completions: { date: Date }[]) {
  return completions.reduce<Date | null>((latest, completion) => {
    if (!latest || completion.date > latest) {
      return completion.date;
    }

    return latest;
  }, null);
}

function toActivityRow(row: DatedActivityRow): DashboardActivityRow {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    summary: row.summary,
  };
}

export function buildRecentActivity({
  transactions,
  habits,
  formatAmount,
  formatDate,
  limit,
}: BuildRecentActivityInput): DashboardActivityRow[] {
  const transactionRows: DatedActivityRow[] = transactions.map(
    (transaction, index) => {
      const isTransfer = transaction.type === "transfer";
      const transferName = transaction.transferAccountName
        ? `${transaction.accountName} -> ${transaction.transferAccountName}`
        : transaction.accountName;

      return {
        id: `transaction-${transaction.id}`,
        name: isTransfer ? transferName : transaction.accountName,
        category: isTransfer
          ? "Transfer out"
          : transaction.categoryName ?? "Uncategorised",
        summary: formatAmount(
          isTransfer ? Math.abs(transaction.amount) : transaction.amount,
        ),
        occurredAt: transaction.date.getTime(),
        order: index,
      };
    },
  );

  const habitRows: DatedActivityRow[] = habits.flatMap((habit, index) => {
    const completedAt = latestCompletionDate(habit.completions);

    if (!completedAt) {
      return [];
    }

    return {
      id: `habit-${habit.id}`,
      name: habit.name,
      category: habit.categoryName,
      summary: `Completed ${formatDate(completedAt)}`,
      occurredAt: completedAt.getTime(),
      order: transactions.length + index,
    };
  });

  return [...transactionRows, ...habitRows]
    .sort((a, b) => b.occurredAt - a.occurredAt || a.order - b.order)
    .slice(0, limit)
    .map(toActivityRow);
}
