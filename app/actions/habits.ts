"use server";

import { Prisma } from "@/app/generated/prisma/client";
import { MAX_STRING_FIELD_LENGTH } from "@/lib/constants";
import { calculateHabitStreak } from "@/lib/habit-streak";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type HabitActionState = {
  ok: boolean;
  message?: string;
};

const habitSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required")
      .max(MAX_STRING_FIELD_LENGTH, "Name must be 255 characters or fewer"),
    categoryId: z.coerce.number().int().positive("Category is required"),
    schedule: z.string().trim().min(1, "Schedule is required"),
  })
  .superRefine((habit, context) => {
    if (habit.schedule === "daily" || habit.schedule === "monthly") {
      return;
    }

    const frequency = getWeeklyFrequency(habit.schedule);

    if (frequency >= 1 && frequency <= 7) {
      return;
    }

    context.addIssue({
      code: "custom",
      path: ["schedule"],
      message: "Choose a valid schedule",
    });
  });

function parseHabitForm(formData: FormData) {
  return habitSchema.safeParse({
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
    schedule: formData.get("schedule"),
  });
}

function getWeeklyFrequency(schedule: string) {
  if (!schedule.startsWith("weekly-")) {
    return Number.NaN;
  }

  return Number(schedule.replace("weekly-", ""));
}

function getHabitScheduleData(schedule: string) {
  if (schedule === "daily") {
    return {
      isDaily: true,
      frequency: null,
    };
  }

  if (schedule === "monthly") {
    return {
      isDaily: false,
      frequency: null,
    };
  }

  return {
    isDaily: false,
    frequency: getWeeklyFrequency(schedule),
  };
}

function getHabitActionError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      return "This habit no longer exists.";
    }

    if (error.code === "P2003") {
      return "Please choose a valid habit category.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function revalidateHabitPaths() {
  revalidatePath("/");
  revalidatePath("/habits");
}

export async function createHabit(
  formData: FormData,
): Promise<HabitActionState> {
  const parsed = parseHabitForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ?? "Please check the habit details.",
    };
  }

  try {
    const schedule = getHabitScheduleData(parsed.data.schedule);

    await prisma.habit.create({
      data: {
        name: parsed.data.name,
        categoryId: parsed.data.categoryId,
        isDaily: schedule.isDaily,
        frequency: schedule.frequency,
      },
    });

    revalidateHabitPaths();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: getHabitActionError(error) };
  }
}

export async function getHabits() {
  return prisma.habit.findMany({
    orderBy: { id: "asc" },
    include: {
      category: true,
    },
  });
}

export async function updateHabit(
  id: number,
  formData: FormData,
): Promise<HabitActionState> {
  const parsed = parseHabitForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ?? "Please check the habit details.",
    };
  }

  try {
    const schedule = getHabitScheduleData(parsed.data.schedule);

    await prisma.$transaction(async (tx) => {
      const completions = await tx.habitCompletion.findMany({
        where: { habitId: id },
        select: { date: true },
      });

      await tx.habit.update({
        where: { id },
        data: {
          name: parsed.data.name,
          categoryId: parsed.data.categoryId,
          isDaily: schedule.isDaily,
          frequency: schedule.frequency,
          streak: calculateHabitStreak(schedule, completions),
        },
      });
    });

    revalidateHabitPaths();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: getHabitActionError(error) };
  }
}

export async function deleteHabit(id: number): Promise<HabitActionState> {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.habitCompletion.deleteMany({
        where: { habitId: id },
      });

      await tx.habit.delete({
        where: { id },
      });
    });

    revalidateHabitPaths();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: getHabitActionError(error) };
  }
}
