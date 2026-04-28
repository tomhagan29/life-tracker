import { z } from "zod";

export const MAX_STRING_FIELD_LENGTH = 255;

export const currencySchema = z
  .string()
  .trim()
  .regex(/^-?\d+(\.\d{1,2})?$/, "Must be a number with up to 2 decimal places")
  .transform((val) => Number(val));
