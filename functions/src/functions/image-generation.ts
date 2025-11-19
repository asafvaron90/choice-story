import * as functions from "firebase-functions/v1";
import { generateImage } from "../image-generation";

/**
 * OpenAI Image Generation - Callable Function
 * Generate image using OpenAI
 * 
 * Request body:
 * {
 *   "prompt": {
 *     "id": "prompt_id"
 *   },
 *   "input": [
 *     {
 *       "role": "user",
 *       "content": [
 *         {"type": "input_text", "text": "text here"},
 *         {"type": "input_image", "image_url": "url here"}
 *       ]
 *     }
 *   ]
 * }
 */
export const generateImageFunction = functions.runWith({
  timeoutSeconds: 540,
  memory: '2GB'
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

      // Generate image (returns base64)
      const base64Image = await generateImage({ prompt, input });

      return {
        success: true,
        base64: base64Image,
      };
    } catch (error) {
      functions.logger.error("Error generating image:", error);
      throw new functions.https.HttpsError(
        "internal",
        `Failed to generate image: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

