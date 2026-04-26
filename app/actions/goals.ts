"use server";

import { GoalType, Prisma } from "@/app/generated/prisma/client";
import { currencySchema } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type GoalActionState = {
  ok: boolean;
  message?: string;
};

const optionalDate = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid deadline")
    .optional(),
);

const optionalCurrency = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  currencySchema.optional(),
);

const goalSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    type: z.enum(GoalType),
    targetAmount: optionalCurrency,
    currentAmount: optionalCurrency,
    deadline: optionalDate,
  })
  .superRefine((goal, context) => {
    if (goal.type !== GoalType.numerical) {
      return;
    }

    if (goal.targetAmount === undefined) {
      context.addIssue({
        code: "custom",
        path: ["targetAmount"],
        message: "Target amount is required",
      });
      return;
    }

    if (goal.targetAmount <= 0) {
      context.addIssue({
        code: "custom",
        path: ["targetAmount"],
        message: "Target amount must be greater than zero",
      });
    }

    if (goal.currentAmount !== undefined && goal.currentAmount < 0) {
      context.addIssue({
        code: "custom",
        path: ["currentAmount"],
        message: "Current amount cannot be negative",
      });
    }
  });

function parseGoalForm(formData: FormData) {
  return goalSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    targetAmount: formData.get("targetAmount"),
    currentAmount: formData.get("currentAmount"),
    deadline: formData.get("deadline"),
  });
}

function parseDeadline(deadline?: string) {
  return deadline ? new Date(`${deadline}T00:00:00`) : null;
}

function getGoalActionError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      return "This goal no longer exists.";
    }
  }

  return "Something went wrong. Please try again.";
}

function revalidateGoalPaths() {
  revalidatePath("/");
  revalidatePath("/goals");
}

function getGoalData(goal: z.infer<typeof goalSchema>) {
  const isNumerical = goal.type === GoalType.numerical;

  return {
    name: goal.name,
    type: goal.type,
    targetAmount: isNumerical
      ? new Prisma.Decimal(goal.targetAmount ?? 0)
      : null,
    currentAmount: isNumerical
      ? new Prisma.Decimal(goal.currentAmount ?? 0)
      : null,
    deadline: parseDeadline(goal.deadline),
  };
}

export async function createGoal(
  formData: FormData,
): Promise<GoalActionState> {
  const parsed = parseGoalForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ?? "Please check the goal details.",
    };
  }

  try {
    await prisma.goal.create({
      data: getGoalData(parsed.data),
    });

    revalidateGoalPaths();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: getGoalActionError(error) };
  }
}

export async function getGoals() {
  return prisma.goal.findMany({
    orderBy: { id: "asc" },
    include: {
      milestones: {
        orderBy: { id: "asc" },
      },
    },
  });
}

export async function updateGoal(
  id: number,
  formData: FormData,
): Promise<GoalActionState> {
  const parsed = parseGoalForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ?? "Please check the goal details.",
    };
  }

  try {
    await prisma.goal.update({
      where: { id },
      data: getGoalData(parsed.data),
    });

    revalidateGoalPaths();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: getGoalActionError(error) };
  }
}

export async function deleteGoal(id: number): Promise<GoalActionState> {
  try {
    await prisma.goal.delete({
      where: { id },
    });

    revalidateGoalPaths();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: getGoalActionError(error) };
  }
}
