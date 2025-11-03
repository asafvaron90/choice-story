import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: NextRequest) {
  try {
    const { botId, botVersion, prompt } = await request.json();
    
    console.log(`Debug endpoint called with bot ID: ${botId}, version: ${botVersion}, prompt: ${prompt}`);
    
    // TODO: Fix this debug endpoint - responses.create doesn't exist in OpenAI SDK
    // This endpoint is currently broken and needs to be updated to use proper OpenAI API
    return NextResponse.json({
      error: "Debug endpoint needs to be updated - responses.create API doesn't exist in OpenAI SDK",
      botId,
      botVersion,
      prompt
    }, { status: 501 });
    
  } catch (error) {
    console.error("Bot response test error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Bot response test failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
