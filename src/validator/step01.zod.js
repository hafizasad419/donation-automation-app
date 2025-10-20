import { z } from "zod";

// Congregation/Organization name validator
export const congregationSchema = z.string()
  .min(1, "Congregation name is required")
  .transform((s) => {
    // Normalize common prefixes and clean up
    let cleaned = s
      .replace(/^(the|congregation|organization|org|church|synagogue|temple|shul)\s*/i, "")
      .replace(/\s+/g, " ")
      .trim();
    
    // Capitalize first letter of each word
    cleaned = cleaned.replace(/\b\w/g, l => l.toUpperCase());
    
    return cleaned;
  })
  .refine((s) => s.length >= 2, {
    message: "Congregation name must be at least 2 characters long"
  })
  .refine((s) => /^[a-zA-Z\s\-'\.]+$/.test(s), {
    message: "Congregation name can only contain letters, spaces, hyphens, apostrophes, and periods"
  });
