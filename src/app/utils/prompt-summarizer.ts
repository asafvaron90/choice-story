import { GoogleGenerativeAI } from '@google/generative-ai';
import * as Sentry from "@sentry/nextjs";

/**
 * Maximum character limit for image generation prompts
 */
const MAX_PROMPT_LENGTH = 4000;

/**
 * Initialize Gemini client
 */
function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
  
  if (!apiKey) {
    throw new Error('Gemini API key is not configured. Please add NEXT_PUBLIC_GEMINI_API_KEY to your environment variables.');
  }
  
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Helper function to delay execution for retry logic
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Summarizes a long prompt using Gemini API while preserving important visual elements
 * @param prompt - The original prompt to summarize
 * @param targetLength - Target length for the summarized prompt (default: 3800 to leave buffer)
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Summarized prompt under the character limit
 */
async function summarizePromptWithGemini(
  prompt: string, 
  targetLength: number = 3800, 
  maxRetries: number = 3
): Promise<string> {
  return Sentry.startSpan(
    {
      op: "ai.prompt_summarization",
      name: "Gemini Prompt Summarization",
    },
    async (span) => {
      span.setAttribute("original_length", prompt.length);
      span.setAttribute("target_length", targetLength);

      const genAI = getGeminiClient();
      let lastError: Error | null = null;
      let attempt = 0;
      
      // Try different models in case of model-specific errors
      const models = ["gemini-1.5-flash", "gemini-pro", "gemini-1.0-pro"];
      let currentModelIndex = 0;

      const summarizationPrompt = `You are an expert at condensing children's storybook image generation prompts while preserving character consistency and scene integrity.

TASK: Summarize the following image generation prompt to approximately ${targetLength} characters with ABSOLUTE PRIORITY on character and scene details.

CRITICAL PRESERVATION PRIORITIES (in order):
1. MAIN CHARACTER: Keep EVERY detail about the main character - age, gender, physical appearance, clothing, facial expressions, pose, emotions
2. SCENE SETTING: Preserve the complete scene description - location, environment, background elements, time of day
3. CHARACTER INTERACTIONS: Any interactions with objects, other characters, or environment elements
4. LIGHTING & MOOD: Atmosphere, lighting conditions, emotional tone of the scene
5. ARTISTIC STYLE: Children's book illustration style, art direction, color palette
6. SUPPORTING ELEMENTS: Secondary characters, important objects, props that affect the story

WHAT TO REMOVE/CONDENSE:
- Redundant adjectives and flowery language
- Overly detailed descriptions of minor background elements
- Repetitive phrasing
- Verbose explanations that don't add visual information
- Multiple similar descriptive words (keep the most important one)

MAINTAIN STORY CONSISTENCY: This image must match the character and world established in previous story pages.

ORIGINAL PROMPT (${prompt.length} characters):
${prompt}

Return ONLY the condensed prompt text that maintains character and scene integrity for children's storybook illustration.`;

      while (attempt < maxRetries) {
        try {
          const modelName = models[currentModelIndex];
          console.log(`[Prompt Summarizer] Using model: ${modelName} (attempt ${attempt + 1}/${maxRetries})`);
          
          const model = genAI.getGenerativeModel({ model: modelName });
          
          const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: summarizationPrompt }] }],
            generationConfig: {
              maxOutputTokens: Math.ceil(targetLength / 3), // Rough estimate: 1 token ≈ 3 characters
            },
          });
          
          const summarizedPrompt = result.response.text().trim();
          
          // Validate the result
          if (summarizedPrompt.length <= MAX_PROMPT_LENGTH) {
            span.setAttribute("final_length", summarizedPrompt.length);
            span.setAttribute("compression_ratio", (prompt.length / summarizedPrompt.length));
            span.setAttribute("response_status", "success");
            
            console.log(`[Prompt Summarizer] Successfully summarized: ${prompt.length} → ${summarizedPrompt.length} characters`);
            return summarizedPrompt;
          } else {
            // If still too long, try with a smaller target
            const newTarget = Math.floor(targetLength * 0.8);
            console.log(`[Prompt Summarizer] Result still too long (${summarizedPrompt.length}), retrying with target ${newTarget}`);
            
            if (newTarget < 1000) {
              throw new Error('Unable to summarize prompt to acceptable length');
            }
            
            return summarizePromptWithGemini(prompt, newTarget, 1); // Single retry with smaller target
          }
          
        } catch (error) {
          lastError = error as Error;
          attempt++;

          console.error(`[Prompt Summarizer] Attempt ${attempt} failed:`, error);
          
          const errorMessage = (error as Error).message || '';
          
          // Check for authentication/API key issues
          if (
            errorMessage.includes('unregistered callers') || 
            errorMessage.includes('API Key') || 
            errorMessage.includes('authentication') || 
            errorMessage.includes('403')
          ) {
            span.setAttribute("response_status", "auth_error");
            throw new Error('Authentication error with Gemini API. Please check your API key configuration.');
          }
          
          // Check if this is a model-specific error
          const isModelError = errorMessage.includes('not found') || 
                               errorMessage.includes('unsupported') || 
                               errorMessage.includes('not supported');
          
          if (isModelError && currentModelIndex < models.length - 1) {
            currentModelIndex++;
            console.log(`[Prompt Summarizer] Switching to next model: ${models[currentModelIndex]}`);
          }

          // If we haven't reached max retries, wait and try again
          if (attempt < maxRetries) {
            await delay(1000 * Math.pow(2, attempt - 1)); // Exponential backoff
            continue;
          }
        }
      }

      span.setAttribute("response_status", "error");
      Sentry.captureException(lastError);
      throw new Error(lastError?.message || 'Failed to summarize prompt after multiple attempts');
    }
  );
}

/**
 * Checks if a prompt exceeds the maximum length and summarizes it if necessary
 * PRIORITIZES character consistency and scene details for children's story illustrations
 * @param prompt - The original prompt to check and potentially summarize
 * @returns The original prompt if under limit, or summarized version that preserves character and scene details
 */
export async function ensurePromptLength(prompt: string): Promise<string> {
  // If prompt is within the limit, return as-is
  if (prompt.length <= MAX_PROMPT_LENGTH) {
    console.log(`[Prompt Summarizer] Prompt length OK: ${prompt.length}/${MAX_PROMPT_LENGTH} characters`);
    return prompt;
  }

  console.log(`[Prompt Summarizer] Prompt too long: ${prompt.length}/${MAX_PROMPT_LENGTH} characters, summarizing...`);
  
  try {
    const summarizedPrompt = await summarizePromptWithGemini(prompt);
    console.log(`[Prompt Summarizer] Summarization complete: ${prompt.length} → ${summarizedPrompt.length} characters`);
    return summarizedPrompt;
  } catch (error) {
    console.error('[Prompt Summarizer] Failed to summarize prompt:', error);
    
    // Fallback: Simple truncation with ellipsis
    const truncated = prompt.substring(0, MAX_PROMPT_LENGTH - 3) + '...';
    console.log(`[Prompt Summarizer] Using fallback truncation: ${truncated.length} characters`);
    
    Sentry.captureException(error, {
      extra: {
        originalPromptLength: prompt.length,
        fallbackUsed: true
      }
    });
    
    return truncated;
  }
}

/**
 * Export the maximum prompt length constant for use in other modules
 */
export { MAX_PROMPT_LENGTH };
