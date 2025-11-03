import OpenAI from "openai";
import * as Sentry from "@sentry/nextjs";
import { ensurePromptLength } from "@/app/utils/prompt-summarizer";

/**
 * Simple OpenAI client utility
 */
export class OpenAIClient {
  private static instance: OpenAI | null = null;

  /**
   * Get singleton OpenAI instance
   */
  private static getClient(): OpenAI {
    if (!this.instance) {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY environment variable is not set");
      }
      
      this.instance = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    return this.instance;
  }


  /**
   * Generate an image using AI bot with reference image
   */
  static async generateImageWithReference(
    prompt: string, 
    referenceImageUrl: string,
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<string> {
    return Sentry.startSpan(
      {
        op: "ai.image_generation_with_reference",
        name: "AI Bot Image Generation with Reference",
      },
      async (span) => {
        try {
          const client = this.getClient();
          
          const {
            model = "gpt-4o-mini",
            maxTokens = 500,
            temperature = 0.7
          } = options;

          console.log("=== AI BOT WITH REFERENCE IMAGE ===");
          console.log("Model:", model);
          console.log("Prompt:", prompt);
          console.log("Reference Image URL:", referenceImageUrl);
          console.log("Max Tokens:", maxTokens);
          console.log("Temperature:", temperature);

          span.setAttribute("model", model);
          span.setAttribute("max_tokens", maxTokens);
          span.setAttribute("temperature", temperature);
          span.setAttribute("has_reference_image", true);

          const requestPayload = {
            model,
            messages: [
              {
                role: "user" as const,
                content: [
                  {
                    type: "text" as const,
                    text: prompt
                  },
                  {
                    type: "image_url" as const,
                    image_url: {
                      url: referenceImageUrl
                    }
                  }
                ]
              }
            ],
            max_tokens: maxTokens,
            temperature,
          };

          console.log("OpenAI API Request Payload:", JSON.stringify(requestPayload, null, 2));

          const response = await client.chat.completions.create(requestPayload);

          const content = response.choices[0]?.message?.content;
          if (!content) {
            throw new Error("No content in OpenAI response");
          }

          span.setAttribute("response_status", "success");
          return content;

        } catch (error) {
          span.setAttribute("response_status", "error");
          console.error("OpenAI image generation with reference error:", error);
          Sentry.captureException(error);
          throw error;
        }
      }
    );
  }

  /**
   * Generate response using custom AI bot
   */
  static async generateWithBot(
    botId: string,
    botVersion: string,
    prompt: string,
    imageUrl?: string
  ): Promise<string> {
    return Sentry.startSpan(
      {
        op: "ai.bot_generation",
        name: "Custom AI Bot Generation",
      },
      async (span) => {
        try {
          const client = this.getClient();
          
          span.setAttribute("bot_id", botId);
          span.setAttribute("bot_version", botVersion);
          span.setAttribute("has_image", !!imageUrl);

          // Include image URL in prompt if provided
          const finalPrompt = imageUrl ? `image_url: ${imageUrl}\n${prompt}` : prompt;

          console.log("=== CUSTOM AI BOT GENERATION ===");
          console.log("Bot ID:", botId);
          console.log("Bot Version:", botVersion);
          console.log("Final Prompt:", finalPrompt);

          const requestPayload: any = {
            prompt: {
              id: botId,
              version: botVersion,
              output: [
                {
                  type: "output_text",
                  content: finalPrompt
                }
              ]
            }
          };

          console.log("AI Bot API Request Payload:", JSON.stringify(requestPayload, null, 2));

          const response = await (client as any).responses.create(requestPayload);

          const content = response.data?.[0]?.content || response.content;
          if (!content) {
            throw new Error("No content in AI bot response");
          }

          span.setAttribute("response_status", "success");
          return content;

        } catch (error) {
          span.setAttribute("response_status", "error");
          console.error("AI bot generation error:", error);
          Sentry.captureException(error);
          throw error;
        }
      }
    );
  }

  /**
   * Generate text using GPT
   */
  static async generateText(
    prompt: string, 
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<string> {
    return Sentry.startSpan(
      {
        op: "ai.text_generation",
        name: "GPT Text Generation",
      },
      async (span) => {
        try {
          const client = this.getClient();
          
          const {
            model = "gpt-4o-mini",
            maxTokens = 500,
            temperature = 0.7
          } = options;

          span.setAttribute("model", model);
          span.setAttribute("max_tokens", maxTokens);
          span.setAttribute("temperature", temperature);

          const response = await client.chat.completions.create({
            model,
            messages: [
              {
                role: "user" as const,
                content: prompt
              }
            ],
            max_tokens: maxTokens,
            temperature,
          });

          const content = response.choices[0]?.message?.content;
          if (!content) {
            throw new Error("No content in OpenAI response");
          }

          span.setAttribute("response_status", "success");
          return content;

        } catch (error) {
          span.setAttribute("response_status", "error");
          console.error("OpenAI text generation error:", error);
          Sentry.captureException(error);
          throw error;
        }
      }
    );
  }
}
