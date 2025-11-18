/**
 * Image Generation Request Body
 */
export interface ImageGenerationRequest {
  prompt: {
    id: string;
    variables?: Record<string, any>; // Optional variables for the prompt
  };
  input: Array<{
    role: string;
    content: Array<{
      type: string;
      text?: string;
      image_url?: string;
    }>;
  }>;
}

/**
 * Generate image using OpenAI Responses API
 * @param request - The image generation request
 * @returns The base64 encoded image
 */
export async function generateImage(
  request: ImageGenerationRequest
): Promise<string> {
  try {
    // Get API key from environment variables
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }

    // Make POST request to OpenAI Responses API
    const requestBody: any = {
      prompt: {
        id: request.prompt.id,
      },
      input: request.input,
    };

    // Add variables if provided
    if (request.prompt.variables) {
      requestBody.prompt.variables = request.prompt.variables;
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData: any = await response.json().catch(() => ({}));
      throw new Error(
        `OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`
      );
    }

    const data: any = await response.json();

    // Extract base64 from response: find image_generation_call in output array
    if (data.output && Array.isArray(data.output)) {
      const imageGenerationOutput = data.output.find(
        (item: any) => item.type === "image_generation_call"
      );

      if (imageGenerationOutput && imageGenerationOutput.result) {
        return imageGenerationOutput.result;
      }
    }

    throw new Error("No image result found in response");
  } catch (error) {
    console.error("Error generating image:", error);
    throw new Error(
      `Failed to generate image: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

