"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AccountType, Prisma } from "@/app/generated/prisma/client";
import { currencySchema, MAX_STRING_FIELD_LENGTH } from "@/lib/constants";
import { toMoneyDecimal } from "@/lib/money";

export type AccountActionState = {
  ok: boolean;
  message?: string;
};

export type AccountDeleteSummary = {
  transactionCount: number;
  budgetItemCount: number;
  investmentSnapshotCount: number;
};

const accountCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(MAX_STRING_FIELD_LENGTH, "Name must be 255 characters or fewer"),
  balance: currencySchema,
  type: z.enum(AccountType),
});

const accountUpdateSchema = accountCreateSchema.omit({ balance: true });

function parseCreateAccountForm(formData: FormData) {
  return accountCreateSchema.safeParse({
    name: formData.get("name"),
    balance: formData.get("balance"),
    type: formData.get("type"),
  });
}

function parseUpdateAccountForm(formData: FormData) {
  return accountUpdateSchema.safeParse({
    name: formData.get("name"),
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

    if (error.code === "P2003") {
      return "This account is still used by financial records and cannot be deleted.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function revalidateAccountPaths() {
  revalidatePath("/");
  revalidatePath("/accounts");
  revalidatePath("/insights");
}

export async function createAccount(
  formData: FormData,
): Promise<AccountActionState> {
  const parsed = parseCreateAccountForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ?? "Please check the account details.",
    };
  }

  try {
    await prisma.account.create({
      data: {
        name: parsed.data.name,
        balance: toMoneyDecimal(parsed.data.balance),
        type: parsed.data.type,
      },
    });

    revalidateAccountPaths();
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

export async function updateAccount(
  id: number,
  formData: FormData,
): Promise<AccountActionState> {
  const parsed = parseUpdateAccountForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ?? "Please check the account details.",
    };
  }

  try {
    await prisma.account.update({
      where: { id },
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
      },
    });

    revalidateAccountPaths();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: getAccountActionError(error) };
  }
}

export async function deleteAccount(id: number): Promise<AccountActionState> {
  try {
    const summary = await getAccountDeleteSummary(id);
    const linkedRecordCount =
      summary.transactionCount +
      summary.budgetItemCount +
      summary.investmentSnapshotCount;

    if (linkedRecordCount > 0) {
      return {
        ok: false,
        message:
          `This account has ${summary.transactionCount} transactions, ` +
          `${summary.budgetItemCount} budget items, and ` +
          `${summary.investmentSnapshotCount} investment snapshots. ` +
          "Move or delete those records before deleting the account.",
      };
    }

    await prisma.account.delete({
      where: { id },
    });

    revalidateAccountPaths();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: getAccountActionError(error) };
  }
}

export async function getAccountDeleteSummary(
  id: number,
): Promise<AccountDeleteSummary> {
  const [
    transactionCount,
    budgetItemCount,
    investmentSnapshotCount,
  ] = await Promise.all([
    prisma.transaction.count({
      where: {
        OR: [{ accountId: id }, { transferAccountId: id }],
      },
    }),
    prisma.budgetItem.count({
      where: { accountId: id },
    }),
    prisma.investmentSnapshot.count({
      where: { accountId: id },
    }),
  ]);

  return {
    transactionCount,
    budgetItemCount,
    investmentSnapshotCount,
  };
}
