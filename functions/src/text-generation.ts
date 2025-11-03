import * as functions from 'firebase-functions/v1';

/**
 * Text Generation Request Body
 */
export interface TextGenerationRequest {
  prompt: {
    id: string;
    variables?: Record<string, string | number | boolean>;
  };
  input: string;
}

/**
 * Generate text using OpenAI Responses API
 * @param request - The text generation request
 * @returns The generated text content
 */
export async function generateText(
  request: TextGenerationRequest
): Promise<string> {
  try {
    // Get API key from Firebase Functions config
    const apiKey = process.env.OPENAI_API_KEY || 
                   (typeof functions !== 'undefined' ? functions.config().openai?.api_key : undefined);
    
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }

    // Make POST request to OpenAI Responses API
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: {
          id: request.prompt.id,
          variables: request.prompt.variables,
        },
        input: request.input,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`
      );
    }

    const data = await response.json();

    // Log the response structure for debugging
    console.log("OpenAI API response structure:", JSON.stringify(data, null, 2));

    // Extract text from response: output[0].content[0].text
    if (
      data.output &&
      Array.isArray(data.output) &&
      data.output.length > 0 &&
      data.output[0] &&
      data.output[0].content &&
      Array.isArray(data.output[0].content) &&
      data.output[0].content.length > 0 &&
      data.output[0].content[0] &&
      data.output[0].content[0].text &&
      typeof data.output[0].content[0].text === 'string' &&
      data.output[0].content[0].text.trim().length > 0
    ) {
      return data.output[0].content[0].text;
    }

    // Provide detailed error information
    throw new Error(`No valid text content found in response. Response structure: ${JSON.stringify(data, null, 2)}`);
  } catch (error) {
    console.error("Error generating text:", error);
    throw new Error(
      `Failed to generate text: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

