import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { generateText } from "../text-generation";
import { OPENAI_AGENTS } from "../open-ai-agents";
import { getFirestoreHelper, getEnvironment } from "../lib/utils";

interface StoryPagesTextParams {
  name: string;
  problemDescription: string;
  title: string;
  age: number;
  advantages: string;
  disadvantages: string;
  accountId: string;
  userId: string;
  storyId?: string; // Optional: not available when initially generating the story
}

/**
 * Helper: Generate Story Pages Text (does NOT save to Firestore)
 * The client will save the complete story after processing
 */
async function generateAndSaveStoryPagesText(params: StoryPagesTextParams) {
  const { name, problemDescription, title, age, advantages, disadvantages, accountId: _accountId, userId: _userId, storyId } = params;

  // Generate the story text
  const input = `Name: ${name}
Problem Description: ${problemDescription}
Story Title: ${title}
Target Age: ${age} years old
Moral Advantages: ${advantages}
Moral Disadvantages: ${disadvantages}`;

  const text = await generateText({
    prompt: { id: OPENAI_AGENTS.STORY_PAGES_TEXT },
    input: input,
  });

  // NOTE: We do NOT save to Firestore here anymore to avoid duplication
  // The client will save the complete story with all pages and details
  
  functions.logger.info(`Generated story text${storyId ? ` for storyId: ${storyId}` : ''}, length: ${text.length}`);

  return {
    success: true,
    text,
    storyId,
  };
}

/**
 * Generate Story Pages Text (Callable)
 * Generates complete story pages with text and image prompts
 * 
 * Request body:
 * {
 *   "name": "kid_name",
 *   "problemDescription": "problem description",
 *   "title": "story title",
 *   "age": 8,
 *   "advantages": "advantages",
 *   "disadvantages": "disadvantages",
 *   "accountId": "account_id",
 *   "userId": "user_id",
 *   "storyId": "story_id"
 * }
 */
export const generateStoryPagesText = functions.runWith({
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
      const { name, problemDescription, title, age, advantages, disadvantages, accountId, userId, storyId } = data;

      if (!name || !problemDescription || !title || !age || !advantages || !disadvantages || !accountId || !userId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "All fields are required: name, problemDescription, title, age, advantages, disadvantages, accountId, userId. storyId is optional."
        );
      }

      const result = await generateAndSaveStoryPagesText({
        name,
        problemDescription,
        title,
        age,
        advantages,
        disadvantages,
        accountId,
        userId,
        storyId,
      });

      return result;
    } catch (error) {
      functions.logger.error("Error generating story pages text:", error);
      throw new functions.https.HttpsError(
        "internal",
        `Failed to generate story pages text: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

/**
 * Generate Story Pages Text (HTTP API)
 * Same as callable version but works with fetch/axios
 * 
 * POST /generateStoryPagesTextHttp
 * Headers: { "Authorization": "Bearer <firebase-token>" }
 * Body: {
 *   "name": "kid_name",
 *   "accountId": "account_id",
 *   "userId": "user_id",
 *   "storyId": "story_id",
 *   ...
 * }
 */
export const generateStoryPagesTextHttp = functions.runWith({
  timeoutSeconds: 540,
  memory: '1GB'
}).https.onRequest(
  async (request, response) => {
    // CORS headers
    response.set('Access-Control-Allow-Origin', '*');
    
    if (request.method === 'OPTIONS') {
      response.set('Access-Control-Allow-Methods', 'POST');
      response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.status(204).send('');
      return;
    }

    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      // Get Firebase token from Authorization header
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        response.status(401).json({ error: 'Unauthorized - No token provided' });
        return;
      }

      const token = authHeader.split('Bearer ')[1];
      
      // Verify token
      await admin.auth().verifyIdToken(token);

      const { name, problemDescription, title, age, advantages, disadvantages, accountId, userId, storyId } = request.body;

      if (!name || !problemDescription || !title || !age || !advantages || !disadvantages || !accountId || !userId) {
        response.status(400).json({
          error: 'Missing required fields',
          required: ['name', 'problemDescription', 'title', 'age', 'advantages', 'disadvantages', 'accountId', 'userId'],
          optional: ['storyId']
        });
        return;
      }

      const result = await generateAndSaveStoryPagesText({
        name,
        problemDescription,
        title,
        age,
        advantages,
        disadvantages,
        accountId,
        userId,
        storyId,
      });

      response.status(200).json(result);
    } catch (error) {
      functions.logger.error("Error generating story pages text (HTTP):", error);
      response.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Generate Story Image Prompt
 * Generates image prompt for a specific story page or multiple pages
 * 
 * Request body (single page):
 * {
 *   "pageText": "page text",
 *   "pageNum": 1 (optional),
 *   "gender": "male|female" (optional),
 *   "age": 8 (optional),
 *   "accountId": "account_id" (optional - for saving to Firestore),
 *   "userId": "user_id" (optional - for saving to Firestore),
 *   "storyId": "story_id" (optional - for saving to Firestore),
 *   "updatePath": "firestore update path" (optional - for saving to Firestore)
 * }
 * 
 * Request body (multiple pages):
 * {
 *   "pages": [
 *     {
 *       "pageNum": 1,
 *       "pageType": "NORMAL",
 *       "storyText": "page text"
 *     },
 *     ...
 *   ],
 *   "gender": "male|female" (optional),
 *   "age": 8 (optional)
 * }
 */
export const generateStoryImagePrompt = functions.runWith({
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
      const environment = getEnvironment();
      const { pageText, pageNum: _pageNum, pages, gender, age, accountId: _accountId, userId: _userId, storyId, updatePath } = data;

      // Handle multiple pages case
      if (pages && Array.isArray(pages) && pages.length > 0) {
        // Validate that each page has the required fields
        for (const page of pages) {
          if (!page.storyText || !page.pageType) {
            throw new functions.https.HttpsError(
              "invalid-argument",
              "Each page must have storyText and pageType"
            );
          }
        }

        functions.logger.info(`Generating image prompts for ${pages.length} pages`);

        try {
          // Create input for all pages at once
          const input = `story_pages = ${JSON.stringify(pages)}`;
          
          const result = await generateText({
            prompt: { id: OPENAI_AGENTS.STORY_IMAGE_PROMPT },
            input: input,
          });

          // Parse the AI response - handle both complete and incomplete responses
          let parsedPages;
          try {
            // First try to parse the result directly
            functions.logger.info("Attempting to parse AI response:", result.substring(0, 200) + "...");
            const parsed = JSON.parse(result);
            if (parsed.pages && Array.isArray(parsed.pages)) {
              parsedPages = parsed.pages;
              functions.logger.info("Successfully parsed AI response with pages:", parsedPages.length);
            } else {
              functions.logger.error("Expected 'pages' array in response, got:", parsed);
              throw new Error("Invalid response format - expected 'pages' array");
            }
          } catch (parseError) {
            functions.logger.warn("Direct JSON parsing failed, attempting to handle incomplete response:", parseError);
            functions.logger.warn("Raw response length:", result.length);
            
            // Handle incomplete JSON by trying to extract what we can
            try {
              const resultStr = result.toString().trim();
              
              // Try to extract individual page objects from the incomplete JSON
              const pageObjects: Array<{pageNum: number; pageType: string; text?: string; storyText?: string; imagePrompt: string}> = [];
              
              // Use regex to find complete page objects in the JSON
              const pageRegex = /\{\s*"pageNum"\s*:\s*(\d+)[\s\S]*?"imagePrompt"\s*:\s*"([^"]*(?:\\.[^"]*)*)"[^}]*\}/g;
              let match;
              
              while ((match = pageRegex.exec(resultStr)) !== null) {
                try {
                  // Find the start of this match and try to parse the full object
                  const startPos = match.index;
                  let braceCount = 0;
                  let endPos = startPos;
                  let inString = false;
                  let escaped = false;
                  
                  // Find the complete object by counting braces
                  for (let i = startPos; i < resultStr.length; i++) {
                    const char = resultStr[i];
                    
                    if (escaped) {
                      escaped = false;
                      continue;
                    }
                    
                    if (char === '\\' && inString) {
                      escaped = true;
                      continue;
                    }
                    
                    if (char === '"') {
                      inString = !inString;
                      continue;
                    }
                    
                    if (!inString) {
                      if (char === '{') {
                        braceCount++;
                      } else if (char === '}') {
                        braceCount--;
                        if (braceCount === 0) {
                          endPos = i + 1;
                          break;
                        }
                      }
                    }
                  }
                  
                  if (endPos > startPos) {
                    const pageJson = resultStr.substring(startPos, endPos);
                    const pageObj = JSON.parse(pageJson);
                    if (pageObj.pageNum && pageObj.imagePrompt) {
                      pageObjects.push(pageObj);
                      functions.logger.info(`Successfully extracted page ${pageObj.pageNum}`);
                    }
                  }
                } catch (pageError) {
                  functions.logger.warn(`Failed to parse page: ${pageError}`);
                }
              }
              
              if (pageObjects.length > 0) {
                parsedPages = pageObjects;
                functions.logger.info(`Successfully extracted ${pageObjects.length} pages from incomplete response`);
              } else {
                throw new Error("Could not extract any valid pages from incomplete response");
              }
              
            } catch (extractError) {
              functions.logger.error("Failed to extract pages from incomplete response:", extractError);
              functions.logger.error("Response preview:", result.substring(0, 1000));
              
              throw new functions.https.HttpsError(
                "internal",
                `Failed to parse AI response. The response may be incomplete due to token limits. Please try again or reduce the number of pages.`
              );
            }
          }

          // Validate that all pages have imagePrompt and ensure they contain only the image prompt text
          const validatedPages = [];
          let failedCount = 0;
          
          for (const parsedPage of parsedPages) {
            if (parsedPage.imagePrompt && parsedPage.imagePrompt.trim()) {
              // Check if imagePrompt is actually the full pages JSON (which would be a bug)
              let actualImagePrompt = parsedPage.imagePrompt;
              try {
                const potentialJsonParsed = JSON.parse(parsedPage.imagePrompt);
                if (potentialJsonParsed.pages && Array.isArray(potentialJsonParsed.pages)) {
                  // This is the bug - imagePrompt contains full pages JSON
                  functions.logger.error(`BUG DETECTED: imagePrompt for page ${parsedPage.pageNum} contains full pages JSON instead of just the prompt`);
                  
                  // Find the correct page in the nested JSON and extract its imagePrompt
                  const correctPage = potentialJsonParsed.pages.find((p: unknown) => 
                    typeof p === 'object' && p !== null && 'pageNum' in p && (p as {pageNum: number}).pageNum === parsedPage.pageNum
                  ) as {imagePrompt?: string} | undefined;
                  if (correctPage && correctPage.imagePrompt) {
                    actualImagePrompt = correctPage.imagePrompt;
                    functions.logger.info(`Fixed imagePrompt for page ${parsedPage.pageNum}`);
                  } else {
                    functions.logger.error(`Could not find correct page ${parsedPage.pageNum} in nested JSON`);
                    actualImagePrompt = parsedPage.imagePrompt; // Fallback to original
                  }
                }
              } catch (_e) {
                // imagePrompt is not JSON, so it's correct - use as is
              }

              // Create clean page object with only the necessary fields
              validatedPages.push({
                pageNum: parsedPage.pageNum,
                pageType: parsedPage.pageType,
                storyText: parsedPage.storyText || parsedPage.text || parsedPage.pageText, // Handle multiple field names
                imagePrompt: actualImagePrompt
              });
            } else {
              functions.logger.error(`Missing imagePrompt for page ${parsedPage.pageNum}:`, parsedPage);
              failedCount++;
            }
          }

          if (failedCount > 0) {
            functions.logger.error(`Failed to generate image prompts for ${failedCount} pages`);
          }

          const successfulCount = validatedPages.length;

          // For backwards compatibility, also create results array but use the validated pages
          const results = validatedPages.map(page => ({
            pageNum: page.pageNum,
            pageType: page.pageType,
            storyText: page.storyText,
            imagePrompt: page.imagePrompt,
            success: true
          }));

          return {
            success: true,
            results: results,
            totalPages: pages.length,
            successfulPages: successfulCount,
            failedPages: failedCount,
            pages: validatedPages // Return the clean, validated pages
          };
        } catch (error) {
          functions.logger.error("Error generating image prompts for all pages:", error);
          throw new functions.https.HttpsError(
            "internal",
            `Failed to generate image prompts: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }

      // Handle single page case
      if (!pageText) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "pageText is required for single page generation, or pages array for multiple pages"
        );
      }

      // Build variables object for the prompt
      const variables: Record<string, string | number> = {
        page_text: pageText
      };

      if (gender) {
        variables.gender = gender;
      }

      if (age !== undefined && age !== null) {
        variables.age = age;
      }

      functions.logger.info("Generating image prompt with variables:", variables);

      const result = await generateText({
        prompt: { 
          id: OPENAI_AGENTS.STORY_IMAGE_PROMPT,
          variables: variables
        },
        input: pageText, // Use page text as the main input
      });

      // Save the generated prompt to Firestore if parameters are provided
      if (storyId && updatePath) {
        functions.logger.info("Saving generated prompt to Firestore", {
          storyId,
          updatePath,
          environment,
          promptLength: result.length
        });

        try {
          const dbHelper = getFirestoreHelper(environment);
          
          // Get the document from the correct collection
          const docSnapshot = await dbHelper.getStory(storyId);
          
          if (!docSnapshot.exists) {
            throw new functions.https.HttpsError(
              'not-found',
              `Story document not found: ${storyId}`
            );
          } else {
            const storyRef = dbHelper.getStoryRef(storyId);
            
            // Parse the updatePath to determine field to update
            // updatePath format: "pages/0/selectedImageUrl" -> we want "pages/0/imagePrompt"
            const pathParts = updatePath.split('/');
            const pagesIndex = pathParts.indexOf('pages');
            
            if (pagesIndex !== -1 && pagesIndex + 1 < pathParts.length) {
              const pageIndex = parseInt(pathParts[pagesIndex + 1], 10);
              
              // Read-modify-write for array updates
              const storyData = docSnapshot.data();
              if (storyData && Array.isArray(storyData.pages)) {
                if (pageIndex >= 0 && pageIndex < storyData.pages.length) {
                  const updatedPages = [...storyData.pages];
                  if (!updatedPages[pageIndex]) {
                    updatedPages[pageIndex] = {};
                  }
                  updatedPages[pageIndex].imagePrompt = result;

                  await storyRef.update({
                    pages: updatedPages,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                  });

                  functions.logger.info(`Successfully saved prompt to Firestore for story ${storyId}, page index: ${pageIndex}`);
                } else {
                  functions.logger.warn(`Page index ${pageIndex} out of bounds`);
                }
              }
            }
          }
        } catch (firestoreError) {
          // Log error but don't fail the whole operation
          functions.logger.error("Error saving prompt to Firestore:", firestoreError);
          // Continue and return the prompt anyway
        }
      }

      return {
        success: true,
        imagePrompt: result,
      };
    } catch (error) {
      functions.logger.error("Error generating story image prompt:", error);
      throw new functions.https.HttpsError(
        "internal",
        `Failed to generate story image prompt: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

