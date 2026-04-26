"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AccountType, Prisma } from "@/app/generated/prisma/client";

export type AccountActionState = {
  ok: boolean;
  message?: string;
};

const balanceSchema = z
  .string()
  .trim()
  .regex(/^-?\d+(\.\d{1,2})?$/, "Must be a number with up to 2 decimal places")
  .transform((val) => Number(val));

const accountSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  balance: balanceSchema,
  type: z.enum(AccountType),
});

function parseAccountForm(formData: FormData) {
  return accountSchema.safeParse({
    name: formData.get("name"),
    balance: formData.get("balance"),
    type: formData.get("type"),
  });
}

function getAccountActionError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return "An account with this name already exists.";
    }

    if (error.code === "P2025") {
      return "This account no longer exists.";
    }
  }

  return "Something went wrong. Please try again.";
}

export async function createAccount(formData: FormData): Promise<AccountActionState> {
  const parsed = parseAccountForm(formData);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check the account details." };
  }

  try {
    await prisma.account.create({
      data: {
        name: parsed.data.name,
        balance: new Prisma.Decimal(parsed.data.balance),
        type: parsed.data.type,
      },
    });

    revalidatePath("/accounts");
    return { ok: true };
  } catch (error) {
    return { ok: false, message: getAccountActionError(error) };
  }
}

export async function getAccounts() {
    return await prisma.account.findMany({
        orderBy: { id: "asc" },
    });
}

export async function updateAccount(id: number, formData: FormData): Promise<AccountActionState> {
  const parsed = parseAccountForm(formData);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check the account details." };
  }

  try {
    await prisma.account.update({
      where: { id },
      data: {
        name: parsed.data.name,
        balance: new Prisma.Decimal(parsed.data.balance),
        type: parsed.data.type,
      },
    });

    revalidatePath("/accounts");
    return { ok: true };
  } catch (error) {
    return { ok: false, message: getAccountActionError(error) };
  }
}

export async function deleteAccount(id: number): Promise<AccountActionState> {
  try {
    await prisma.account.delete({
      where: { id },
    });

    revalidatePath("/accounts");
    return { ok: true };
  } catch (error) {
    return { ok: false, message: getAccountActionError(error) };
  }
}
