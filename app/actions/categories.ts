"use server";

import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type CategoryActionState = {
  ok: boolean;
  message?: string;
};

const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
});

function parseCategoryForm(formData: FormData) {
  return categorySchema.safeParse({
    name: formData.get("name"),
  });
}

function getCategoryActionError(error: unknown, label: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return `${label} category already exists.`;
    }

    if (error.code === "P2025") {
      return `${label} category no longer exists.`;
    }

    if (error.code === "P2003") {
      return `${label} category is still in use.`;
    }
  }

  return "Something went wrong. Please try again.";
}

function revalidateCategoryPaths() {
  revalidatePath("/settings");
  revalidatePath("/budget");
}

export async function getFinanceCategories() {
  return prisma.financeCategory.findMany({
    orderBy: { name: "asc" },
  });
}

export async function createFinanceCategory(
  formData: FormData,
): Promise<CategoryActionState> {
  const parsed = parseCategoryForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ?? "Please check the category details.",
    };
  }

  try {
    await prisma.financeCategory.create({
      data: { name: parsed.data.name },
    });

    revalidateCategoryPaths();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: getCategoryActionError(error, "Finance") };
  }
}

export async function updateFinanceCategory(
  id: number,
  formData: FormData,
): Promise<CategoryActionState> {
  const parsed = parseCategoryForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ?? "Please check the category details.",
    };
  }

  try {
    await prisma.financeCategory.update({
      where: { id },
      data: { name: parsed.data.name },
    });

    revalidateCategoryPaths();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: getCategoryActionError(error, "Finance") };
  }
}

export async function deleteFinanceCategory(
  id: number,
): Promise<CategoryActionState> {
  try {
    await prisma.financeCategory.delete({
      where: { id },
    });

    revalidateCategoryPaths();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: getCategoryActionError(error, "Finance") };
  }
}

export async function getHabitCategories() {
  return prisma.habitCategory.findMany({
    orderBy: { name: "asc" },
  });
}

export async function createHabitCategory(
  formData: FormData,
): Promise<CategoryActionState> {
  const parsed = parseCategoryForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ?? "Please check the category details.",
    };
  }

  try {
    await prisma.habitCategory.create({
      data: { name: parsed.data.name },
    });

    revalidateCategoryPaths();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: getCategoryActionError(error, "Habit") };
  }
}

export async function updateHabitCategory(
  id: number,
  formData: FormData,
): Promise<CategoryActionState> {
  const parsed = parseCategoryForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ?? "Please check the category details.",
    };
  }

  try {
    await prisma.habitCategory.update({
      where: { id },
      data: { name: parsed.data.name },
    });

    revalidateCategoryPaths();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: getCategoryActionError(error, "Habit") };
  }
}

export async function deleteHabitCategory(
  id: number,
): Promise<CategoryActionState> {
  try {
    await prisma.habitCategory.delete({
      where: { id },
    });

    revalidateCategoryPaths();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: getCategoryActionError(error, "Habit") };
  }
}
