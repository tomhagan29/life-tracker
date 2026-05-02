export type DailyLogReferenceTransaction = {
  direction: string;
  accountId: number;
  categoryId?: number | null;
  transferAccountId?: number | null;
};

export type DailyLogReferenceInput = {
  transactions: DailyLogReferenceTransaction[];
  habitIds: number[];
  investmentSnapshots: { accountId: number }[];
  includeInvestmentSnapshots: boolean;
};

export type DailyLogReferenceIds = {
  accountIds: number[];
  categoryIds: number[];
  habitIds: number[];
};

export type DailyLogReferenceRecords = {
  accounts: { id: number; name: string; type: string }[];
  categories: { id: number; name: string }[];
  habits: { id: number; name: string }[];
};

export class DailyLogReferenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DailyLogReferenceError";
  }
}

function noLongerExistsMessage(recordLabel: string, id: number) {
  return `The ${recordLabel} (ID ${id}) no longer exists. Please refresh and try again.`;
}

function missingForeignKeyMessage(recordLabel: string) {
  return `The ${recordLabel} no longer exists. Please refresh and try again.`;
}

function addId(ids: Set<number>, id: number | null | undefined) {
  if (typeof id === "number") {
    ids.add(id);
  }
}

export function collectDailyLogReferenceIds(
  input: DailyLogReferenceInput,
): DailyLogReferenceIds {
  const accountIds = new Set<number>();
  const categoryIds = new Set<number>();
  const habitIds = new Set(input.habitIds);

  for (const transaction of input.transactions) {
    addId(accountIds, transaction.accountId);

    if (transaction.direction === "transfer") {
      addId(accountIds, transaction.transferAccountId);
    } else {
      addId(categoryIds, transaction.categoryId);
    }
  }

  if (input.includeInvestmentSnapshots) {
    for (const snapshot of input.investmentSnapshots) {
      addId(accountIds, snapshot.accountId);
    }
  }

  return {
    accountIds: Array.from(accountIds),
    categoryIds: Array.from(categoryIds),
    habitIds: Array.from(habitIds),
  };
}

export function assertDailyLogReferencesExist(
  input: DailyLogReferenceInput,
  records: DailyLogReferenceRecords,
) {
  const accountsById = new Map(records.accounts.map((account) => [account.id, account]));
  const categoriesById = new Map(
    records.categories.map((category) => [category.id, category]),
  );
  const habitsById = new Map(records.habits.map((habit) => [habit.id, habit]));

  for (const transaction of input.transactions) {
    if (!accountsById.has(transaction.accountId)) {
      throw new DailyLogReferenceError(
        noLongerExistsMessage("selected account", transaction.accountId),
      );
    }

    if (transaction.direction === "transfer") {
      const transferAccountId = transaction.transferAccountId;

      if (transferAccountId && !accountsById.has(transferAccountId)) {
        throw new DailyLogReferenceError(
          noLongerExistsMessage("destination account", transferAccountId),
        );
      }
    } else {
      const categoryId = transaction.categoryId;

      if (categoryId && !categoriesById.has(categoryId)) {
        throw new DailyLogReferenceError(
          noLongerExistsMessage("selected category", categoryId),
        );
      }
    }
  }

  for (const habitId of input.habitIds) {
    if (!habitsById.has(habitId)) {
      throw new DailyLogReferenceError(
        noLongerExistsMessage("selected habit", habitId),
      );
    }
  }

  if (!input.includeInvestmentSnapshots) {
    return;
  }

  for (const snapshot of input.investmentSnapshots) {
    const account = accountsById.get(snapshot.accountId);

    if (!account) {
      throw new DailyLogReferenceError(
        noLongerExistsMessage("investment account", snapshot.accountId),
      );
    }

    if (account.type !== "investment") {
      throw new DailyLogReferenceError(
        `The account "${account.name}" is no longer an investment account. Please refresh and try again.`,
      );
    }
  }
}

export function getDailyLogForeignKeyErrorMessage(fieldName?: string) {
  if (fieldName?.includes("transferAccountId")) {
    return missingForeignKeyMessage("destination account");
  }

  if (fieldName?.includes("accountId")) {
    return missingForeignKeyMessage("selected account");
  }

  if (fieldName?.includes("categoryId")) {
    return missingForeignKeyMessage("selected category");
  }

  if (fieldName?.includes("habitId")) {
    return missingForeignKeyMessage("selected habit");
  }

  return "One of the selected accounts, categories, or habits no longer exists. Please refresh and try again.";
}
