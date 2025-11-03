import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import * as Sentry from "@sentry/nextjs";

export async function POST(request: NextRequest) {
  return Sentry.startSpan(
    {
      op: "ai.avatar_analysis",
      name: "OpenAI Avatar Analysis Request",
    },
    async (span) => {
      try {
        const { imageUrl } = await request.json();

        if (!imageUrl) {
          return NextResponse.json(
            { error: "Image URL is required" },
            { status: 400 }
          );
        }

        span.setAttribute("avatar_url", imageUrl);

        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });

        const analysisResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{
            role: "user",
            content: [
              { 
                type: "text", 
                text: "Analyze this generated avatar image to create a detailed character description for consistent story illustrations. Focus on the character's visual identity that should be maintained across different scenes:\n\n**Character Identity:** Overall appearance, style, and visual personality of the avatar.\n\n**Hair:** Color, texture, length, style, any distinctive characteristics that define the character.\n\n**Eyes:** Color, shape, size, expression style, any unique eye characteristics.\n\n**Skin:** Tone, texture, any distinctive skin features.\n\n**Facial Features:** Face shape, cheekbones, jawline, chin, any distinctive facial characteristics.\n\n**Eyebrows:** Shape, thickness, color, style.\n\n**Nose:** Size, shape, distinctive features.\n\n**Mouth/Lips:** Shape, size, natural expression style.\n\n**Ears:** Size, shape, any distinctive features.\n\n**Clothing/Style:** What the character is wearing, colors, style, any accessories.\n\n**Art Style:** The artistic rendering style (Pixar-like, cartoon, realistic, etc.), color palette, lighting style.\n\n**Character Personality:** What personality traits are conveyed through the visual design.\n\n**Unique Visual Elements:** Any distinctive features that make this character recognizable.\n\nProvide a comprehensive description that can be used to recreate this exact character in different poses, expressions, and story contexts while maintaining visual consistency." 
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          }],
        });

        const analysis = analysisResponse.choices[0].message.content;
        span.setAttribute("analysis_result", analysis || "No analysis content");

        return NextResponse.json({ success: true, analysis, imageUrl });
      } catch (error) {
        span.setAttribute("response_status", "error");
        Sentry.captureException(error);
        console.error("Error analyzing avatar:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
          { error: `Failed to analyze avatar: ${errorMessage}` },
          { status: 500 }
        );
      }
    }
  );
}
