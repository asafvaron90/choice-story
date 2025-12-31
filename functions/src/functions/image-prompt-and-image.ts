import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { generateText } from "../text-generation";
import { generateImage } from "../image-generation";
import { OPENAI_AGENTS } from "../open-ai-agents";
import { getFirestoreHelper, saveImageToStorage, getEnvironment } from "../lib/utils";
import { sendEmail } from "../email-service";
import { getEmailTemplateId } from "../constants/email-templates";

// ============================================================================
// LANGUAGE DETECTION HELPER
// ============================================================================

/**
 * Detects if text contains Hebrew characters
 * Used to determine email language based on story content
 */
function containsHebrew(text: string): boolean {
  // Hebrew Unicode range: \u0590-\u05FF
  const hebrewRegex = /[\u0590-\u05FF]/;
  return hebrewRegex.test(text);
}

/**
 * Detects the language based on kid name and story title
 * Returns 'he' if Hebrew characters are found, 'en' otherwise
 */
function detectLanguage(kidName?: string, storyTitle?: string): 'en' | 'he' {
  const textToCheck = `${kidName || ''} ${storyTitle || ''}`;
  return containsHebrew(textToCheck) ? 'he' : 'en';
}

// ============================================================================
// RETRY AND FALLBACK HELPERS
// ============================================================================

/**
 * Determines if an error can be used to refine the image prompt
 * Errors that indicate content policy violations, quality issues, or specific feedback
 * can be sent back to the prompt generator to create an improved prompt
 */
function isRefinableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const errorMessage = error.message.toLowerCase();
  
  // Check for errors that can be used to refine the prompt
  const refinableErrorPatterns = [
    'content policy',
    'content_policy',
    'policy violation',
    'safety',
    'inappropriate',
    'unsafe',
    'quality',
    'poor quality',
    'low quality',
    'invalid prompt',
    'prompt too',
    'prompt contains',
    'cannot generate',
    'unable to generate',
    'generation failed',
    'refused to generate',
    'rejected',
    'blocked',
    'filtered'
  ];

  return refinableErrorPatterns.some(pattern => errorMessage.includes(pattern));
}

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff for unexpected errors
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
  operationName: string = "operation"
): Promise<T> {
  let lastError: Error | unknown;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry refinable errors - they should go through the refinement process
      if (isRefinableError(error)) {
        throw error;
      }
      
      if (attempt === maxRetries) {
        functions.logger.error(`${operationName} failed after ${maxRetries} attempts`, {
          attempt,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
      
      const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
      functions.logger.warn(`${operationName} failed, retrying in ${delayMs}ms`, {
        attempt,
        maxRetries,
        error: error instanceof Error ? error.message : String(error)
      });
      
      await sleep(delayMs);
    }
  }
  
  throw lastError;
}

/**
 * Generate image prompt with optional error feedback for refinement
 */
async function generateImagePromptWithFeedback(
  pageText: string,
  gender?: string,
  age?: number,
  previousError?: string,
  attemptNumber?: number
): Promise<string> {
  const variables: Record<string, string | number> = {
    page_text: pageText
  };

  if (gender) {
    variables.gender = gender;
  }

  if (age !== undefined && age !== null) {
    variables.age = age;
  }

  // Add error feedback if provided (for prompt refinement)
  if (previousError && attemptNumber) {
    variables.previous_error = previousError;
    variables.attempt_number = attemptNumber;
    
    functions.logger.info("Generating refined image prompt with error feedback", {
      attemptNumber,
      errorPreview: previousError.substring(0, 100) + "..."
    });
  }

  return await generateText({
    prompt: { 
      id: OPENAI_AGENTS.STORY_IMAGE_PROMPT,
      variables: variables
    },
    input: pageText,
  });
}

/**
 * Generate image with retry logic for unexpected errors
 */
async function generateImageWithRetry(
  imagePrompt: string,
  imageUrl: string,
  maxRetries: number = 3
): Promise<string> {
  return await retryWithBackoff(
    async () => {
      return await generateImage({
        prompt: { id: OPENAI_AGENTS.STORY_PAGE_IMAGE },
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: imagePrompt },
              { type: "input_image", image_url: imageUrl },
            ],
          },
        ],
      });
    },
    maxRetries,
    1000,
    "Image generation"
  );
}

/**
 * Generate Image Prompt and Image (Combined)
 * First generates an image prompt for a story page, then generates the image using that prompt
 * 
 * Request body:
 * {
 *   // Image prompt generation parameters
 *   "pageText": "page text",
 *   "pageNum": 1 (optional),
 *   "gender": "male|female" (optional),
 *   "age": 8 (optional),
 *   
 *   // Image generation parameters
 *   "imageUrl": "url_to_kid_photo",
 *   "accountId": "account_id",
 *   "userId": "user_id",
 *   "storyId": "story_id",
 *   "updatePath": "firestore update path" (optional)
 * }
 */
export const generateImagePromptAndImage = functions.runWith({
  timeoutSeconds: 540,
  memory: '2GB'
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
      const { 
        pageText, 
        pageNum, 
        gender, 
        age,
        imageUrl, 
        accountId, 
        userId, 
        storyId, 
        updatePath
      } = data;

      // Validate required parameters for image prompt generation
      if (!pageText) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "pageText is required"
        );
      }

      // Validate required parameters for image generation
      if (!imageUrl || !accountId || !userId || !storyId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "imageUrl, accountId, userId, and storyId are required"
        );
      }

      functions.logger.info("Starting image prompt and image generation", {
        pageText: pageText.substring(0, 50) + "...",
        pageNum,
        gender,
        age,
        storyId
      });

      const MAX_REFINEMENT_ATTEMPTS = 3;
      let imagePrompt: string | null = null;
      let base64Image: string | null = null;
      let lastError: Error | null = null;

      // Attempt prompt refinement loop (up to 3 times)
      for (let refinementAttempt = 1; refinementAttempt <= MAX_REFINEMENT_ATTEMPTS; refinementAttempt++) {
        try {
          // Step 1: Generate or refine the image prompt
          if (refinementAttempt === 1) {
            functions.logger.info("Step 1: Generating initial image prompt", {
              pageText: pageText.substring(0, 50) + "...",
              pageNum,
              gender,
              age
            });
            
            imagePrompt = await generateImagePromptWithFeedback(
              pageText,
              gender,
              age
            );
          } else {
            functions.logger.info(`Step 1 (Refinement ${refinementAttempt}): Regenerating image prompt with error feedback`, {
              previousError: lastError?.message?.substring(0, 100) + "...",
              pageNum
            });
            
            imagePrompt = await generateImagePromptWithFeedback(
              pageText,
              gender,
              age,
              lastError?.message || "Unknown error occurred during image generation",
              refinementAttempt
            );
          }

          functions.logger.info("Step 2: Generating image with prompt", {
            promptLength: imagePrompt.length,
            storyId,
            pageNum,
            refinementAttempt
          });

          // Step 2: Generate the image using the prompt (with retry for unexpected errors)
          try {
            base64Image = await generateImageWithRetry(
              imagePrompt,
              imageUrl,
              3 // Max retries for unexpected errors
            );
            
            // Success! Break out of refinement loop
            break;
          } catch (imageError) {
            lastError = imageError instanceof Error ? imageError : new Error(String(imageError));
            
            // Check if this is a refinable error
            if (isRefinableError(lastError)) {
              functions.logger.warn("Image generation failed with refinable error, will refine prompt", {
                refinementAttempt,
                maxAttempts: MAX_REFINEMENT_ATTEMPTS,
                error: lastError.message
              });
              
              // If we've exhausted refinement attempts, throw the error
              if (refinementAttempt >= MAX_REFINEMENT_ATTEMPTS) {
                functions.logger.error("Max refinement attempts reached, failing", {
                  maxAttempts: MAX_REFINEMENT_ATTEMPTS,
                  finalError: lastError.message
                });
                throw lastError;
              }
              
              // Continue to next refinement attempt
              continue;
            } else {
              // Unexpected error - throw it (retry logic already handled in generateImageWithRetry)
              throw lastError;
            }
          }
        } catch (promptError) {
          // Error during prompt generation - retry with backoff
          lastError = promptError instanceof Error ? promptError : new Error(String(promptError));
          
          functions.logger.error("Error during prompt generation or image generation", {
            refinementAttempt,
            error: lastError.message
          });
          
          // If it's not a refinable error and we're on the first attempt, retry the whole process
          if (refinementAttempt === 1 && !isRefinableError(lastError)) {
            // This will be caught by the outer retry logic if needed
            throw lastError;
          }
          
          // If we've exhausted all attempts, throw
          if (refinementAttempt >= MAX_REFINEMENT_ATTEMPTS) {
            throw lastError;
          }
          
          // Wait before next refinement attempt
          await sleep(1000 * refinementAttempt);
        }
      }

      // Ensure we have both prompt and image
      if (!imagePrompt || !base64Image) {
        throw new Error("Failed to generate image prompt or image after all retry attempts");
      }

      functions.logger.info("Step 3: Saving image to storage", {
        storyId,
        pageNum
      });

      // Step 3: Save to Firebase Storage
      const storageUrl = await saveImageToStorage(
        base64Image,
        accountId,
        userId,
        storyId,
        'page',
        pageNum
      );

      functions.logger.info("Step 4: Updating Firestore", {
        storageUrl,
        updatePath,
        storyId
      });

      // Step 4: Update Firestore with page image URL using updatePath from client
      if (storyId && updatePath) {
        const dbHelper = getFirestoreHelper(environment);
        const storyRef = dbHelper.getStoryRef(storyId);
        const firestore = dbHelper.getDb();

        await firestore.runTransaction(async (transaction) => {
          // Get the document from the correct collection inside the transaction for concurrency safety
          const docSnapshot = await transaction.get(storyRef);

          if (!docSnapshot.exists) {
            throw new functions.https.HttpsError(
              "not-found",
              `Story document not found: ${storyId}`
            );
          }

          const storyData = docSnapshot.data();
          if (!storyData || !Array.isArray(storyData.pages)) {
            throw new functions.https.HttpsError("failed-precondition", "Pages field is not an array or does not exist.");
          }

          // Use pageNum directly as array index (0-based, no manipulation)
          if (pageNum === undefined || pageNum === null || isNaN(pageNum) || pageNum < 0 || pageNum >= storyData.pages.length) {
            throw new functions.https.HttpsError("out-of-range", `Page number ${pageNum} is out of bounds.`);
          }

          functions.logger.info(`Updating page at index ${pageNum}`, {
            totalPages: storyData.pages.length,
            pageNumFromClient: pageNum,
            updatePath
          });

          // Modify the array in memory
          const updatedPages = [...storyData.pages];
          if (!updatedPages[pageNum]) {
            updatedPages[pageNum] = {};
          }
          updatedPages[pageNum].selectedImageUrl = storageUrl;
          updatedPages[pageNum].imagePrompt = imagePrompt; // Save the generated prompt

          transaction.update(storyRef, {
            pages: updatedPages,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        });

        functions.logger.info(`Successfully updated Firestore for story ${storyId}, page index: ${pageNum} with image URL and prompt`);
        
        // Check if ALL images are now complete and send email notification
        const storySnapshot = await storyRef.get();
        const storyData = storySnapshot.data();
        
        if (storyData && Array.isArray(storyData.pages)) {
          const allImagesComplete = storyData.pages.every(
            (page: { selectedImageUrl?: string }) => page.selectedImageUrl && page.selectedImageUrl.trim() !== ''
          );
          
          if (allImagesComplete) {
            functions.logger.info(`All images complete for story ${storyId}, sending email notification`);
            
            try {
              // Get user email from Firebase Auth
              const storyUserId = storyData.userId || userId;
              const userRecord = await admin.auth().getUser(storyUserId);
              const userEmail = userRecord.email;
              
              if (userEmail) {
                // Determine base URL based on environment
                const baseUrls: Record<string, string> = {
                  'production': 'https://choice-story.com',
                  'development': 'https://staging.choice-story.com'
                };
                const baseUrl = baseUrls[environment] || 'https://staging.choice-story.com';
                const storyUrl = `${baseUrl}/stories/${storyId}`;
                
                // Get kid name and story title
                const kidName = storyData.kidName || '';
                const storyTitle = storyData.title || '';
                
                // Detect language based on content (Hebrew or English)
                const emailLanguage = detectLanguage(kidName, storyTitle);
                functions.logger.info(`Detected email language: ${emailLanguage}`, { kidName, storyTitle });
                
                // Use localized fallbacks
                const displayStoryTitle = storyTitle || (emailLanguage === 'he' ? 'הסיפור שלך' : 'Your Story');
                
                const templateId = getEmailTemplateId(emailLanguage, 'STORY_READY');
                
                const emailResult = await sendEmail({
                  to: userEmail,
                  templateId: templateId,
                  variables: {
                    STORY_URL: storyUrl,
                    STORY_TITLE: displayStoryTitle,
                  },
                });
                
                if (emailResult.success) {
                  functions.logger.info("Story ready email sent successfully", { emailId: emailResult.id, storyId });
                } else {
                  functions.logger.warn("Failed to send story ready email", { error: emailResult.error, storyId });
                }
              } else {
                functions.logger.warn("User has no email address, skipping notification", { userId: storyUserId });
              }
            } catch (emailError) {
              // Log error but don't fail the image generation
              functions.logger.error("Error sending story ready email:", emailError);
            }
          } else {
            const completedCount = storyData.pages.filter(
              (page: { selectedImageUrl?: string }) => page.selectedImageUrl && page.selectedImageUrl.trim() !== ''
            ).length;
            functions.logger.info(`Image ${completedCount}/${storyData.pages.length} complete for story ${storyId}, email will be sent when all complete`);
          }
        }
      }

      return {
        success: true,
        imagePrompt: imagePrompt,
        imageUrl: storageUrl,
      };
    } catch (error) {
      functions.logger.error("Error generating image prompt and image:", error);
      throw new functions.https.HttpsError(
        "internal",
        `Failed to generate image prompt and image: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);
