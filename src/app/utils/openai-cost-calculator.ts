/**
 * OpenAI Cost Calculator
 * Calculate costs for OpenAI API usage based on official pricing
 * Pricing as of 2024: https://openai.com/pricing
 */

export interface OpenAICostBreakdown {
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  model: string;
}

// Pricing per 1M tokens (in USD)
const PRICING = {
  // GPT-4o models
  'gpt-4o': {
    input: 2.50,  // $2.50 per 1M input tokens
    output: 10.00  // $10.00 per 1M output tokens
  },
  'gpt-4o-mini': {
    input: 0.150,  // $0.150 per 1M input tokens
    output: 0.600  // $0.600 per 1M output tokens
  },
  // GPT-4 models
  'gpt-4': {
    input: 30.00,  // $30.00 per 1M input tokens
    output: 60.00  // $60.00 per 1M output tokens
  },
  'gpt-4-turbo': {
    input: 10.00,  // $10.00 per 1M input tokens
    output: 30.00  // $30.00 per 1M output tokens
  },
  // GPT-3.5 models
  'gpt-3.5-turbo': {
    input: 0.50,   // $0.50 per 1M input tokens
    output: 1.50   // $1.50 per 1M output tokens
  },
  // DALL-E models
  'dall-e-3': {
    // Standard quality: $0.040 per image (1024×1024)
    // HD quality: $0.080 per image (1024×1024)
    standard: 0.040,
    hd: 0.080
  },
  'dall-e-2': {
    // $0.020 per image (1024×1024)
    standard: 0.020
  }
} as const;

/**
 * Calculate cost for text generation (GPT models)
 */
export function calculateTextGenerationCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): OpenAICostBreakdown {
  const modelKey = model as keyof typeof PRICING;
  const pricing = PRICING[modelKey] || PRICING['gpt-4o-mini'];

  if ('input' in pricing) {
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    const totalCost = inputCost + outputCost;

    return {
      inputTokens,
      outputTokens,
      inputCost,
      outputCost,
      totalCost,
      model
    };
  }

  // Fallback for non-text models
  return {
    inputTokens,
    outputTokens,
    inputCost: 0,
    outputCost: 0,
    totalCost: 0,
    model
  };
}

/**
 * Calculate cost for image generation (DALL-E models)
 */
export function calculateImageGenerationCost(
  model: 'dall-e-3' | 'dall-e-2',
  quality: 'standard' | 'hd' = 'standard',
  count: number = 1
): number {
  const pricing = PRICING[model];
  
  if (!pricing) {
    console.warn(`[Cost Calculator] Unknown model: ${model}, using DALL-E-3 standard pricing`);
    return PRICING['dall-e-3'].standard * count;
  }

  if (model === 'dall-e-3' && quality === 'hd') {
    return PRICING['dall-e-3'].hd * count;
  }

  return pricing.standard * count;
}

/**
 * Estimate cost for text based on approximate token count
 * Rule of thumb: 1 token ≈ 4 characters (or ~0.75 words)
 */
export function estimateTextCost(
  model: string,
  inputText: string,
  outputText: string
): OpenAICostBreakdown {
  // Rough estimation: 1 token ≈ 4 characters
  const inputTokens = Math.ceil(inputText.length / 4);
  const outputTokens = Math.ceil(outputText.length / 4);

  return calculateTextGenerationCost(model, inputTokens, outputTokens);
}

/**
 * Calculate total story creation cost
 */
export function calculateStoryCreationCost(breakdown: {
  titleGeneration?: OpenAICostBreakdown;
  storyTextGeneration?: OpenAICostBreakdown;
  imageGenerations?: number[];
}): number {
  let total = 0;

  if (breakdown.titleGeneration) {
    total += breakdown.titleGeneration.totalCost;
  }

  if (breakdown.storyTextGeneration) {
    total += breakdown.storyTextGeneration.totalCost;
  }

  if (breakdown.imageGenerations) {
    total += breakdown.imageGenerations.reduce((sum, cost) => sum + cost, 0);
  }

  return total;
}

/**
 * Format cost for display (in USD)
 */
export function formatCost(cost: number): string {
  if (cost === 0) return '$0.00';
  if (cost < 0.01) return '<$0.01';
  return `$${cost.toFixed(3)}`;
}

/**
 * Extract token usage from OpenAI API response
 */
export function extractTokenUsage(response: any): {
  inputTokens: number;
  outputTokens: number;
} {
  try {
    // OpenAI API response format
    if (response?.usage) {
      return {
        inputTokens: response.usage.prompt_tokens || 0,
        outputTokens: response.usage.completion_tokens || 0
      };
    }

    // If no usage data, return zeros
    return {
      inputTokens: 0,
      outputTokens: 0
    };
  } catch (error) {
    console.warn('[Cost Calculator] Error extracting token usage:', error);
    return {
      inputTokens: 0,
      outputTokens: 0
    };
  }
}



