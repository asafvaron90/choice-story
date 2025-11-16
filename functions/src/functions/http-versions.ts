import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { generateImage } from "../image-generation";
import { OPENAI_AGENTS } from "../open-ai-agents";
import { getFirestoreHelper, saveImageToStorage, getEnvironment } from "../lib/utils";

// HTTP VERSIONS (for direct fetch/axios calls)

/**
 * Generate Story Page Image (HTTP API)
 * Same as callable version but works with fetch/axios
 * 
 * POST /generateStoryPageImageHttp
 * Headers: { "Authorization": "Bearer <firebase-token>" }
 * Body: {
 *   "imagePrompt": "detailed image prompt",
 *   "imageUrl": "url_to_kid_photo",
 *   "accountId": "account_id",
 *   "userId": "user_id",
 *   "storyId": "story_id",
 *   "pageNum": 1 (optional)
 * }
 */
export const generateStoryPageImageHttp = functions.runWith({
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

      const environment = getEnvironment();
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

/**
 * Generate Story Cover Image (HTTP API)
 * Same as callable version but works with fetch/axios
 */
export const generateStoryCoverImageHttp = functions.runWith({
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

      const environment = getEnvironment();
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

