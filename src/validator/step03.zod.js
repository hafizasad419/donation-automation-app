import { z } from "zod";

// Phone number validator
export const phoneNumberSchema = z.string()
  .min(1, "Phone number is required")
  .transform((s) => {
    // Remove all non-digit characters
    return s.replace(/\D/g, "");
  })
  .refine((s) => s.length === 10, {
    message: "Phone number must be exactly 10 digits"
  })
  .refine((s) => /^\d{10}$/.test(s), {
    message: "Phone number must contain only digits"
  })
  .transform((s) => {
    // Format as XXX-XXX-XXXX
    return `${s.slice(0, 3)}-${s.slice(3, 6)}-${s.slice(6)}`;
  });
