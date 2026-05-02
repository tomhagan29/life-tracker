"use server";

import { Prisma, TransactionType } from "@/app/generated/prisma/client";
import { currencySchema } from "@/lib/constants";
import { calculateHabitStreaks, formatHabitStreak } from "@/lib/habit-streak";
import { toMoneyDecimal } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type DailyLogActionState = {
  ok: boolean;
  message?: string;
};

export type DailyLogOptions = {
  accounts: { id: number; name: string; type: string }[];
  categories: { id: number; name: string }[];
  transactions: {
    id: number;
    direction: TransactionType;
    amount: string;
    accountId: number;
    categoryId: number | null;
    transferAccountId: number | null;
  }[];
  habits: {
    id: number;
    name: string;
    streak: number;
    streakLabel: string;
    schedule: string;
  }[];
  completedHabitIds: number[];
  investmentSnapshots: {
    accountId: number;
    name: string;
    value: string;
  }[];
};

const optionalPositiveIdSchema = z.preprocess(
  (value) => (value === "" ? null : value),
  z.coerce.number().int().positive().nullable().optional(),
);

const transactionDraftSchema = z
  .object({
    amount: currencySchema.refine((amount) => amount > 0, {
      message: "Transaction amount must be greater than zero",
    }),
    direction: z.enum(TransactionType),
    accountId: z.coerce.number().int().positive("Account is required"),
    categoryId: optionalPositiveIdSchema,
    transferAccountId: optionalPositiveIdSchema,
  })
  .superRefine((transaction, context) => {
    if (transaction.direction === "transfer") {
      if (!transaction.transferAccountId) {
        context.addIssue({
          code: "custom",
          path: ["transferAccountId"],
          message: "Destination account is required",
        });
      }

      if (transaction.transferAccountId === transaction.accountId) {
        context.addIssue({
          code: "custom",
          path: ["transferAccountId"],
          message: "Choose a different destination account",
        });
      }

      return;
    }

    if (!transaction.categoryId) {
      context.addIssue({
        code: "custom",
        path: ["categoryId"],
        message: "Category is required",
      });
    }
  });

const dailyLogSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date"),
  transactions: z.array(transactionDraftSchema),
  habitIds: z.array(z.coerce.number().int().positive()),
  investmentSnapshots: z.array(
    z.object({
      accountId: z.coerce.number().int().positive(),
      value: z.string().trim(),
    }),
  ),
}).superRefine((log, context) => {
  for (const [index, snapshot] of log.investmentSnapshots.entries()) {
    if (snapshot.value === "") {
      continue;
    }

    const parsed = currencySchema.safeParse(snapshot.value);
    if (!parsed.success || parsed.data < 0) {
      context.addIssue({
        code: "custom",
        path: ["investmentSnapshots", index, "value"],
        message: "Investment snapshot values must be zero or greater",
      });
    }
  }
});

function parseJsonField<T>(value: FormDataEntryValue | null, fallback: T) {
  if (typeof value !== "string" || value.trim() === "") {
    return fallback;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return fallback;
  }
}

function parseDailyLogForm(formData: FormData) {
  return dailyLogSchema.safeParse({
    date: formData.get("date"),
    transactions: parseJsonField(formData.get("transactions"), []),
    habitIds: parseJsonField(formData.get("habitIds"), []),
    investmentSnapshots: parseJsonField(formData.get("investmentSnapshots"), []),
  });
}

function parseLogDate(date: string) {
  return new Date(`${date}T12:00:00Z`);
}

function getLogDateRange(date: string) {
  const start = new Date(`${date}T00:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
}

function isFirstOfMonth(date: string) {
  return date.endsWith("-01");
}

function getInvestmentSnapshotDate(date: string) {
  return new Date(`${date}T00:00:00Z`);
}

function getLogMonthRange(date: string) {
  const parsed = parseLogDate(date);
  const start = new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), 1),
  );
  const end = new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth() + 1, 1),
  );

  return { start, end };
}

function getHabitScheduleLabel(isDaily: boolean, frequency: number | null) {
  if (isDaily) {
    return "Daily";
  }

  if (frequency === null) {
    return "Monthly";
  }

  return `${frequency}/week`;
}

function getDailyLogActionError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2003") {
      return "Please choose valid accounts, categories, and habits.";
    }

    if (error.code === "P2025") {
      return "One of the selected records no longer exists.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function revalidateDailyLogPaths() {
  revalidatePath("/");
  revalidatePath("/insights");
  revalidatePath("/accounts");
  revalidatePath("/budget");
  revalidatePath("/goals");
  revalidatePath("/habits");
  revalidatePath("/settings");
}

type BalanceTransaction = {
  amount: Prisma.Decimal;
  accountId: number;
  transferAccountId: number | null;
};

async function adjustAccountBalance(
  tx: Prisma.TransactionClient,
  accountId: number,
  delta: Prisma.Decimal,
) {
  const account = await tx.account.findUniqueOrThrow({
    where: { id: accountId },
    select: { balance: true },
  });

  await tx.account.update({
    where: { id: accountId },
    data: { balance: toMoneyDecimal(account.balance.plus(delta)) },
  });
}

async function applyTransactionBalance(
  tx: Prisma.TransactionClient,
  transaction: BalanceTransaction,
) {
  if (transaction.transferAccountId) {
    await adjustAccountBalance(tx, transaction.accountId, transaction.amount.negated());
    await adjustAccountBalance(tx, transaction.transferAccountId, transaction.amount);

    return;
  }

  await adjustAccountBalance(tx, transaction.accountId, transaction.amount);
}

async function revertTransactionBalance(
  tx: Prisma.TransactionClient,
  transaction: BalanceTransaction,
) {
  if (transaction.transferAccountId) {
    await adjustAccountBalance(tx, transaction.accountId, transaction.amount);
    await adjustAccountBalance(
      tx,
      transaction.transferAccountId,
      transaction.amount.negated(),
    );

    return;
  }

  await adjustAccountBalance(tx, transaction.accountId, transaction.amount.negated());
}

async function refreshInvestmentAccountBalance(
  tx: Prisma.TransactionClient,
  accountId: number,
) {
  const latestSnapshot = await tx.investmentSnapshot.findFirst({
    where: { accountId },
    orderBy: { date: "desc" },
    select: { date: true, value: true },
  });

  if (!latestSnapshot) {
    return;
  }

  const transactions = await tx.transaction.findMany({
    where: {
      date: { gte: latestSnapshot.date },
      OR: [{ accountId }, { transferAccountId: accountId }],
    },
    select: {
      amount: true,
      accountId: true,
      transferAccountId: true,
    },
  });
  const balance = transactions.reduce((sum, transaction) => {
    if (transaction.transferAccountId) {
      if (transaction.transferAccountId === accountId) {
        return sum.plus(transaction.amount.abs());
      }

      if (transaction.accountId === accountId) {
        return sum.minus(transaction.amount.abs());
      }

      return sum;
    }

    if (transaction.accountId === accountId) {
      return sum.plus(transaction.amount);
    }

    return sum;
  }, latestSnapshot.value);

  await tx.account.update({
    where: { id: accountId },
    data: { balance: toMoneyDecimal(balance) },
  });
}

export async function getDailyLogOptions(date: string): Promise<DailyLogOptions> {
  const parsedDate = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .safeParse(date);
  const logDate = parsedDate.success
    ? parsedDate.data
    : new Date().toISOString().slice(0, 10);
  const dateRange = getLogDateRange(logDate);
  const monthRange = getLogMonthRange(logDate);

  const [
    accounts,
    categories,
    transactions,
    habits,
    dayHabitCompletions,
    monthHabitCompletions,
  ] =
    await Promise.all([
      prisma.account.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, type: true },
      }),
      prisma.financeCategory.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.transaction.findMany({
        where: {
          date: {
            gte: dateRange.start,
            lt: dateRange.end,
          },
        },
        orderBy: { id: "asc" },
        select: {
          id: true,
          amount: true,
          type: true,
          accountId: true,
          categoryId: true,
          transferAccountId: true,
        },
      }),
      prisma.habit.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          streak: true,
          isDaily: true,
          frequency: true,
        },
      }),
      prisma.habitCompletion.findMany({
        where: {
          date: {
            gte: dateRange.start,
            lt: dateRange.end,
          },
        },
        select: { habitId: true },
      }),
      prisma.habitCompletion.findMany({
        where: {
          date: {
            gte: monthRange.start,
            lt: monthRange.end,
          },
        },
        select: { habitId: true },
      }),
    ]);
  const investmentAccounts = accounts.filter(
    (account) => account.type === "investment",
  );
  const investmentSnapshotRows =
    isFirstOfMonth(logDate) && investmentAccounts.length > 0
      ? await prisma.investmentSnapshot.findMany({
          where: {
            accountId: { in: investmentAccounts.map((account) => account.id) },
            date: {
              gte: dateRange.start,
              lt: dateRange.end,
            },
          },
          select: { accountId: true, value: true },
        })
      : [];
  const investmentSnapshotValueByAccount = new Map(
    investmentSnapshotRows.map((snapshot) => [
      snapshot.accountId,
      snapshot.value.toFixed(2),
    ]),
  );

  const dayCompletedHabitIds = new Set(
    dayHabitCompletions.map((habitCompletion) => habitCompletion.habitId),
  );
  const monthCompletedHabitIds = new Set(
    monthHabitCompletions.map((habitCompletion) => habitCompletion.habitId),
  );

  return {
    accounts,
    categories,
    transactions: transactions.map((transaction) => {
      return {
        id: transaction.id,
        direction: transaction.type,
        amount: Math.abs(transaction.amount.toNumber()).toString(),
        accountId: transaction.accountId,
        categoryId: transaction.categoryId,
        transferAccountId: transaction.transferAccountId,
      };
    }),
    habits: habits.map((habit) => ({
      id: habit.id,
      name: habit.name,
      streak: habit.streak,
      streakLabel: formatHabitStreak(habit),
      schedule: getHabitScheduleLabel(habit.isDaily, habit.frequency),
    })),
    completedHabitIds: habits
      .filter((habit) =>
        habit.isDaily || habit.frequency !== null
          ? dayCompletedHabitIds.has(habit.id)
          : monthCompletedHabitIds.has(habit.id),
      )
      .map((habit) => habit.id),
    investmentSnapshots: isFirstOfMonth(logDate)
      ? investmentAccounts.map((account) => ({
          accountId: account.id,
          name: account.name,
          value: investmentSnapshotValueByAccount.get(account.id) ?? "",
        }))
      : [],
  };
}

export async function submitDailyLog(
  formData: FormData,
): Promise<DailyLogActionState> {
  const parsed = parseDailyLogForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ?? "Please check the log details.",
    };
  }

  try {
    const date = parseLogDate(parsed.data.date);
    const dateRange = getLogDateRange(parsed.data.date);
    const monthRange = getLogMonthRange(parsed.data.date);
    const habitIds = Array.from(new Set(parsed.data.habitIds));

    await prisma.$transaction(async (tx) => {
      const habits = await tx.habit.findMany({
        select: {
          id: true,
          isDaily: true,
          frequency: true,
        },
      });
      const investmentAccounts = await tx.account.findMany({
        where: { type: "investment" },
        select: { id: true },
      });
      const existingTransactions = await tx.transaction.findMany({
        where: {
          date: {
            gte: dateRange.start,
            lt: dateRange.end,
          },
        },
        select: {
          amount: true,
          accountId: true,
          transferAccountId: true,
        },
      });
      const existingHabitCompletions = await tx.habitCompletion.findMany({
        where: {
          date: {
            gte: monthRange.start,
            lt: monthRange.end,
          },
        },
        select: { habitId: true, date: true },
      });
      const habitById = new Map(habits.map((habit) => [habit.id, habit]));
      const investmentAccountIds = new Set(
        investmentAccounts.map((account) => account.id),
      );
      const touchedInvestmentAccountIds = new Set<number>();
      const dayExistingHabitIds = new Set(
        existingHabitCompletions
          .filter(
            (habitCompletion) =>
              habitCompletion.date >= dateRange.start &&
              habitCompletion.date < dateRange.end,
          )
          .map((habitCompletion) => habitCompletion.habitId),
      );
      const monthExistingHabitIds = new Set(
        existingHabitCompletions.map((habitCompletion) => habitCompletion.habitId),
      );
      const existingRelevantHabitIds = habits
        .filter((habit) =>
          habit.isDaily || habit.frequency !== null
            ? dayExistingHabitIds.has(habit.id)
            : monthExistingHabitIds.has(habit.id),
        )
        .map((habit) => habit.id);
      const habitIdsToAdd = habitIds.filter((habitId) => {
        const habit = habitById.get(habitId);

        if (!habit) {
          return false;
        }

        return habit.isDaily || habit.frequency !== null
          ? !dayExistingHabitIds.has(habitId)
          : !monthExistingHabitIds.has(habitId);
      });
      const habitIdsToRemove = existingRelevantHabitIds.filter(
        (habitId) => !habitIds.includes(habitId),
      );

      for (const transaction of existingTransactions) {
        await revertTransactionBalance(tx, transaction);
        if (investmentAccountIds.has(transaction.accountId)) {
          touchedInvestmentAccountIds.add(transaction.accountId);
        }
        if (
          transaction.transferAccountId &&
          investmentAccountIds.has(transaction.transferAccountId)
        ) {
          touchedInvestmentAccountIds.add(transaction.transferAccountId);
        }
      }

      await tx.transaction.deleteMany({
        where: {
          date: {
            gte: dateRange.start,
            lt: dateRange.end,
          },
        },
      });

      for (const transaction of parsed.data.transactions) {
        if (transaction.direction === "transfer") {
          const transferAccountId = transaction.transferAccountId;

          if (!transferAccountId) {
            throw new Error("Destination account is required");
          }

          const amount = toMoneyDecimal(Math.abs(transaction.amount));

          await tx.transaction.create({
            data: {
              date,
              type: "transfer",
              amount,
              accountId: transaction.accountId,
              transferAccountId,
            },
          });

          await applyTransactionBalance(tx, {
            amount,
            accountId: transaction.accountId,
            transferAccountId,
          });
          if (investmentAccountIds.has(transaction.accountId)) {
            touchedInvestmentAccountIds.add(transaction.accountId);
          }
          if (investmentAccountIds.has(transferAccountId)) {
            touchedInvestmentAccountIds.add(transferAccountId);
          }

          continue;
        }

        const signedAmount =
          transaction.direction === "income"
            ? Math.abs(transaction.amount)
            : -Math.abs(transaction.amount);
        const amount = toMoneyDecimal(signedAmount);

        await tx.transaction.create({
          data: {
            date,
            type: transaction.direction,
            amount,
            accountId: transaction.accountId,
            categoryId: transaction.categoryId,
          },
        });

        await applyTransactionBalance(tx, {
          amount,
          accountId: transaction.accountId,
          transferAccountId: null,
        });
        if (investmentAccountIds.has(transaction.accountId)) {
          touchedInvestmentAccountIds.add(transaction.accountId);
        }
      }

      if (isFirstOfMonth(parsed.data.date)) {
        const snapshotDate = getInvestmentSnapshotDate(parsed.data.date);

        for (const snapshot of parsed.data.investmentSnapshots) {
          if (!investmentAccountIds.has(snapshot.accountId)) {
            continue;
          }

          touchedInvestmentAccountIds.add(snapshot.accountId);

          if (snapshot.value === "") {
            await tx.investmentSnapshot.deleteMany({
              where: {
                accountId: snapshot.accountId,
                date: snapshotDate,
              },
            });
            continue;
          }

          await tx.investmentSnapshot.upsert({
            where: {
              accountId_date: {
                accountId: snapshot.accountId,
                date: snapshotDate,
              },
            },
            create: {
              accountId: snapshot.accountId,
              date: snapshotDate,
              value: toMoneyDecimal(snapshot.value),
            },
            update: {
              value: toMoneyDecimal(snapshot.value),
            },
          });
        }
      }

      for (const accountId of touchedInvestmentAccountIds) {
        await refreshInvestmentAccountBalance(tx, accountId);
      }

      if (habitIdsToAdd.length > 0) {
        for (const habitId of habitIdsToAdd) {
          await tx.habitCompletion.upsert({
            where: {
              habitId_date: {
                habitId,
                date,
              },
            },
            create: {
              habitId,
              date,
            },
            update: {},
          });
        }
      }

      if (habitIdsToRemove.length > 0) {
        const monthlyHabitIds = habitIdsToRemove.filter((habitId) => {
          const habit = habitById.get(habitId);
          return habit && !habit.isDaily && habit.frequency === null;
        });
        const dayScopedHabitIds = habitIdsToRemove.filter(
          (habitId) => !monthlyHabitIds.includes(habitId),
        );

        if (dayScopedHabitIds.length > 0) {
          await tx.habitCompletion.deleteMany({
            where: {
              habitId: { in: dayScopedHabitIds },
              date: {
                gte: dateRange.start,
                lt: dateRange.end,
              },
            },
          });
        }

        if (monthlyHabitIds.length > 0) {
          await tx.habitCompletion.deleteMany({
            where: {
              habitId: { in: monthlyHabitIds },
              date: {
                gte: monthRange.start,
                lt: monthRange.end,
              },
            },
          });
        }
      }

      const habitCompletions = await tx.habitCompletion.findMany({
        select: {
          habitId: true,
          date: true,
        },
      });
      const streaksByHabitId = calculateHabitStreaks(habits, habitCompletions);

      for (const habit of habits) {
        await tx.habit.update({
          where: { id: habit.id },
          data: { streak: streaksByHabitId.get(habit.id) ?? 0 },
        });
      }
    });

    revalidateDailyLogPaths();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: getDailyLogActionError(error) };
  }
}
