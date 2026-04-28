"use server";

import { currencySchema } from "@/lib/constants";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@/app/generated/prisma/client";

export type BudgetItemActionState = {
  ok: boolean;
  message?: string;
};

const optionalSelectNumber = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().int().optional(),
);

const budgetItemSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  amount: currencySchema,
  dueDay: optionalSelectNumber.refine(
    (day) => day === undefined || (day >= 1 && day <= 31),
    "Choose a valid due day",
  ),
  categoryId: z.coerce.number().int().positive("Category is required"),
  accountId: z.coerce.number().int().positive("Account is required"),
});

function parseBudgetForm(formData: FormData) {
  return budgetItemSchema.safeParse({
    name: formData.get("name"),
    amount: formData.get("amount"),
    dueDay: formData.get("dueDay"),
    categoryId: formData.get("categoryId"),
    accountId: formData.get("accountId"),
  });
}

function getBudgetItemActionError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return "A budget item with this name already exists.";
    }

    if (error.code === "P2025") {
      return "This budget item no longer exists.";
    }

    if (error.code === "P2003") {
      return "Please choose a valid category and account.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function revalidateBudgetPaths() {
  revalidatePath("/");
  revalidatePath("/budget");
}

export async function createBudgetItem(
  formData: FormData,
): Promise<BudgetItemActionState> {
  const parsed = parseBudgetForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ?? "Please check the budget details.",
    };
  }

  try {
    await prisma.budgetItem.create({
      data: {
        name: parsed.data.name,
        amount: new Prisma.Decimal(parsed.data.amount),
        dueDay: parsed.data.dueDay ?? null,
        categoryId: parsed.data.categoryId,
        accountId: parsed.data.accountId,
      },
    });

    revalidateBudgetPaths();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: getBudgetItemActionError(error) };
  }
}

export async function getBudgetItems() {
  return prisma.budgetItem.findMany({
    orderBy: { id: "asc" },
    include: {
      account: true,
      category: true,
    },
  });
}

export async function updateBudgetItem(
  id: number,
  formData: FormData,
): Promise<BudgetItemActionState> {
  const parsed = parseBudgetForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ?? "Please check the budget details.",
    };
  }

  try {
    await prisma.budgetItem.update({
      where: { id },
      data: {
        name: parsed.data.name,
        amount: new Prisma.Decimal(parsed.data.amount),
        dueDay: parsed.data.dueDay ?? null,
        categoryId: parsed.data.categoryId,
        accountId: parsed.data.accountId,
      },
    });

    revalidateBudgetPaths();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: getBudgetItemActionError(error) };
  }
}

export async function deleteBudgetItem(
  id: number,
): Promise<BudgetItemActionState> {
  try {
    await prisma.budgetItem.delete({
      where: { id },
    });

    revalidateBudgetPaths();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: getBudgetItemActionError(error) };
  }
}

export async function getFinanceCategories() {
  return prisma.financeCategory.findMany({
    orderBy: { name: "asc" },
  });
}
