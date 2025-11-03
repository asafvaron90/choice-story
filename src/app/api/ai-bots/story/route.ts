import { NextRequest, NextResponse } from "next/server";
import { OpenAIClient } from "@/app/network/ai-bots/OpenAIClient";
import { ResponseHandler } from "@/app/network/ai-bots/ResponseHandler";
import { BOTS_IDS, BOTS_VERSIONS } from "@/app/network/ai-bots";

export async function POST(request: NextRequest) {
  const { prompt } = await request.json();
  
  if (!prompt) {
    return NextResponse.json(
      ResponseHandler.error("Prompt is required"),
      { status: 400 }
    );
  }

  return ResponseHandler.wrap(async () => {
    console.log("Starting story generation with prompt:", prompt.substring(0, 100) + "...");
    console.log("Bot ID:", BOTS_IDS.FULL_STORY_GENERATION_AI);
    console.log("Bot Version:", BOTS_VERSIONS.FULL_STORY_GENERATION_AI);
    
    // Add timeout handling
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Story generation timeout after 5 minutes")), 300000);
    });
    
    const storyPromise = OpenAIClient.generateWithBot(
      BOTS_IDS.FULL_STORY_GENERATION_AI,
      BOTS_VERSIONS.FULL_STORY_GENERATION_AI,
      prompt
    );
    
    const content = await Promise.race([storyPromise, timeoutPromise]) as string;
    
    // Try to parse as JSON for story generation
    let data: unknown = content;
    try {
      data = JSON.parse(content);
    } catch (_error) {
      console.warn("Failed to parse OpenAI response as JSON, using raw text");
      // If JSON parsing fails, wrap in a basic structure
      data = {
        title: "Generated Story",
        pages: [
          {
            pageNum: 1,
            pageType: "cover",
            text: content,
            imagePrompt: "A colorful children's book cover illustration"
          }
        ]
      };
    }
    
    console.log("Story generation completed successfully");
    return data;
  }, "Failed to generate story").then(result => {
    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 500 });
    }
  });
}
