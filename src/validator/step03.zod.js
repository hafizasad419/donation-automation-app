import { z } from "zod";

// Phone number validator
export const phoneNumberSchema = z.string()
  .min(1, "Phone number is required")
  .transform((s) => {
    // Remove all non-digit characters
    return s.replace(/\D/g, "");
  })
  .refine((s) => s.length >= 9, {
    message: "Phone number must have at least 9 digits"
  })
  .refine((s) => /^\d+$/.test(s), {
    message: "Phone number must contain only digits"
  })
  .transform((s) => {
    // If 10 digits, format as XXX-XXX-XXXX
    if (s.length === 10) {
      return `${s.slice(0, 3)}-${s.slice(3, 6)}-${s.slice(6)}`;
    }
    // For other lengths, return as-is
    return s;
  });
