"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AccountType, Prisma } from "@/app/generated/prisma/client";

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
  return accountSchema.parse({
    name: formData.get("name"),
    balance: formData.get("balance"),
    type: formData.get("type"),
  });
}

export async function createAccount(formData: FormData) {
  const data = parseAccountForm(formData);

  await prisma.account.create({
    data: {
      name: data.name,
      balance: new Prisma.Decimal(data.balance),
      type: data.type,
    },
  });

  revalidatePath("/accounts");
}

export async function updateAccount(id: number, formData: FormData) {
  const data = parseAccountForm(formData);

  await prisma.account.update({
    where: { id },
    data: {
      name: data.name,
      balance: new Prisma.Decimal(data.balance),
      type: data.type,
    },
  });

  revalidatePath("/accounts");
}

export async function deleteAccount(id: number) {
  await prisma.account.delete({
    where: { id },
  });

  revalidatePath("/accounts");
}