// AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
// This file is generated automatically by scripts/generate-dev-functions.ts
// Run 'npm run generate:dev-functions' to regenerate

import * as functions from "firebase-functions/v1";
import { getDb, getFirestoreHelper, saveImageToStorage } from "../lib/utils";
import * as admin from "firebase-admin";
import { generateText } from "../text-generation";
import { generateImage } from "../image-generation";
import { OPENAI_AGENTS } from "../open-ai-agents";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

// ============================================================================
// GENERATED DEV- FUNCTIONS (STAGING)
// ============================================================================

export const devHealthCheck = functions.runWith({
  memory: '512MB'
}).https.onRequest((request, response) => {
  response.status(200).send("OK");
});

export const devDebugEnvironment = functions.runWith({
  memory: '512MB'
}).https.onRequest(async (request, response) => {
  try {
    const environment = 'development';
    const dbHelper = getFirestoreHelper(environment);
    const storiesCollection = dbHelper.getStoriesCollection();
    
    // List all collections
    const collections = await getDb().listCollections();
    const collectionNames = collections.map(col => col.id);
    
    // Check if the expected collection exists
    const expectedCollectionExists = collectionNames.includes(storiesCollection);
    
    // If a storyId is provided, check if the document exists
    const { storyId } = request.query;
    let documentExists = false;
    let documentData = null;
    
    if (storyId && expectedCollectionExists) {
      try {
        const storyRef = getDb().collection(storiesCollection).doc(storyId as string);
        const docSnapshot = await storyRef.get();
        documentExists = docSnapshot.exists;
        documentData = docSnapshot.exists ? docSnapshot.data() : null;
      } catch (docError) {
        console.error("Error checking document:", docError);
      }
    }
    
    response.json({
      environment,
      storiesCollection,
      expectedCollectionExists,
      availableCollections: collectionNames,
      storyId: storyId || null,
      documentExists,
      documentData: documentData ? Object.keys(documentData) : null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export const devGenerateFullStory = functions.runWith({
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
      const environment = 'development';
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

          functions.logger.info(`Calling OpenAI image generation for page ${i}`);
          const base64Image = await generateImage({
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
          });

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

export const devGenerateStoryPageImageHttp = functions.runWith({
  timeoutSeconds: 540,
  memory: '2GB'
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

      const environment = 'development';
      const { imagePrompt, imageUrl, accountId, userId, storyId, pageNum, updatePath } = request.body;

      if (!imagePrompt || !imageUrl || !accountId || !userId || !storyId) {
        response.status(400).json({
          error: 'Missing required fields',
          required: ['imagePrompt', 'imageUrl', 'accountId', 'userId', 'storyId']
        });
        return;
      }

      // Check if story exists before generating image
      const dbHelper = getFirestoreHelper(environment);
      
      console.log("DEBUG: Environment and collection info (HTTP):", {
        environment,
        storiesCollection: dbHelper.getStoriesCollection(),
        storyId,
      });
      
      // Get the document from the correct collection
      const storyDoc = await dbHelper.getStory(storyId);
      
      console.log("DEBUG: Document snapshot (HTTP):", {
        collection: dbHelper.getStoriesCollection(),
        exists: storyDoc.exists,
        id: storyDoc.id,
        hasData: storyDoc.exists ? Object.keys(storyDoc.data() || {}).length : 0
      });
      
      if (!storyDoc.exists) {
        const errorMessage = `Story document not found: ${storyId}`;
        console.error(errorMessage);
        
        response.status(404).json({
          error: errorMessage,
          storyId,
          environment
        });
        return;
      }
      
      console.log("Story found successfully (HTTP):", {
        storyId,
        storyTitle: storyDoc.data()?.title || 'No title',
        storyExists: storyDoc.exists
      });

      // Generate the page image
      const base64Image = await generateImage({
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

      // Save to Firebase Storage
      const storageUrl = await saveImageToStorage(
        base64Image,
        accountId,
        userId,
        storyId,
        'page',
        pageNum
      );

      // Update Firestore with page image URL using updatePath from client
      if (storyId && updatePath) {
        console.log("Using updatePath from client (HTTP):", updatePath);
        
        // Use updatePath directly - no parsing needed
        const updateData: Record<string, admin.firestore.FieldValue | string> = {
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          [updatePath]: storageUrl
        };

        console.log("Updating Firestore with (HTTP):", {
          field: updatePath,
          value: storageUrl
        });

        // Get the story reference using storyId (environment already extracted from request.body)
        const dbHelper = getFirestoreHelper(environment);
        const storyRef = dbHelper.getStoryRef(storyId);

        // Check if document exists before updating
        const docSnapshot = await storyRef.get();
        if (!docSnapshot.exists) {
          console.error(`Story document does not exist: ${storyId}`);
          response.status(404).json({
            success: false,
            error: `Story document not found: ${storyId}`
          });
          return;
        }

        await storyRef.update(updateData);
        console.log(`Updated Firestore for story ${storyId}`);

        response.status(200).json({
          success: true,
          imageUrl: storageUrl,
        });
      } else {
        // If no updatePath provided, return error
        response.status(400).json({
          success: false,
          error: 'updatePath is required'
        });
        return;
      }
    } catch (error) {
      functions.logger.error("Error generating story page image (HTTP):", error);
      response.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export const devGenerateStoryCoverImageHttp = functions.runWith({
  timeoutSeconds: 540,
  memory: '2GB'
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

      const environment = 'development';
      const { imageStyle, imageUrl, storyTitle, imagePrompt, accountId, userId, storyId } = request.body;

      if (!imageStyle || !imageUrl || !storyTitle || !accountId || !userId || !storyId) {
        response.status(400).json({
          error: 'Missing required fields',
          required: ['imageStyle', 'imageUrl', 'storyTitle', 'accountId', 'userId', 'storyId']
        });
        return;
      }

      functions.logger.info("Generating cover image (HTTP) with variables:", {
        imageStyle,
        storyTitle,
        hasImagePrompt: !!imagePrompt,
        hasImageUrl: !!imageUrl,
        environment
      });

      // Build variables for the prompt
      const variables: Record<string, string> = {
        image_style: imageStyle,
        image_url: imageUrl,
        story_title: storyTitle,
        image_prompt: imagePrompt || `Create a ${imageStyle} style cover image for the story titled: "${storyTitle}"`
      };

      // Generate the cover image with variables
      const base64Image = await generateImage({
        prompt: { 
          id: OPENAI_AGENTS.STORY_COVER_IMAGE,
          variables: variables
        },
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: "" },
              { type: "input_image", image_url: imageUrl },
            ],
          },
        ],
      });

      // Save to Firebase Storage
      const storageUrl = await saveImageToStorage(
        base64Image,
        accountId,
        userId,
        storyId,
        'cover'
      );

      functions.logger.info("Step 2: Updating Firestore with cover image (HTTP)", {
        storageUrl,
        storyId,
        environment
      });

      // Update Firestore with cover image URL using environment-based collection
      const dbHelper = getFirestoreHelper(environment);
      
      // Get the document from the correct collection
      const docSnapshot = await dbHelper.getStory(storyId);
      
      if (!docSnapshot.exists) {
        response.status(404).json({
          error: `Story not found: ${storyId}`,
          storyId,
          collection: dbHelper.getStoriesCollection()
        });
        return;
      }
      
      const storyRef = dbHelper.getStoryRef(storyId);

      await storyRef.update({
        coverImageUrl: storageUrl,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      functions.logger.info(`Successfully updated cover image for story ${storyId} (HTTP)`);

      response.status(200).json({
        success: true,
        imageUrl: storageUrl,
      });
    } catch (error) {
      functions.logger.error("Error generating story cover image (HTTP):", error);
      response.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export const devGenerateImageFunction = functions.runWith({
  timeoutSeconds: 540,
  memory: '2GB'
}).https.onCall(
  async (data, context) => {
    // Check if user is authenticated
    if (!context?.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
      );
    }

    try {
      const { prompt, input } = data;

      if (!prompt?.id || !input) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "prompt.id and input are required"
        );
      }

      // Generate image (returns base64)
      const base64Image = await generateImage({ prompt, input });

      return {
        success: true,
        base64: base64Image,
      };
    } catch (error) {
      functions.logger.error("Error generating image:", error);
      throw new functions.https.HttpsError(
        "internal",
        `Failed to generate image: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

export const devGenerateImagePromptAndImage = functions.runWith({
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
      const environment = 'development';
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

export const devGenerateKidAvatarImage = functions.runWith({
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
      const environment = 'development';
      const { imageUrl, accountId, userId } = data;

      if (!imageUrl || !accountId || !userId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "imageUrl, accountId, and userId are required"
        );
      }

      // Generate the avatar image
      const base64Image = await generateImage({
        prompt: { id: OPENAI_AGENTS.KID_AVATAR_IMAGE },
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: "Create a Pixar-style avatar image for this child." },
              { type: "input_image", image_url: imageUrl },
            ],
          },
        ],
      });

      // Save to Firebase Storage
      const storageUrl = await saveImageToStorage(
        base64Image,
        accountId,
        userId,
        '', // storyId not needed for avatar
        'avatar'
      );

      // Update Firestore with avatar URL
      // Kids are stored in users_{environment} collection with kidId as document ID
      const dbHelper = getFirestoreHelper(environment);
      await dbHelper.updateKid(userId, { // userId is actually the kidId in this context
        avatarUrl: storageUrl,
      });

      return {
        success: true,
        imageUrl: storageUrl,
      };
    } catch (error) {
      functions.logger.error("Error generating kid avatar image:", error);
      throw new functions.https.HttpsError(
        "internal",
        `Failed to generate kid avatar image: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

export const devGenerateStoryPageImage = functions.runWith({
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
      const environment = 'development';
      // FIXME: pageNum is undefined. currenlty extracted from updatePath - not sure we need it. pages is array so we need to update the index (zero-based)
      const { imagePrompt, imageUrl, accountId, userId, storyId, pageNum, updatePath } = data;

      console.log("Firebase function received data:", {
        storyId,
        accountId,
        userId,
        hasImagePrompt: !!imagePrompt,
        pageNum,
        updatePath,
        environment
      });

      if (!imagePrompt || !imageUrl || !accountId || !userId || !storyId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "imagePrompt, imageUrl, accountId, userId, and storyId are required"
        );
      }

      // Note: Story existence check removed - we'll rely on the updatePath from client
      console.log("Using updatePath from client:", updatePath);

      // Generate the page image
      const base64Image = await generateImage({
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

      // Save to Firebase Storage
      const storageUrl = await saveImageToStorage(
        base64Image,
        accountId,
        userId,
        storyId,
        'page',
        pageNum
      );

      // Update Firestore with page image URL using updatePath from client
      if (storyId && updatePath) {
        console.log("Using updatePath from client:", updatePath);

        // Get the story reference using storyId
        const dbHelper = getFirestoreHelper(environment);
        
        console.log("DEBUG: Environment and collection info:", {
          environment,
          storiesCollection: dbHelper.getStoriesCollection(),
          storyId,
        });

        try {
          // Get the document from the correct collection
          const docSnapshot = await dbHelper.getStory(storyId);
          
          console.log("DEBUG: Document snapshot:", {
            collection: dbHelper.getStoriesCollection(),
            exists: docSnapshot.exists,
            id: docSnapshot.id,
            hasData: docSnapshot.exists ? Object.keys(docSnapshot.data() || {}).length : 0
          });
          
          if (!docSnapshot.exists) {
            console.error(`Story document does not exist: ${storyId}`);
            throw new functions.https.HttpsError(
              "not-found",
              `Story document not found: ${storyId}`
            );
          }
          
          const storyRef = dbHelper.getStoryRef(storyId);

          // Correctly handle array update: read-modify-write
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
            updatedPages[pageNum] = {}; // Ensure the page object exists
          }
          updatedPages[pageNum].selectedImageUrl = storageUrl;

          // Write the entire modified array back
          await storyRef.update({
            pages: updatedPages,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          console.log(`Updated Firestore for story ${storyId}, page index: ${pageNum}`);
        } catch (error) {
          console.error(`Failed to update Firestore for story ${storyId}:`, error);
          // Re-throw the error to fail the operation
          throw error;
        }
      } else {
        console.log('No storyId provided, skipping Firestore update (standalone image generation)');
      }

      return {
        success: true,
        imageUrl: storageUrl,
      };
    } catch (error) {
      functions.logger.error("Error generating story page image:", error);
      throw new functions.https.HttpsError(
        "internal",
        `Failed to generate story page image: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

export const devGenerateStoryCoverImage = functions.runWith({
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
      const environment = 'development';
      const { imageStyle, imageUrl, storyTitle, imagePrompt, accountId, userId, storyId } = data;

      if (!imageStyle || !imageUrl || !storyTitle || !accountId || !userId || !storyId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "imageStyle, imageUrl, storyTitle, accountId, userId, and storyId are required"
        );
      }

      functions.logger.info("Generating cover image with variables:", {
        imageStyle,
        storyTitle,
        hasImagePrompt: !!imagePrompt,
        hasImageUrl: !!imageUrl
      });

      // Build variables for the prompt
      const variables: Record<string, string> = {
        image_style: imageStyle,
        image_url: imageUrl,
        story_title: storyTitle,
        image_prompt: imagePrompt || `Create a ${imageStyle} style cover image for the story titled: "${storyTitle}"`
      };

      // Generate the cover image with variables
      const base64Image = await generateImage({
        prompt: { 
          id: OPENAI_AGENTS.STORY_COVER_IMAGE,
          variables: variables
        },
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: "" },
              { type: "input_image", image_url: imageUrl },
            ],
          },
        ],
      });

      // Save to Firebase Storage
      const storageUrl = await saveImageToStorage(
        base64Image,
        accountId,
        userId,
        storyId,
        'cover'
      );

      functions.logger.info("Step 2: Updating Firestore with cover image", {
        storageUrl,
        storyId,
        environment
      });

      // Update Firestore with cover image URL using environment-based collection
      const dbHelper = getFirestoreHelper(environment);
      
      // Get the document from the correct collection
      const docSnapshot = await dbHelper.getStory(storyId);
      
      if (!docSnapshot.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          `Story document not found: ${storyId}`
        );
      }
      
      const storyRef = dbHelper.getStoryRef(storyId);

      await storyRef.update({
        coverImageUrl: storageUrl,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      functions.logger.info(`Successfully updated cover image for story ${storyId}`);

      return {
        success: true,
        imageUrl: storageUrl,
      };
    } catch (error) {
      functions.logger.error("Error generating story cover image:", error);
      throw new functions.https.HttpsError(
        "internal",
        `Failed to generate story cover image: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

export const devGenerateStoryPagesText = functions.runWith({
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

export const devGenerateStoryPagesTextHttp = functions.runWith({
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

export const devGenerateStoryImagePrompt = functions.runWith({
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
      const environment = 'development';
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

export const devGenerateStoryTitles = functions.runWith({
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

export const devGenerateTextFunction = functions.runWith({
  timeoutSeconds: 540,
  memory: '1GB'
}).https.onCall(
  async (data, context) => {
    // Check if user is authenticated
    if (!context?.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
      );
    }

    try {
      const { prompt, input } = data;

      if (!prompt?.id || !input) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "prompt.id and input are required"
        );
      }

      const result = await generateText({ prompt, input });

      return {
        success: true,
        text: result,
      };
    } catch (error) {
      functions.logger.error("Error generating text:", error);
      throw new functions.https.HttpsError(
        "internal",
        `Failed to generate text: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);
