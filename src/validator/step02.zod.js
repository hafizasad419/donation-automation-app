import { z } from "zod";

// Person name validator
export const personNameSchema = z.string()
  .min(1, "Person name is required")
  .transform((s) => {
    // Normalize common prefixes and clean up
    let cleaned = s
      .replace(/^(my name is|i am|i'm|name is|this is|hi,?\s*my name is|hello,?\s*my name is)\s*/i, "")
      .replace(/\s+/g, " ")
      .trim();
    
    // Capitalize first letter of each word
    cleaned = cleaned.replace(/\b\w/g, l => l.toUpperCase());
    
    return cleaned;
  })
  .refine((s) => s.length >= 2, {
    message: "Person name must be at least 2 characters long"
  })
  .refine((s) => /^[a-zA-Z\s\-'\.]+$/.test(s), {
    message: "Person name can only contain letters, spaces, hyphens, apostrophes, and periods"
  })
  .refine((s) => s.split(' ').length >= 2, {
    message: "Please provide both first and last name"
  });
