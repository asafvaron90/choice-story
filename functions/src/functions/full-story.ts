import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { generateText } from "../text-generation";
import { generateImage } from "../image-generation";
import { OPENAI_AGENTS } from "../open-ai-agents";
import { getFirestoreHelper, saveImageToStorage, getDb, getEnvironment } from "../lib/utils";
import { sendEmail } from "../email-service";
import { getEmailTemplateId } from "../constants/email-templates";

// Sleep helper for retry delays
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Image generation retry configuration
const MAX_IMAGE_RETRIES = 3;

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

/**
 * Generate an image with retry logic and exponential backoff
 * @param params - Parameters for image generation
 * @param pageNum - Page number for logging
 * @returns Base64 encoded image string
 */
async function generatePageImageWithRetry(
  params: {
    prompt: { id: string };
    input: Array<{
      role: string;
      content: Array<{ type: string; text?: string; image_url?: string }>;
    }>;
  },
  pageNum: number
): Promise<string> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= MAX_IMAGE_RETRIES; attempt++) {
    try {
      functions.logger.info(`Image generation attempt ${attempt}/${MAX_IMAGE_RETRIES} for page ${pageNum}`);
      const base64Image = await generateImage(params);
      
      if (attempt > 1) {
        functions.logger.info(`Image generation succeeded on attempt ${attempt} for page ${pageNum}`);
      }
      
      return base64Image;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      functions.logger.warn(`Image generation attempt ${attempt}/${MAX_IMAGE_RETRIES} failed for page ${pageNum}:`, {
        error: lastError.message,
        attempt,
        maxRetries: MAX_IMAGE_RETRIES
      });
      
      if (attempt < MAX_IMAGE_RETRIES) {
        // Exponential backoff: 1s, 2s, 4s
        const delayMs = 1000 * Math.pow(2, attempt - 1);
        functions.logger.info(`Waiting ${delayMs}ms before retry...`);
        await sleep(delayMs);
      }
    }
  }
  
  // All retries exhausted
  functions.logger.error(`Image generation failed after ${MAX_IMAGE_RETRIES} attempts for page ${pageNum}`);
  throw lastError || new Error("Image generation failed after all retry attempts");
}

// Import the helper function from story-text
async function generateAndSaveStoryPagesText(params: {
  name: string;
  problemDescription: string;
  title: string;
  age: number;
  advantages: string;
  disadvantages: string;
  accountId: string;
  userId: string;
  storyId?: string;
}) {
  const { name, problemDescription, title, age, advantages, disadvantages } = params;
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
  functions.logger.info(`Generated story text${params.storyId ? ` for storyId: ${params.storyId}` : ''}, length: ${text.length}`);
  return { success: true, text, storyId: params.storyId };
}

export const generateFullStory = functions.runWith({
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
      const { userId, kidId, problemDescription, advantages, disadvantages } = data;

      // Validate required parameters
      if (!userId || !kidId || !problemDescription) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "userId, kidId, and problemDescription are required"
        );
      }

      functions.logger.info("Starting full story generation", { userId, kidId, environment });

      // STEP 1: Get kid details from Firestore (5% progress)
      functions.logger.info("Step 1: Fetching kid details from Firestore");
      
      // Kids are stored directly in users_{environment} collection with kidId as document ID
      const dbHelper = getFirestoreHelper(environment);
      const kidDoc = await dbHelper.getKid(kidId);
      
      if (!kidDoc.exists) {
        functions.logger.error("Kid not found", { kidId, collection: dbHelper.getUsersCollection() });
        throw new functions.https.HttpsError(
          "not-found",
          `Kid not found with ID: ${kidId} in environment: ${environment}`
        );
      }

      const kidData = kidDoc.data();
      if (!kidData) {
        throw new functions.https.HttpsError(
          "internal",
          "Kid data is empty"
        );
      }

      const kidName = kidData.name || "Child";
      const kidGender = kidData.gender as 'male' | 'female';
      const kidAge = kidData.age;
      const kidImageUrl = kidData.imageUrl || kidData.avatarUrl;

      functions.logger.info("Kid details retrieved", { kidName, kidGender, kidAge });

      // Create a new story document with auto-generated ID
      const storyRef = dbHelper.getStoriesCollection();
      const newStoryDoc = await getDb().collection(storyRef).add({
        userId: userId,
        kidId: kidId,
        accountId: userId,
        status: 'initializing',
        progress: 5,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      const storyId = newStoryDoc.id;
      functions.logger.info("Created story with auto-generated ID:", storyId);
      
      // Increment the stories_created counter for the kid
      try {
        await dbHelper.incrementStoriesCreated(kidId);
        functions.logger.info("Incremented stories_created counter for kid:", kidId);
      } catch (incrementError) {
        // Log the error but don't fail the story creation
        functions.logger.error("Failed to increment stories_created counter:", incrementError);
      }
      
      const storyDocRef = dbHelper.getStoryRef(storyId);

      // Helper function to update story status
      const updateStatus = async (status: string, percentage: number) => {
        try {
          await storyDocRef.update({
            status: status,
            progress: percentage,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          });
          functions.logger.info(`Status updated: ${status} (${percentage}%)`);
        } catch (error) {
          functions.logger.warn("Failed to update status:", error);
        }
      };

      // Update: Starting (5%)
      await updateStatus('progress_5', 5);

      // STEP 2: Generate story titles and pick one randomly (10% progress)
      functions.logger.info("Step 2: Generating story titles");
      await updateStatus('progress_10', 10);
      const titlesInput = `Name: ${kidName}
Gender: ${kidGender}
Problem Description: ${problemDescription}
Age: ${kidAge} years old${advantages ? `\nAdvantages: ${advantages}` : ''}${disadvantages ? `\nDisadvantages: ${disadvantages}` : ''}`;

      const titlesResult = await generateText({
        prompt: { id: OPENAI_AGENTS.STORY_TITLES_TEXT },
        input: titlesInput,
      });

      // Parse titles from response
      let titles: string[];
      try {
        const parsed = JSON.parse(titlesResult);
        titles = Array.isArray(parsed) ? parsed : (parsed.titles || []);
      } catch (parseError) {
        functions.logger.error("Failed to parse titles:", parseError);
        throw new functions.https.HttpsError(
          "internal",
          "Failed to parse generated titles"
        );
      }

      if (!titles || titles.length === 0) {
        throw new functions.https.HttpsError(
          "internal",
          "No titles were generated"
        );
      }

      // Pick a random title
      const selectedTitle = titles[Math.floor(Math.random() * titles.length)];
      functions.logger.info("Story title selected", { selectedTitle });

      // Update: Title generated (20%)
      await updateStatus('progress_20', 20);

      // STEP 3: Generate story pages text (30% progress)
      functions.logger.info("Step 3: Generating story pages text");

      const storyTextResult = await generateAndSaveStoryPagesText({
        name: kidName,
        problemDescription,
        title: selectedTitle,
        age: kidAge,
        advantages: advantages || "",
        disadvantages: disadvantages || "",
        accountId: userId,
        userId: userId,
        storyId: storyId,
      });

      functions.logger.info("Story pages text generated successfully");

      // Update: Story text generated (40%)
      await updateStatus('progress_40', 40);

      // STEP 4: Parse the story text to extract pages (45% progress)
      functions.logger.info("Step 4: Parsing story text into pages");
      
      // Parse the AI response to get structured pages
      // The response should be in JSON format with pages array
      let storyPages;
      try {
        const parsed = JSON.parse(storyTextResult.text);
        storyPages = parsed.pages || parsed;
        
        if (!Array.isArray(storyPages)) {
          throw new Error("Parsed result is not an array of pages");
        }
      } catch (parseError) {
        functions.logger.error("Failed to parse story pages:", parseError);
        throw new functions.https.HttpsError(
          "internal",
          "Failed to parse story pages from generated text"
        );
      }

      functions.logger.info(`Parsed ${storyPages.length} pages`);

      // Update: Pages parsed (50%)
      await updateStatus('progress_50', 50);

      // STEP 5: Save the complete story to Firestore (55% progress)
      functions.logger.info("Step 5: Saving story to Firestore");

      const storyData = {
        id: storyId,
        userId: userId,
        kidId: kidId,
        accountId: userId,
        title: selectedTitle,
        problemDescription: problemDescription,
        advantages: advantages || "",
        disadvantages: disadvantages || "",
        status: 'generating_images',
        pages: storyPages.map((page: any, index: number) => ({
          pageNum: index,
          pageType: page.pageType || 'NORMAL',
          storyText: page.storyText || page.text || '',
          imagePrompt: page.imagePrompt || '',
          selectedImageUrl: '', // Will be filled by image generation
        })),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      };

      await storyDocRef.update(storyData);
      functions.logger.info("Story saved to Firestore");

      // Update: Story saved (60%)
      await updateStatus('progress_60', 60);

      // STEP 6: Generate image prompts for all pages (60-70% progress)
      functions.logger.info("Step 6: Generating image prompts");
      
      // Check if pages already have image prompts
      const pagesNeedingPrompts = storyPages.filter((page: any) => !page.imagePrompt || page.imagePrompt.trim() === '');
      
      if (pagesNeedingPrompts.length > 0) {
        functions.logger.info(`Generating image prompts for ${pagesNeedingPrompts.length} pages`);
        
        // Generate image prompts for each page individually
        let promptsGenerated = 0;
        for (let pageIndex = 0; pageIndex < storyPages.length; pageIndex++) {
          const page = storyPages[pageIndex];
          if (!page.imagePrompt || page.imagePrompt.trim() === '') {
            try {
              const pageText = page.storyText || page.text || '';
              
              // Build variables for the image prompt
              const variables: Record<string, string | number> = {
                page_text: pageText,
                gender: kidGender,
                age: kidAge
              };
              
              functions.logger.info(`Generating image prompt for page ${pageIndex}`, { variables });
              
              const imagePrompt = await generateText({
                prompt: { 
                  id: OPENAI_AGENTS.STORY_IMAGE_PROMPT,
                  variables: variables
                },
                input: pageText,
              });
              
              page.imagePrompt = imagePrompt;
              functions.logger.info(`Generated image prompt for page ${pageIndex}`);
              
              // Update progress for prompts (60% to 70%)
              promptsGenerated++;
              const promptProgress = 60 + Math.floor((promptsGenerated / pagesNeedingPrompts.length) * 10);
              await updateStatus(`progress_${promptProgress}`, promptProgress);
            } catch (promptError) {
              functions.logger.error(`Failed to generate image prompt for page ${pageIndex}:`, promptError);
              // Continue with other pages
            }
          }
        }
        
        // Update Firestore with image prompts
        await storyDocRef.update({
          pages: storyPages.map((page: any, index: number) => ({
            pageNum: index,
            pageType: page.pageType || 'NORMAL',
            storyText: page.storyText || page.text || '',
            imagePrompt: page.imagePrompt || '',
            selectedImageUrl: '',
          })),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        functions.logger.info("All pages already have image prompts, skipping generation");
        await updateStatus('progress_70', 70);
      }

      // STEP 7: Generate images for all pages (70-95% progress)
      functions.logger.info("Step 7: Generating images for all pages");
      
      if (!kidImageUrl) {
        functions.logger.warn("No kid image URL found, skipping image generation");
        await storyDocRef.update({
          status: 'completed',
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        return {
          success: true,
          storyId: storyId,
          title: selectedTitle,
          pagesCount: storyPages.length,
          message: "Story generated successfully, but images cannot be generated without a kid photo",
        };
      }

      // Generate images for each page (in sequence to avoid overwhelming the system)
      const imageGenerationResults = [];
      functions.logger.info(`Starting image generation for ${storyPages.length} pages`);
      
      for (let i = 0; i < storyPages.length; i++) {
        const page = storyPages[i];
        
        // Update progress for images (70% to 95%)
        const imageProgress = 70 + Math.floor(((i + 1) / storyPages.length) * 25);
        await updateStatus(`progress_${imageProgress}`, imageProgress);
        
        functions.logger.info(`Generating image for page ${i + 1}/${storyPages.length}`);
        
        try {
          if (!page.imagePrompt || page.imagePrompt.trim() === '') {
            functions.logger.warn(`Skipping page ${i} - no image prompt`);
            imageGenerationResults.push({ pageNum: i, success: false, error: "No image prompt" });
            continue;
          }

          functions.logger.info(`Calling OpenAI image generation for page ${i} (with ${MAX_IMAGE_RETRIES} retry attempts)`);
          const base64Image = await generatePageImageWithRetry({
            prompt: { id: OPENAI_AGENTS.STORY_PAGE_IMAGE },
            input: [
              {
                role: "user",
                content: [
                  { type: "input_text", text: page.imagePrompt },
                  { type: "input_image", image_url: kidImageUrl },
                ],
              },
            ],
          }, i);

          functions.logger.info(`Image generated, now saving to storage for page ${i}`);
          // Save image to Storage
          const imageStorageUrl = await saveImageToStorage(
            base64Image,
            userId,
            userId,
            storyId,
            'page',
            i
          );

          functions.logger.info(`Image saved to storage: ${imageStorageUrl}, updating Firestore for page ${i}`);
          // Update the page in the local array
          storyPages[i].selectedImageUrl = imageStorageUrl;
          
          // Update the entire pages array in Firestore to preserve all page data
          await storyDocRef.update({
            pages: storyPages.map((page: any, index: number) => ({
              pageNum: index,
              pageType: page.pageType || 'NORMAL',
              storyText: page.storyText || page.text || '',
              imagePrompt: page.imagePrompt || '',
              selectedImageUrl: page.selectedImageUrl || '',
            })),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          });

          imageGenerationResults.push({ pageNum: i, success: true, imageUrl: imageStorageUrl });
          functions.logger.info(`Successfully completed image generation for page ${i + 1}/${storyPages.length}`);
        } catch (imageError) {
          functions.logger.error(`ERROR: Failed to generate image for page ${i}/${storyPages.length}:`, imageError);
          functions.logger.error(`Error details:`, {
            message: imageError instanceof Error ? imageError.message : "Unknown error",
            stack: imageError instanceof Error ? imageError.stack : undefined,
            pageNum: i
          });
          imageGenerationResults.push({ 
            pageNum: i, 
            success: false, 
            error: imageError instanceof Error ? imageError.message : "Unknown error" 
          });
          // Continue to next page even if this one failed
          functions.logger.info(`Continuing to next page after error on page ${i}`);
        }
      }
      
      functions.logger.info(`Completed image generation loop. Results: ${imageGenerationResults.length} total, ${imageGenerationResults.filter(r => r.success).length} successful`);

      // STEP 8: Mark story as complete (100% progress)
      functions.logger.info("Step 8: Marking story as complete");
      await storyDocRef.update({
        status: 'completed',
        progress: 100,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      });

      const successfulImages = imageGenerationResults.filter(r => r.success).length;
      const allImagesSucceeded = successfulImages === storyPages.length;

      // STEP 9: Send email notification to user (only if ALL images succeeded)
      if (allImagesSucceeded) {
        functions.logger.info("Step 9: All images generated successfully, sending story ready email notification");
        try {
          // Get user email from Firebase Auth
          const userRecord = await admin.auth().getUser(userId);
          const userEmail = userRecord.email;

        if (userEmail) {
          // Determine base URL based on environment
          const baseUrls: Record<string, string> = {
            'production': 'https://choice-story.com',
            'development': 'https://staging.choice-story.com'
          };
          const baseUrl = baseUrls[environment] || 'https://staging.choice-story.com';
            
            const storyUrl = `${baseUrl}/stories/${storyId}`;
            
            // Detect language based on content (Hebrew or English)
            const emailLanguage = detectLanguage(kidName, selectedTitle);
            functions.logger.info(`Detected email language: ${emailLanguage}`, { kidName, selectedTitle });
            
            const templateId = getEmailTemplateId(emailLanguage, 'STORY_READY');
            
            const emailResult = await sendEmail({
              to: userEmail,
              templateId: templateId,
              variables: {
                STORY_URL: storyUrl,
                STORY_TITLE: selectedTitle,
              },
            });

            if (emailResult.success) {
              functions.logger.info("Story ready email sent successfully", { emailId: emailResult.id });
            } else {
              functions.logger.warn("Failed to send story ready email", { error: emailResult.error });
            }
          } else {
            functions.logger.warn("User has no email address, skipping notification", { userId });
          }
        } catch (emailError) {
          // Log error but don't fail the story generation
          functions.logger.error("Error sending story ready email:", emailError);
        }
      } else {
        functions.logger.warn(`Not all images generated (${successfulImages}/${storyPages.length}), skipping email notification. User can retry failed images in the UI.`);
      }
      
      return {
        success: true,
        storyId: storyId,
        title: selectedTitle,
        pagesCount: storyPages.length,
        imagesGenerated: successfulImages,
        imageResults: imageGenerationResults,
        message: `Story generated successfully with ${successfulImages}/${storyPages.length} images`,
      };
    } catch (error) {
      functions.logger.error("Error in generateFullStory:", error);
      throw new functions.https.HttpsError(
        "internal",
        `Failed to generate full story: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

