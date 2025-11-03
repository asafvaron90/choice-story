import { z } from "zod";

// Updated input validation schemas with more flexibility
export const GenerateImageInputSchema = z.object({
  // Core user identification fields
  userId: z.string().optional(),
  kidId: z.string().optional(),
  
  // The prompt to send directly to the image generation model
  prompt: z.string(),
  
  // Number of images to generate
  outputCount: z.number().min(1).max(4).default(1),
  
  // Reference image URL to base generation on
  referenceImageUrl: z.string().optional(),
  
  // Folder path for organizing images in Firebase Storage
  folderPath: z.string().optional(),
  
  // Additional parameters for image generation
  parameters: z.record(z.any()).optional()
});

// Export the TypeScript type inferred from the schema
export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;

// Define the response schema
export const GenerateImageResponseSchema = z.object({
  imageUrls: z.array(z.string()),
  originalUrls: z.array(z.string()).optional(),
  info: z.record(z.unknown()).optional()
});

// Export the response type
export type GenerateImageResponse = z.infer<typeof GenerateImageResponseSchema>;
