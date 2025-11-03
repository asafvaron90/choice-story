import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import * as Sentry from "@sentry/nextjs";

interface GenerateStoryImagesRequest {
  prompt: string;
  outputCount?: number;
  userId?: string;
  folderPath?: string;
  referenceImageUrl?: string;
}

export async function POST(request: NextRequest) {
  return Sentry.startSpan(
    {
      op: "ai.story_image_generation",
      name: "OpenAI Story Image Generation",
    },
    async (span) => {
      try {
        const body: GenerateStoryImagesRequest = await request.json();
        const { prompt, outputCount = 1, referenceImageUrl } = body;

        if (!prompt) {
          return NextResponse.json(
            { error: "Prompt is required" },
            { status: 400 }
          );
        }

        span.setAttribute("prompt", prompt);
        span.setAttribute("output_count", outputCount);
        span.setAttribute("has_reference", !!referenceImageUrl);

        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });

        // For now, we'll generate images with DALL-E 3
        // Note: DALL-E 3 can only generate 1 image at a time
        const images: string[] = [];
        
        for (let i = 0; i < Math.min(outputCount, 4); i++) {
          try {
            const imageResponse = await openai.images.generate({
              model: "dall-e-3",
              prompt: prompt,
              n: 1,
              size: "1024x1024",
              quality: "hd",
              style: "vivid",
            });

            if (imageResponse.data && imageResponse.data[0]?.url) {
              images.push(imageResponse.data[0].url);
            }
          } catch (imageError) {
            console.error(`Error generating image ${i + 1}:`, imageError);
            // Continue with other images even if one fails
          }
        }

        if (images.length === 0) {
          throw new Error("Failed to generate any images");
        }

        span.setAttribute("images_generated", images.length);
        span.setAttribute("response_status", "success");

        return NextResponse.json({
          success: true,
          images: images,
          count: images.length
        });

      } catch (error) {
        span.setAttribute("response_status", "error");
        Sentry.captureException(error);
        console.error("Story image generation error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        return NextResponse.json(
          { 
            success: false,
            error: `Failed to generate story images: ${errorMessage}`,
            images: [],
            count: 0
          },
          { status: 500 }
        );
      }
    }
  );
}
