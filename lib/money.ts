import { Prisma } from "../app/generated/prisma/client";

export const MONEY_DECIMAL_PLACES = 2;

type MoneyInput = string | number | Prisma.Decimal;

export function toMoneyDecimal(value: MoneyInput) {
  return new Prisma.Decimal(value).toDecimalPlaces(MONEY_DECIMAL_PLACES);
}
