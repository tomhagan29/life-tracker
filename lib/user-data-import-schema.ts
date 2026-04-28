import { AccountType, GoalType } from "@/app/generated/prisma/enums";
import { MAX_STRING_FIELD_LENGTH } from "@/lib/constants";
import { z } from "zod";

export const MAX_IMPORT_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const decimalStringSchema = z.union([z.string().min(1), z.number()]).transform(String);
const nullableDateSchema = z.string().datetime().nullable();
const nullablePositiveIdSchema = z.number().int().positive().nullable().optional();
const boundedStringSchema = z
  .string()
  .max(MAX_STRING_FIELD_LENGTH, "Must be 255 characters or fewer");
const boundedRequiredStringSchema = boundedStringSchema.min(1);

export const importDataSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().optional(),
  data: z.object({
    financeCategories: z.array(
      z.object({
        id: z.number().int().positive(),
        name: boundedRequiredStringSchema,
      }),
    ),
    habitCategories: z.array(
      z.object({
        id: z.number().int().positive(),
        name: boundedRequiredStringSchema,
      }),
    ),
    accounts: z.array(
      z.object({
        id: z.number().int().positive(),
        name: boundedRequiredStringSchema,
        balance: decimalStringSchema,
        type: z.enum(AccountType),
      }),
    ),
    transactions: z.array(
      z.object({
        id: z.number().int().positive(),
        date: z.string().datetime(),
        amount: decimalStringSchema,
        categoryId: nullablePositiveIdSchema,
        accountId: z.number().int().positive(),
        transferAccountId: nullablePositiveIdSchema,
      }),
    ),
    habits: z.array(
      z.object({
        id: z.number().int().positive(),
        name: boundedRequiredStringSchema,
        categoryId: z.number().int().positive(),
        streak: z.number().int().min(0),
        isDaily: z.boolean(),
        frequency: z.number().int().min(1).max(7).nullable(),
      }),
    ),
    habitCompletions: z
      .array(
        z.object({
          id: z.number().int().positive(),
          date: z.string().datetime(),
          habitId: z.number().int().positive(),
        }),
      )
      .optional()
      .default([]),
    budgetItems: z.array(
      z.object({
        id: z.number().int().positive(),
        name: boundedRequiredStringSchema,
        amount: decimalStringSchema,
        dueDay: z.number().int().min(1).max(31).nullable(),
        categoryId: z.number().int().positive(),
        accountId: z.number().int().positive(),
      }),
    ),
    goals: z.array(
      z.object({
        id: z.number().int().positive(),
        name: boundedRequiredStringSchema,
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
        name: boundedRequiredStringSchema,
        description: boundedStringSchema.optional().default(""),
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
        content: boundedStringSchema,
        checkInId: z.number().int().positive(),
      }),
    ),
  }),
});
