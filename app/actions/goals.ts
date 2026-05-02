"use server";

import { GoalType, Prisma } from "@/app/generated/prisma/client";
import { currencySchema, MAX_STRING_FIELD_LENGTH } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { parseUtcDateInput } from "@/lib/utc-date";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type GoalActionState = {
  ok: boolean;
  message?: string;
};

export type GoalMilestoneActionState = GoalActionState;

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
    name: z
      .string()
      .trim()
      .min(1, "Name is required")
      .max(MAX_STRING_FIELD_LENGTH, "Name must be 255 characters or fewer"),
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

const goalMilestoneSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Milestone name is required")
    .max(
      MAX_STRING_FIELD_LENGTH,
      "Milestone name must be 255 characters or fewer",
    ),
  description: z
    .string()
    .trim()
    .max(MAX_STRING_FIELD_LENGTH, "Description must be 255 characters or fewer")
    .optional(),
  deadline: optionalDate,
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

function parseGoalMilestoneForm(formData: FormData) {
  return goalMilestoneSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    deadline: formData.get("deadline"),
  });
}

function parseDeadline(deadline?: string) {
  return parseUtcDateInput(deadline);
}

function getGoalActionError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      return "This goal no longer exists.";
    }

    if (error.code === "P2003") {
      return "This goal still has related records.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function getGoalMilestoneActionError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      return "This milestone no longer exists.";
    }

    if (error.code === "P2003") {
      return "Please choose a valid milestone goal.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function revalidateGoalPaths() {
  revalidatePath("/");
  revalidatePath("/goals");
  revalidatePath("/insights");
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

export async function toggleGoalComplete(
  id: number,
  isComplete: boolean,
): Promise<GoalActionState> {
  try {
    await prisma.goal.update({
      where: { id },
      data: { isComplete },
    });

    revalidateGoalPaths();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: getGoalActionError(error) };
  }
}

export async function deleteGoal(id: number): Promise<GoalActionState> {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.goalMilestone.deleteMany({
        where: { goalId: id },
      });

      await tx.goal.delete({
        where: { id },
      });
    });

    revalidateGoalPaths();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: getGoalActionError(error) };
  }
}

export async function createGoalMilestone(
  goalId: number,
  formData: FormData,
): Promise<GoalMilestoneActionState> {
  const parsed = parseGoalMilestoneForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ??
        "Please check the milestone details.",
    };
  }

  try {
    const goal = await prisma.goal.findUniqueOrThrow({
      where: { id: goalId },
      select: { type: true },
    });

    if (goal.type !== GoalType.milestone) {
      return {
        ok: false,
        message: "Milestones can only be added to milestone goals.",
      };
    }

    await prisma.goalMilestone.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? "",
        deadline: parseDeadline(parsed.data.deadline),
        goalId,
      },
    });

    revalidateGoalPaths();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: getGoalMilestoneActionError(error) };
  }
}

export async function updateGoalMilestone(
  id: number,
  formData: FormData,
): Promise<GoalMilestoneActionState> {
  const parsed = parseGoalMilestoneForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ??
        "Please check the milestone details.",
    };
  }

  try {
    await prisma.goalMilestone.update({
      where: { id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? "",
        deadline: parseDeadline(parsed.data.deadline),
      },
    });

    revalidateGoalPaths();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: getGoalMilestoneActionError(error) };
  }
}

export async function toggleGoalMilestoneComplete(
  id: number,
  isComplete: boolean,
): Promise<GoalMilestoneActionState> {
  try {
    await prisma.goalMilestone.update({
      where: { id },
      data: { isComplete },
    });

    revalidateGoalPaths();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: getGoalMilestoneActionError(error) };
  }
}

export async function deleteGoalMilestone(
  id: number,
): Promise<GoalMilestoneActionState> {
  try {
    await prisma.goalMilestone.delete({
      where: { id },
    });

    revalidateGoalPaths();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: getGoalMilestoneActionError(error) };
  }
}
