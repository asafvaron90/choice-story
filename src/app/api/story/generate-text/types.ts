import { z } from "zod";

// Simple schema for text generation
export const GenerateTextInputSchema = z.object({
  // The prompt to send to the text generation model
  prompt: z.string().min(1, "Prompt must not be empty"),
  
  // Optional parameters
  language: z.enum(["en", "he"]).default("en").optional(),
  userId: z.string().optional(),
  maxTokens: z.number().optional()
}); 