"use server";

import {
  AccountType,
  GoalType,
  Prisma,
} from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type UserDataActionState = {
  ok: boolean;
  message?: string;
};

const decimalStringSchema = z.union([z.string().min(1), z.number()]).transform(String);
const nullableDateSchema = z.string().datetime().nullable();

const importDataSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().optional(),
  data: z.object({
    financeCategories: z.array(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1),
      }),
    ),
    habitCategories: z.array(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1),
      }),
    ),
    accounts: z.array(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1),
        balance: decimalStringSchema,
        type: z.enum(AccountType),
      }),
    ),
    transactions: z.array(
      z.object({
        id: z.number().int().positive(),
        date: z.string().datetime(),
        amount: decimalStringSchema,
        categoryId: z.number().int().positive(),
        accountId: z.number().int().positive(),
      }),
    ),
    habits: z.array(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1),
        categoryId: z.number().int().positive(),
        streak: z.number().int().min(0),
        isDaily: z.boolean(),
        frequency: z.number().int().min(1).max(7).nullable(),
      }),
    ),
    budgetItems: z.array(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1),
        amount: decimalStringSchema,
        dueDay: z.number().int().min(1).max(31).nullable(),
        categoryId: z.number().int().positive(),
        accountId: z.number().int().positive(),
      }),
    ),
    goals: z.array(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1),
        type: z.enum(GoalType),
        targetAmount: decimalStringSchema.nullable(),
        currentAmount: decimalStringSchema.nullable(),
        isComplete: z.boolean().optional().default(false),
        deadline: nullableDateSchema,
      }),
    ),
    goalMilestones: z.array(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1),
        description: z.string().optional().default(""),
        deadline: nullableDateSchema,
        isComplete: z.boolean().optional().default(false),
        goalId: z.number().int().positive(),
      }),
    ),
    checkIns: z.array(
      z.object({
        id: z.number().int().positive(),
        date: z.string().datetime(),
      }),
    ),
    checkInComments: z.array(
      z.object({
        id: z.number().int().positive(),
        content: z.string(),
        checkInId: z.number().int().positive(),
      }),
    ),
  }),
});

function revalidateUserDataPaths() {
  revalidatePath("/");
  revalidatePath("/accounts");
  revalidatePath("/budget");
  revalidatePath("/goals");
  revalidatePath("/habits");
  revalidatePath("/settings");
}

function toDecimal(value: string | null) {
  return value === null ? null : new Prisma.Decimal(value);
}

function toDate(value: string | null) {
  return value === null ? null : new Date(value);
}

async function deleteAllData(tx: Prisma.TransactionClient) {
  await tx.checkInComment.deleteMany();
  await tx.transaction.deleteMany();
  await tx.budgetItem.deleteMany();
  await tx.habit.deleteMany();
  await tx.goalMilestone.deleteMany();
  await tx.checkIn.deleteMany();
  await tx.goal.deleteMany();
  await tx.account.deleteMany();
  await tx.financeCategory.deleteMany();
  await tx.habitCategory.deleteMany();
}

function getUserDataActionError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return "The import contains duplicate records.";
    }

    if (error.code === "P2003") {
      return "The import contains records with missing relationships.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export async function exportUserData() {
  const [
    financeCategories,
    habitCategories,
    accounts,
    transactions,
    habits,
    budgetItems,
    goals,
    goalMilestones,
    checkIns,
    checkInComments,
  ] = await Promise.all([
    prisma.financeCategory.findMany({ orderBy: { id: "asc" } }),
    prisma.habitCategory.findMany({ orderBy: { id: "asc" } }),
    prisma.account.findMany({ orderBy: { id: "asc" } }),
    prisma.transaction.findMany({ orderBy: { id: "asc" } }),
    prisma.habit.findMany({ orderBy: { id: "asc" } }),
    prisma.budgetItem.findMany({ orderBy: { id: "asc" } }),
    prisma.goal.findMany({ orderBy: { id: "asc" } }),
    prisma.goalMilestone.findMany({ orderBy: { id: "asc" } }),
    prisma.checkIn.findMany({ orderBy: { id: "asc" } }),
    prisma.checkInComment.findMany({ orderBy: { id: "asc" } }),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      financeCategories,
      habitCategories,
      accounts: accounts.map((account) => ({
        ...account,
        balance: account.balance.toString(),
      })),
      transactions: transactions.map((transaction) => ({
        ...transaction,
        date: transaction.date.toISOString(),
        amount: transaction.amount.toString(),
      })),
      habits,
      budgetItems: budgetItems.map((budgetItem) => ({
        ...budgetItem,
        amount: budgetItem.amount.toString(),
      })),
      goals: goals.map((goal) => ({
        ...goal,
        targetAmount: goal.targetAmount?.toString() ?? null,
        currentAmount: goal.currentAmount?.toString() ?? null,
        deadline: goal.deadline?.toISOString() ?? null,
      })),
      goalMilestones: goalMilestones.map((milestone) => ({
        ...milestone,
        deadline: milestone.deadline?.toISOString() ?? null,
      })),
      checkIns: checkIns.map((checkIn) => ({
        ...checkIn,
        date: checkIn.date.toISOString(),
      })),
      checkInComments,
    },
  };
}

export async function importUserData(
  formData: FormData,
): Promise<UserDataActionState> {
  const rawImport = formData.get("data");

  if (typeof rawImport !== "string" || rawImport.trim() === "") {
    return { ok: false, message: "Choose a valid export file." };
  }

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(rawImport);
  } catch {
    return { ok: false, message: "The selected file is not valid JSON." };
  }

  const parsed = importDataSchema.safeParse(parsedJson);

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "The import file is invalid.",
    };
  }

  const data = parsed.data.data;

  try {
    await prisma.$transaction(async (tx) => {
      await deleteAllData(tx);

      await tx.financeCategory.createMany({ data: data.financeCategories });
      await tx.habitCategory.createMany({ data: data.habitCategories });
      await tx.account.createMany({
        data: data.accounts.map((account) => ({
          ...account,
          balance: new Prisma.Decimal(account.balance),
        })),
      });
      await tx.checkIn.createMany({
        data: data.checkIns.map((checkIn) => ({
          ...checkIn,
          date: new Date(checkIn.date),
        })),
      });
      await tx.goal.createMany({
        data: data.goals.map((goal) => ({
          ...goal,
          targetAmount: toDecimal(goal.targetAmount),
          currentAmount: toDecimal(goal.currentAmount),
          deadline: toDate(goal.deadline),
        })),
      });
      await tx.transaction.createMany({
        data: data.transactions.map((transaction) => ({
          ...transaction,
          date: new Date(transaction.date),
          amount: new Prisma.Decimal(transaction.amount),
        })),
      });
      await tx.habit.createMany({ data: data.habits });
      await tx.budgetItem.createMany({
        data: data.budgetItems.map((budgetItem) => ({
          ...budgetItem,
          amount: new Prisma.Decimal(budgetItem.amount),
        })),
      });
      await tx.goalMilestone.createMany({
        data: data.goalMilestones.map((milestone) => ({
          ...milestone,
          deadline: toDate(milestone.deadline),
        })),
      });
      await tx.checkInComment.createMany({ data: data.checkInComments });
    });

    revalidateUserDataPaths();
    return { ok: true, message: "Data imported." };
  } catch (error) {
    return { ok: false, message: getUserDataActionError(error) };
  }
}

export async function resetUserData(): Promise<UserDataActionState> {
  try {
    await prisma.$transaction(async (tx) => {
      await deleteAllData(tx);
    });

    revalidateUserDataPaths();
    return { ok: true, message: "Database reset." };
  } catch (error) {
    return { ok: false, message: getUserDataActionError(error) };
  }
}
