import { z } from "zod";

// Tax ID validator
export const taxIdSchema = z.string()
  .min(1, "Tax ID is required")
  .transform((s) => {
    // Remove all non-digit characters except hyphens
    return s.replace(/[^\d-]/g, "");
  })
  .refine((s) => {
    // Check if it's 9 digits or XX-XXXXXXX format
    const digitsOnly = s.replace(/-/g, "");
    return digitsOnly.length === 9;
  }, {
    message: "Tax ID must be 9 digits (e.g., 123456789 or 12-3456789)"
  })
  .transform((s) => {
    const digitsOnly = s.replace(/-/g, "");
    // Format as XX-XXXXXXX
    return `${digitsOnly.slice(0, 2)}-${digitsOnly.slice(2)}`;
  });
