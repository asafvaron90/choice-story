import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function GET(request: NextRequest) {
  try {
    console.log("Testing OpenAI API connection...");
    
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY environment variable is not set" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Test with a simple completion first
    console.log("Testing simple completion...");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Hello, can you respond with just 'API working'?" }],
      max_tokens: 10
    });
    
    console.log("Simple completion successful:", completion.choices[0].message.content);
    
    return NextResponse.json({
      success: true,
      message: "OpenAI API connection working",
      completion: completion.choices[0].message.content
    });
    
  } catch (error) {
    console.error("OpenAI API test error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `OpenAI API test failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
