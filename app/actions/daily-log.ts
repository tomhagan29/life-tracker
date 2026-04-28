"use server";

import { Prisma } from "@/app/generated/prisma/client";
import { currencySchema } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type DailyLogActionState = {
  ok: boolean;
  message?: string;
};

export type DailyLogOptions = {
  accounts: { id: number; name: string }[];
  categories: { id: number; name: string }[];
  transactions: {
    id: number;
    direction: "income" | "outgoing" | "transfer";
    amount: string;
    accountId: number;
    categoryId: number | null;
    transferAccountId: number | null;
  }[];
  habits: {
    id: number;
    name: string;
    streak: number;
    schedule: string;
  }[];
  completedHabitIds: number[];
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
    direction: z.enum(["income", "outgoing", "transfer"]),
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
  });
}

function parseLogDate(date: string) {
  return new Date(`${date}T12:00:00`);
}

function getLogDateRange(date: string) {
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

function getLogMonthRange(date: string) {
  const parsed = parseLogDate(date);
  const start = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
  const end = new Date(parsed.getFullYear(), parsed.getMonth() + 1, 1);

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

async function applyTransactionBalance(
  tx: Prisma.TransactionClient,
  transaction: BalanceTransaction,
) {
  if (transaction.transferAccountId) {
    await tx.account.update({
      where: { id: transaction.accountId },
      data: {
        balance: {
          decrement: transaction.amount,
        },
      },
    });
    await tx.account.update({
      where: { id: transaction.transferAccountId },
      data: {
        balance: {
          increment: transaction.amount,
        },
      },
    });

    return;
  }

  await tx.account.update({
    where: { id: transaction.accountId },
    data: {
      balance: {
        increment: transaction.amount,
      },
    },
  });
}

async function revertTransactionBalance(
  tx: Prisma.TransactionClient,
  transaction: BalanceTransaction,
) {
  if (transaction.transferAccountId) {
    await tx.account.update({
      where: { id: transaction.accountId },
      data: {
        balance: {
          increment: transaction.amount,
        },
      },
    });
    await tx.account.update({
      where: { id: transaction.transferAccountId },
      data: {
        balance: {
          decrement: transaction.amount,
        },
      },
    });

    return;
  }

  await tx.account.update({
    where: { id: transaction.accountId },
    data: {
      balance: {
        increment: transaction.amount.mul(-1),
      },
    },
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
        select: { id: true, name: true },
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
      const amount = transaction.amount.toNumber();
      const isTransfer = transaction.transferAccountId !== null;

      return {
        id: transaction.id,
        direction: isTransfer ? "transfer" : amount >= 0 ? "income" : "outgoing",
        amount: Math.abs(amount).toString(),
        accountId: transaction.accountId,
        categoryId: transaction.categoryId,
        transferAccountId: transaction.transferAccountId,
      };
    }),
    habits: habits.map((habit) => ({
      id: habit.id,
      name: habit.name,
      streak: habit.streak,
      schedule: getHabitScheduleLabel(habit.isDaily, habit.frequency),
    })),
    completedHabitIds: habits
      .filter((habit) =>
        habit.isDaily || habit.frequency !== null
          ? dayCompletedHabitIds.has(habit.id)
          : monthCompletedHabitIds.has(habit.id),
      )
      .map((habit) => habit.id),
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

          const amount = new Prisma.Decimal(Math.abs(transaction.amount));

          await tx.transaction.create({
            data: {
              date,
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

          continue;
        }

        const signedAmount =
          transaction.direction === "income"
            ? Math.abs(transaction.amount)
            : -Math.abs(transaction.amount);
        const amount = new Prisma.Decimal(signedAmount);

        await tx.transaction.create({
          data: {
            date,
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
      }

      if (habitIdsToAdd.length > 0) {
        await tx.habitCompletion.createMany({
          data: habitIdsToAdd.map((habitId) => ({
            habitId,
            date,
          })),
        });
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

      for (const habitId of habitIdsToAdd) {
        await tx.habit.update({
          where: { id: habitId },
          data: {
            streak: {
              increment: 1,
            },
          },
        });
      }

      for (const habitId of habitIdsToRemove) {
        await tx.habit.updateMany({
          where: { id: habitId, streak: { gt: 0 } },
          data: {
            streak: {
              decrement: 1,
            },
          },
        });
      }
    });

    revalidateDailyLogPaths();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: getDailyLogActionError(error) };
  }
}
