import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { GenerateTextInputSchema } from './types';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Gemini client
const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || (process.env.NODE_ENV === 'production' && typeof window === 'undefined' && !process.env.FIREBASE_PROJECT_ID);

// Only log during runtime, not build time
if (!isBuildTime) {
  // Debug log for API key - showing only first few chars for security
  const keyPreview = apiKey ? `${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 3)}` : 'not set';
  console.log(`[GEMINI_API] Key status: ${apiKey ? 'present' : 'missing'}, Preview: ${keyPreview}, Length: ${apiKey.length}`);

  // Check for missing API key
  if (!apiKey) {
    console.error('[GEMINI_API] No API key found! Make sure NEXT_PUBLIC_GEMINI_API_KEY is set in your environment variables.');
  }
}

const genAI = new GoogleGenerativeAI(apiKey);

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to generate text with retry logic
async function generateTextWithRetry(prompt: string, maxTokens?: number, maxRetries = 3, initialDelay = 1000): Promise<string> {
  let lastError: Error | null = null;
  let attempt = 0;
  
  // Try different models in case of model-specific errors
  const models = ["gemini-1.5-flash", "gemini-pro", "gemini-1.0-pro"];
  let currentModelIndex = 0;

  while (attempt < maxRetries) {
    try {
      // Get the current model to try
      const modelName = models[currentModelIndex];
      console.log(`Attempting to use model: ${modelName} (attempt ${attempt + 1}/${maxRetries})`);
      
      const model = genAI.getGenerativeModel({ model: modelName });
      
      // Set generation config if maxTokens is provided
      // TODO: idan uncomment this responseMimeType to get json response
      const generationConfig = maxTokens ? { maxOutputTokens: maxTokens, /* responseMimeType: 'application/json' */ } : undefined;
      
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig,
      });
      
      return result.response.text().trim();
    } catch (error) {
      lastError = error as Error;
      attempt++;

      console.error(`Text generation attempt ${attempt} failed:`, error);
      
      const errorMessage = (error as Error).message || '';
      
      // Check for authentication/API key issues
      if (
        errorMessage.includes('unregistered callers') || 
        errorMessage.includes('API Key') || 
        errorMessage.includes('authentication') || 
        errorMessage.includes('403')
      ) {
        console.error('[GEMINI_API] Authentication error: Please check your API key');
        // Don't retry for auth errors
        throw new Error('Authentication error with Google Generative AI. Please check your API key configuration.');
      }
      
      // Check if this is a model-specific error (like model not found)
      const isModelError = errorMessage.includes('not found') || 
                           errorMessage.includes('unsupported') || 
                           errorMessage.includes('not supported');
      
      if (isModelError && currentModelIndex < models.length - 1) {
        // Try the next model
        currentModelIndex++;
        console.log(`Switching to next model: ${models[currentModelIndex]}`);
      }

      // If we haven't reached max retries, wait and try again
      if (attempt < maxRetries) {
        // Exponential backoff
        await delay(initialDelay * Math.pow(2, attempt - 1));
        continue;
      }
    }
  }

  // If we get here, all retries failed
  throw new Error(lastError?.message || 'Failed to generate text after multiple attempts');
}

// Helper function to generate text with OpenAI
async function generateTextWithOpenAI(prompt: string, maxTokens?: number): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    });

    return response.choices[0].message?.content?.trim() || '';
  } catch (error) {
    console.error('[OPENAI_API] Error generating text:', error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Parse and validate the request body
    const body = await req.json();
    console.log("[GENERATE_TEXT -- BODY]", JSON.stringify(body, null, 2));
    
    const validatedInput = GenerateTextInputSchema.parse(body);
    console.log("[GENERATE_TEXT -- VALIDATED INPUT]", JSON.stringify(validatedInput, null, 2));

    try {
      // First try with Gemini
      console.log("[GENERATE_TEXT] Attempting generation with Gemini...");
      const generatedText = await generateTextWithRetry(
        validatedInput.prompt,
        validatedInput.maxTokens
      );

      console.log("[GENERATE_TEXT -- RESULT]", generatedText.substring(0, 100) + "...");

      return NextResponse.json({
        success: true,
        text: generatedText,
        provider: 'gemini'
      });
    } catch (error) {
      const geminiError = error as Error;
      console.error("[GENERATE_TEXT -- GEMINI_ERROR]", {
        message: geminiError.message,
        name: geminiError.name,
        stack: geminiError.stack?.split('\n').slice(0, 3).join('\n')
      });

      // Check for authentication errors with Gemini
      const isGeminiAuthError = geminiError.message.includes('Authentication error') || 
                               geminiError.message.includes('API Key') || 
                               geminiError.message.includes('unregistered callers');
      
      if (isGeminiAuthError) {
        return NextResponse.json({
          success: false,
          error: "Authentication Error",
          message: "Failed to authenticate with Gemini AI service. Please check the API key configuration.",
          code: "AUTH_ERROR"
        }, { status: 401 });
      }

      // Try OpenAI as fallback
      try {
        console.log("[GENERATE_TEXT] Gemini failed, attempting generation with OpenAI...");
        const openaiText = await generateTextWithOpenAI(
          validatedInput.prompt,
          validatedInput.maxTokens
        );

        console.log("[GENERATE_TEXT -- OPENAI_RESULT]", openaiText.substring(0, 100) + "...");

        return NextResponse.json({
          success: true,
          text: openaiText,
          provider: 'openai'
        });
      } catch (error) {
        const openaiError = error as Error;
        console.error("[GENERATE_TEXT -- OPENAI_ERROR]", {
          message: openaiError.message,
          name: openaiError.name,
          stack: openaiError.stack?.split('\n').slice(0, 3).join('\n')
        });

        // Check for OpenAI authentication errors
        if (openaiError.message.includes('API key')) {
          return NextResponse.json({
            success: false,
            error: "Authentication Error",
            message: "Failed to authenticate with OpenAI service. Please check the API key configuration.",
            code: "AUTH_ERROR"
          }, { status: 401 });
        }

        // Both services failed
        return NextResponse.json({
          success: false,
          error: "Text generation failed",
          message: "Both Gemini and OpenAI services failed to generate text.",
          details: {
            gemini: geminiError.message,
            openai: openaiError.message
          }
        }, { status: 500 });
      }
    }
  } catch (error) {
    console.error("[GENERATE_TEXT_ERROR]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: "Invalid input",
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

// Ensure this route is only accessible via POST method
export const dynamic = 'force-dynamic'; 