import { z } from "zod";

// Amount validator
export const amountSchema = z.string()
  .min(1, "Donation amount is required")
  .transform((s) => {
    // Remove currency symbols and normalize
    let cleaned = s
      .replace(/[$,\s]/g, "")
      .replace(/^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion)/i, "")
      .trim();
    
    // Extract numbers from text like "one hundred twenty five"
    const numberWords = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
      'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
      'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19,
      'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
      'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
      'hundred': 100, 'thousand': 1000, 'million': 1000000
    };
    
    // Simple word-to-number conversion (basic cases)
    const words = s.toLowerCase().split(/\s+/);
    let numberFromWords = 0;
    let currentNumber = 0;
    
    for (const word of words) {
      if (numberWords[word]) {
        if (numberWords[word] >= 100) {
          currentNumber *= numberWords[word];
          numberFromWords += currentNumber;
          currentNumber = 0;
        } else {
          currentNumber += numberWords[word];
        }
      }
    }
    numberFromWords += currentNumber;
    
    if (numberFromWords > 0) {
      return numberFromWords.toString();
    }
    
    return cleaned;
  })
  .refine((s) => /^\d+(\.\d{1,2})?$/.test(s), {
    message: "Please enter a valid amount (e.g., 125, 125.50)"
  })
  .transform((s) => {
    // Convert to number and format
    const num = parseFloat(s);
    return {
      raw: s,
      formatted: `$${num.toFixed(2)}`,
      numeric: num
    };
  });
