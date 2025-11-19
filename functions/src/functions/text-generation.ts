import * as functions from "firebase-functions/v1";
import { generateText } from "../text-generation";

/**
 * OpenAI Text Generation - Callable Function
 * Generate text using OpenAI
 * 
 * Request body:
 * {
 *   "prompt": {
 *     "id": "prompt_id"
 *   },
 *   "input": "Your input text here"
 * }
 */
export const generateTextFunction = functions.runWith({
  timeoutSeconds: 540,
  memory: '1GB'
}).https.onCall(
  async (data, context) => {
    // Check if user is authenticated
    if (!context?.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
      );
    }

    try {
      const { prompt, input } = data;

      if (!prompt?.id || !input) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "prompt.id and input are required"
        );
      }

      const result = await generateText({ prompt, input });

      return {
        success: true,
        text: result,
      };
    } catch (error) {
      functions.logger.error("Error generating text:", error);
      throw new functions.https.HttpsError(
        "internal",
        `Failed to generate text: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

