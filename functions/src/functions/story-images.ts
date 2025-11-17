import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { generateImage } from "../image-generation";
import { OPENAI_AGENTS } from "../open-ai-agents";
import { getFirestoreHelper, saveImageToStorage, getEnvironment } from "../lib/utils";

/**
 * Generate Kid Avatar Image
 * Generates a Pixar-style avatar image for a kid
 * 
 * Request body:
 * {
 *   "imageUrl": "url_to_kid_photo",
 *   "accountId": "account_id",
 *   "userId": "user_id"
 * }
 */
export const generateKidAvatarImage = functions.runWith({
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

/**
 * Generate Story Page Image
 * Generates an image for a specific story page
 * 
 * Request body:
 * {
 *   "imagePrompt": "detailed image prompt",
 *   "imageUrl": "url_to_kid_photo",
 *   "accountId": "account_id",
 *   "userId": "user_id",
 *   "storyId": "story_id",
 *   "pageNum": 1 (optional)
 * }
 */
export const generateStoryPageImage = functions.runWith({
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

/**
 * Generate Story Cover Image
 * Generates a cover image for a story in the specified style
 * 
 * Request body:
 * {
 *   "imageStyle": "3d Pixar",
 *   "imageUrl": "url_to_kid_photo",
 *   "storyTitle": "story title",
 *   "imagePrompt": "optional custom prompt",
 *   "accountId": "account_id",
 *   "userId": "user_id",
 *   "storyId": "story_id"
 * }
 */
export const generateStoryCoverImage = functions.runWith({
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
