import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import * as Sentry from "@sentry/nextjs";

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json();
    
    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required" },
        { status: 400 }
      );
    }

    const response = await Sentry.startSpan(
      {
        op: "ai.image_analysis",
        name: "OpenAI Image Analysis",
      },
      async (span) => {
        span.setAttribute("image_url", imageUrl);

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
                text: "Describe the visual characteristics of the person in this image for creating a digital character. Focus on observable features organized by category:\n\n**Hair:** Color (including undertones), texture (straight/wavy/curly), length, thickness, style, highlights/shadows, hairline shape, parting, volume distribution.\n\n**Eyes:** Color (base color, flecks, rings), shape (almond/round), size, spacing, eyelash characteristics, eyelid details, catchlights, gaze direction.\n\n**Skin:** Tone with specific shade, undertones (warm/cool), finish (matte/glowy), texture, visible pores, freckles (size/density), birthmarks, natural flush areas.\n\n**Facial Structure:** Face shape with proportions, cheekbone prominence/angle, jawline specifics, chin shape/protrusion, muscle tension zones.\n\n**Eyebrows:** Shape, thickness, color gradient, grooming style, arch sharpness, distance from eyes.\n\n**Nose:** Length/width relative to face, bridge profile (straight/curved), nostril shape, tip details, shadows/highlights.\n\n**Mouth/Lips:** Shape ratio, fullness, contour, natural color, texture, visible teeth details (count/gaps/alignment), smile characteristics.\n\n**Ears:** Size relative to head, shape, lobe attachment, protrusion angle, surface texture, color consistency.\n\n**Neck/Shoulders:** Length, muscle visibility, clothing neckline details, fabric texture/color under lighting.\n\n**Clothing:** Color accuracy, patterns, texture types, button/collar details, accessories.\n\n**Lighting:** Light source type/direction/intensity, shadow characteristics, highlights on skin/hair, ambient effects.\n\n**Expression:** Emotional indicators, micro-expressions, mood conveyed, engagement level.\n\n**Unique Features:** Any distinctive marks, asymmetries, special characteristics.\n\nage\n\n    Provide detailed information for accurate character representation. return as json only, no extra text or ''' before {}."
                // text: "Analyze this image and return ONLY a JSON object with the visual characteristics. No additional text, explanations, or formatting. Just the raw JSON object.\n\nReturn this exact structure:\n{\n  \"hair\": {\n    \"color\": \"specific color with undertones\",\n    \"texture\": \"straight/wavy/curly\",\n    \"length\": \"length description\",\n    \"thickness\": \"thick/medium/thin\",\n    \"style\": \"style description\"\n  },\n  \"eyes\": {\n    \"color\": \"eye color with details\",\n    \"shape\": \"eye shape\",\n    \"size\": \"relative size\"\n  },\n  \"skin\": {\n    \"tone\": \"skin tone with undertones\",\n    \"texture\": \"texture description\",\n    \"features\": \"freckles, marks, etc\"\n  },\n  \"facialStructure\": {\n    \"faceShape\": \"face shape\",\n    \"cheekbones\": \"prominence description\",\n    \"jawline\": \"jawline description\",\n    \"chin\": \"chin description\"\n  },\n  \"eyebrows\": {\n    \"shape\": \"eyebrow shape\",\n    \"thickness\": \"thickness level\",\n    \"color\": \"eyebrow color\"\n  },\n  \"nose\": {\n    \"shape\": \"nose shape\",\n    \"size\": \"relative size\"\n  },\n  \"mouth\": {\n    \"shape\": \"mouth shape\",\n    \"size\": \"relative size\",\n    \"color\": \"natural lip color\"\n  },\n  \"clothing\": {\n    \"colors\": [\"color1\", \"color2\"],\n    \"style\": \"clothing style\",\n    \"details\": \"specific details\"\n  },\n  \"expression\": {\n    \"mood\": \"emotional state\",\n    \"engagement\": \"engagement level\"\n  },\n  \"uniqueFeatures\": [\"feature1\", \"feature2\"],\n  \"lighting\": {\n    \"type\": \"lighting type\",\n    \"direction\": \"light direction\",\n    \"quality\": \"soft/harsh/natural\"\n  }\n}" 
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

        span.setAttribute("response_status", "success");
        return analysisResponse;
      }
    );

    const rawJsonContent = response.choices[0]?.message?.content;
    
    if (!rawJsonContent) {
      throw new Error("No analysis content received from OpenAI");
    }

    // Parse the JSON content and wrap it in the expected structure
    const analysisData = JSON.parse(rawJsonContent);
    
    return NextResponse.json({
      success: true,
      data: {
        analysis: analysisData
      }
    });

  } catch (error) {
    console.error("Image analysis error:", error);
    Sentry.captureException(error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to analyze image: ${errorMessage}` },
      { status: 500 }
    );
  }
}
