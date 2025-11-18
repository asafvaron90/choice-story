import * as functions from "firebase-functions/v1";
import { generateText } from "../text-generation";
import { OPENAI_AGENTS } from "../open-ai-agents";

export const generateStoryTitles = functions.runWith({
  timeoutSeconds: 540,
  memory: '1GB'
}).https.onCall(
  async (data, context) => {
    if (!context?.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
      );
    }

    try {
      const { name, gender, problemDescription, age, advantages, disadvantages } = data;

      if (!name || !gender || !problemDescription || !age) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "name, gender, problemDescription, and age are required"
        );
      }

      // Build the input with required fields
      let input = `Name: ${name}
Gender: ${gender}
Problem Description: ${problemDescription}
Age: ${age} years old`;

      // Add optional fields if provided
      if (advantages && advantages.trim()) {
        input += `\nAdvantages: ${advantages}`;
      }

      if (disadvantages && disadvantages.trim()) {
        input += `\nDisadvantages: ${disadvantages}`;
      }

      const result = await generateText({
        prompt: { id: OPENAI_AGENTS.STORY_TITLES_TEXT },
        input: input,
      });

      // Validate that we got a response
      if (!result || typeof result !== 'string' || result.trim().length === 0) {
        functions.logger.error("Empty or invalid response from generateText:", result);
        throw new functions.https.HttpsError(
          "internal",
          "No response received from AI service"
        );
      }

      // Parse the JSON response to ensure it's valid
      let titles;
      try {
        // Try to find and parse JSON from the response
        let jsonToParse: string | null = null;
        const trimmedResult = result.trim();
        
        // First, try to parse the entire response if it looks like JSON
        if ((trimmedResult.startsWith('{') && trimmedResult.endsWith('}')) ||
            (trimmedResult.startsWith('[') && trimmedResult.endsWith(']'))) {
          jsonToParse = trimmedResult;
        } else {
          // Try to find JSON objects or arrays in the response using greedy matching
          // Find the last complete JSON object or array
          const objectMatches = result.match(/\{[\s\S]*\}/g);
          if (objectMatches && objectMatches.length > 0) {
            jsonToParse = objectMatches[objectMatches.length - 1];
          } else {
            const arrayMatches = result.match(/\[[\s\S]*\]/g);
            if (arrayMatches && arrayMatches.length > 0) {
              jsonToParse = arrayMatches[arrayMatches.length - 1];
            }
          }
        }
        
        if (!jsonToParse) {
          functions.logger.error("No JSON found in response:", result);
          throw new Error("No JSON found in response");
        }
        
        functions.logger.info("Extracted JSON to parse:", jsonToParse);
        functions.logger.info("JSON string length:", jsonToParse.length);
        functions.logger.info("JSON starts with:", jsonToParse.substring(0, 10));
        functions.logger.info("JSON ends with:", jsonToParse.substring(jsonToParse.length - 10));

        let parsed: unknown;
        try {
          // Handle the specific format {titles=[...]} which is not valid JSON
          let processedJson = jsonToParse;
          if (processedJson.includes('{titles=[') && processedJson.includes(']}')) {
            // Convert {titles=[...]} to {"titles": [...]}
            // Using [\s\S]*? instead of .*? with 's' flag for ES2017 compatibility
            processedJson = processedJson.replace(
              /\{titles=\[([\s\S]*?)\]\}/,
              '{"titles": [$1]}'
            );
            functions.logger.info("Processed malformed JSON format:", processedJson);
          }
          
          parsed = JSON.parse(processedJson);
        } catch (jsonError) {
          functions.logger.error("JSON parsing failed:", jsonError);
          functions.logger.error("Failed to parse this JSON:", jsonToParse);
          // Try to clean up the JSON string and parse again
          // Remove any leading/trailing non-JSON characters
          let cleanedJson = jsonToParse.trim();
          if (!cleanedJson.startsWith('{') && !cleanedJson.startsWith('[')) {
            // Find the first { or [ character
            const firstBrace = cleanedJson.indexOf('{');
            const firstBracket = cleanedJson.indexOf('[');
            const startIndex = Math.min(
              firstBrace === -1 ? cleanedJson.length : firstBrace,
              firstBracket === -1 ? cleanedJson.length : firstBracket
            );
            if (startIndex < cleanedJson.length) {
              cleanedJson = cleanedJson.substring(startIndex);
            }
          }
          
          if (!cleanedJson.endsWith('}') && !cleanedJson.endsWith(']')) {
            // Find the last } or ] character
            const lastBrace = cleanedJson.lastIndexOf('}');
            const lastBracket = cleanedJson.lastIndexOf(']');
            const endIndex = Math.max(lastBrace, lastBracket) + 1;
            if (endIndex > 0) {
              cleanedJson = cleanedJson.substring(0, endIndex);
            }
          }
          
          if (cleanedJson !== jsonToParse) {
            functions.logger.info("Attempting to parse cleaned JSON:", cleanedJson);
            
            // Apply the same preprocessing for the malformed format
            let processedCleanedJson = cleanedJson;
            if (processedCleanedJson.includes('{titles=[') && processedCleanedJson.includes(']}')) {
              // Using [\s\S]*? instead of .*? with 's' flag for ES2017 compatibility
              processedCleanedJson = processedCleanedJson.replace(
                /\{titles=\[([\s\S]*?)\]\}/,
                '{"titles": [$1]}'
              );
              functions.logger.info("Processed cleaned malformed JSON format:", processedCleanedJson);
            }
            
            try {
              parsed = JSON.parse(processedCleanedJson);
            } catch (cleanedError) {
              functions.logger.error("Cleaned JSON also failed to parse:", cleanedError);
              throw new Error(`JSON parsing failed: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`);
            }
          } else {
            throw new Error(`JSON parsing failed: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`);
          }
        }
        
        functions.logger.info("Parsed JSON response:", parsed);
        
        // Handle both object format {"titles": [...]} and direct array format [...]
        if (Array.isArray(parsed)) {
          // Direct array format: ["title1", "title2", ...]
          titles = parsed;
        } else if (parsed && typeof parsed === 'object' && 'titles' in parsed) {
          // Object format: {"titles": ["title1", "title2", ...]}
          const parsedObj = parsed as { titles: unknown };
          titles = parsedObj.titles;
        } else {
          functions.logger.error("Invalid response format - neither array nor object with titles:", parsed);
          throw new Error("Invalid response format - expected array or object with titles property");
        }

        // Validate that titles is an array
        if (!Array.isArray(titles)) {
          functions.logger.error("Titles is not an array:", titles);
          throw new Error("Titles must be an array");
        }

        if (titles.length === 0) {
          functions.logger.error("Empty titles array in response:", titles);
          throw new Error("No titles generated - empty array returned");
        }

        // Validate that titles are strings
        const invalidTitles = titles.filter((title: unknown) => typeof title !== 'string' || title.trim().length === 0);
        if (invalidTitles.length > 0) {
          functions.logger.error("Invalid titles found:", invalidTitles);
          throw new Error("Some generated titles are invalid or empty");
        }
      } catch (parseError) {
        functions.logger.error("Error parsing titles JSON:", parseError);
        functions.logger.error("Raw response was:", result);
        throw new functions.https.HttpsError(
          "internal",
          `Failed to parse generated titles: ${parseError instanceof Error ? parseError.message : "Unknown parse error"}`
        );
      }

      return {
        success: true,
        titles: titles,
      };
    } catch (error) {
      functions.logger.error("Error generating story titles:", error);
      throw new functions.https.HttpsError(
        "internal",
        `Failed to generate story titles: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

