import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { ImageRequirementsCheckResponse } from '@/app/_lib/services/replicate_api';
import { OPENAI_AGENTS } from '@/lib/openai-agents';

export async function POST(request: NextRequest) {
  return Sentry.startSpan(
    {
      op: "ai.requirements_check",
      name: "OpenAI Image Requirements Check",
    },
    async (span) => {
      try {
        const { imageUrl, expectedGender, expectedAge, name } = await request.json();

        if (!imageUrl) {
          return NextResponse.json(
            { error: "Image URL is required" },
            { status: 400 }
          );
        }

        span.setAttribute("image_url", imageUrl);
        span.setAttribute("expected_gender", expectedGender || "unknown");
        span.setAttribute("expected_age", expectedAge || "unknown");
        span.setAttribute("name", name || "unknown");

        // Check API key - try multiple sources like Firebase functions do
        let apiKey: string | undefined = process.env.OPENAI_API_KEY;
        
        // Add fallback for different environment variable names
        if (!apiKey) {
          apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
        }
        
        if (!apiKey) {
          throw new Error("OPENAI_API_KEY is not set");
        }

        console.log("Using IMAGE_VALIDATOR_TEXT agent:", OPENAI_AGENTS.IMAGE_VALIDATOR_TEXT);
        console.log("API key present:", !!apiKey);
        console.log("API key preview:", apiKey ? `${apiKey.substring(0, 10)}...` : 'not set');

        const requestBody = {
          prompt: {
            id: OPENAI_AGENTS.IMAGE_VALIDATOR_TEXT,
            variables: {
              image_url: imageUrl,
            }
          },
        };

        const requestHeaders = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        };
        

        // Use the new IMAGE_VALIDATOR_TEXT agent with the correct format
        const response = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: requestHeaders,
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("OpenAI API error response:", {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            errorData: errorData
          });
          
          // More specific error handling for different status codes
          if (response.status === 401) {
            console.error("Authentication failed - API key issue:", {
              hasApiKey: !!apiKey,
              apiKeyLength: apiKey?.length,
              apiKeyPrefix: apiKey ? apiKey.substring(0, 20) : 'none'
            });
          }
          
          throw new Error(
            `OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`
          );
        }

        const data = await response.json();
        
        // Extract text from response: output[0].content[0].text
        let analysisText: string;
        if (
          data.output &&
          data.output[0] &&
          data.output[0].content &&
          data.output[0].content[0] &&
          data.output[0].content[0].text
        ) {
          analysisText = data.output[0].content[0].text;
        } else {
          throw new Error("No text content found in response");
        }

        // Parse the JSON response
        let requirements: ImageRequirementsCheckResponse;
        try {
          // Clean up the response to extract JSON
          const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            requirements = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error("No JSON found in response");
          }
        } catch (parseError) {
          console.error("Error parsing requirements JSON:", parseError);
          console.log("Raw response:", analysisText);
          
          // Fallback response
          requirements = {
            isValid: false,
            issues: ["Failed to analyze image requirements properly"],
            validations: {
              facePosition: { isValid: false, details: "Analysis failed", confidence: 0 },
              singleSubject: { isValid: false, details: "Analysis failed", confidence: 0 },
              faceVisibility: { isValid: false, details: "Analysis failed", confidence: 0 },
              imageQuality: { isValid: false, details: "Analysis failed", confidence: 0 }
            },
            recommendations: ["Please try uploading a different photo with a clear, well-lit face that is centered in the frame."]
          };
        }

        span.setAttribute("requirements_valid", requirements.isValid);
        span.setAttribute("response_status", "success");

        return NextResponse.json(requirements);

      } catch (error) {
        span.setAttribute("response_status", "error");
        Sentry.captureException(error);
        console.error("Requirements check error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        // Return a structured error response that matches the expected format
        const errorResponse: ImageRequirementsCheckResponse = {
          isValid: false,
          issues: [`API error: ${errorMessage}`],
          validations: {
            facePosition: { isValid: false, details: "Analysis failed due to API error", confidence: 0 },
            singleSubject: { isValid: false, details: "Analysis failed due to API error", confidence: 0 },
            faceVisibility: { isValid: false, details: "Analysis failed due to API error", confidence: 0 },
            imageQuality: { isValid: false, details: "Analysis failed due to API error", confidence: 0 }
          },
          recommendations: ["Please try again. If the problem persists, contact support."]
        };

        return NextResponse.json(errorResponse, { status: 500 });
      }
    }
  );
}
