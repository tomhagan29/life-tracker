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
  habits: {
    id: number;
    name: string;
    streak: number;
    schedule: string;
  }[];
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

export async function getDailyLogOptions(): Promise<DailyLogOptions> {
  const [accounts, categories, habits] = await Promise.all([
    prisma.account.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.financeCategory.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
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
  ]);

  return {
    accounts,
    categories,
    habits: habits.map((habit) => ({
      id: habit.id,
      name: habit.name,
      streak: habit.streak,
      schedule: habit.isDaily ? "Daily" : `${habit.frequency ?? 0}/week`,
    })),
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

  if (
    parsed.data.transactions.length === 0 &&
    parsed.data.habitIds.length === 0
  ) {
    return {
      ok: false,
      message: "Add at least one transaction or completed habit.",
    };
  }

  try {
    const date = parseLogDate(parsed.data.date);
    const habitIds = Array.from(new Set(parsed.data.habitIds));

    await prisma.$transaction(async (tx) => {
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

      for (const habitId of habitIds) {
        await tx.habit.update({
          where: { id: habitId },
          data: {
            streak: {
              increment: 1,
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
