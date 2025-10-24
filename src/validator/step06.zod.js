import { z } from "zod";

// Note validator - optional field with skip handling
export const noteSchema = z.string()
  .min(1, "Note is required")
  .max(500, "Note must be less than 500 characters")
  .transform((s) => s.trim())
  .optional();
