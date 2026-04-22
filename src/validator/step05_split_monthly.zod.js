import { z } from "zod";

export const splitMonthlyCountSchema = z.coerce
  .number()
  .int("Please send a whole number.")
  .min(2, "Please send a number between 2 and 24.")
  .max(24, "Please send a number between 2 and 24.");
