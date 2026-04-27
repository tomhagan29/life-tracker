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
    direction: "income" | "outgoing";
    amount: string;
    accountId: number;
    categoryId: number;
  }[];
  habits: {
    id: number;
    name: string;
    streak: number;
    schedule: string;
  }[];
  completedHabitIds: number[];
};

const transactionDraftSchema = z.object({
  amount: currencySchema.refine((amount) => amount > 0, {
    message: "Transaction amount must be greater than zero",
  }),
  direction: z.enum(["income", "outgoing"]),
  accountId: z.coerce.number().int().positive("Account is required"),
  categoryId: z.coerce.number().int().positive("Category is required"),
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

export async function getDailyLogOptions(date: string): Promise<DailyLogOptions> {
  const parsedDate = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .safeParse(date);
  const logDate = parsedDate.success
    ? parsedDate.data
    : new Date().toISOString().slice(0, 10);
  const dateRange = getLogDateRange(logDate);

  const [accounts, categories, transactions, habits, habitCompletions] =
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
    ]);

  return {
    accounts,
    categories,
    transactions: transactions.map((transaction) => {
      const amount = transaction.amount.toNumber();

      return {
        id: transaction.id,
        direction: amount >= 0 ? "income" : "outgoing",
        amount: Math.abs(amount).toString(),
        accountId: transaction.accountId,
        categoryId: transaction.categoryId,
      };
    }),
    habits: habits.map((habit) => ({
      id: habit.id,
      name: habit.name,
      streak: habit.streak,
      schedule: habit.isDaily ? "Daily" : `${habit.frequency ?? 0}/week`,
    })),
    completedHabitIds: habitCompletions.map(
      (habitCompletion) => habitCompletion.habitId,
    ),
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
    const habitIds = Array.from(new Set(parsed.data.habitIds));

    await prisma.$transaction(async (tx) => {
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
        },
      });
      const existingHabitCompletions = await tx.habitCompletion.findMany({
        where: {
          date: {
            gte: dateRange.start,
            lt: dateRange.end,
          },
        },
        select: { habitId: true },
      });
      const existingHabitIds = existingHabitCompletions.map(
        (habitCompletion) => habitCompletion.habitId,
      );
      const habitIdsToAdd = habitIds.filter(
        (habitId) => !existingHabitIds.includes(habitId),
      );
      const habitIdsToRemove = existingHabitIds.filter(
        (habitId) => !habitIds.includes(habitId),
      );

      for (const transaction of existingTransactions) {
        await tx.account.update({
          where: { id: transaction.accountId },
          data: {
            balance: {
              increment: transaction.amount.mul(-1),
            },
          },
        });
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

        await tx.account.update({
          where: { id: transaction.accountId },
          data: {
            balance: {
              increment: amount,
            },
          },
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
        await tx.habitCompletion.deleteMany({
          where: {
            habitId: { in: habitIdsToRemove },
            date: {
              gte: dateRange.start,
              lt: dateRange.end,
            },
          },
        });
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
