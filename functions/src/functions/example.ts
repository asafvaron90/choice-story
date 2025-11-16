import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { getDb, getEnvironment, getFirestoreHelper } from "../lib/utils";

/**
 * Example HTTP Cloud Function
 * You can call this from your Next.js app or directly via HTTP
 */
export const healthCheck = functions.https.onRequest((request, response) => {
  response.status(200).send("OK");
});

/**
 * Debug Environment and Collections
 * Helps debug collection path issues
 */
export const debugEnvironment = functions.https.onRequest(async (request, response) => {
  try {
    const environment = getEnvironment();
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

/**
 * Example Callable Cloud Function
 * Can be called from your Next.js app using the Firebase SDK
 */
export const addMessage = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context?.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const { text } = data;

  // Add message to Firestore
  const messageRef = await getDb().collection("messages").add({
    text,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    uid: context.auth.uid,
  });

  return { id: messageRef.id };
});

/**
 * Example Firestore Trigger
 * Automatically triggered when a document is created/updated/deleted
 */
export const onUserCreate = functions.firestore
  .document("users/{userId}")
  .onCreate(async (snapshot, context) => {
    const userData = snapshot.data();
    functions.logger.info(`New user created: ${context.params.userId}`, userData);

    // You can perform additional operations here
    // For example, send a welcome email, create default data, etc.

    return null;
  });

/**
 * Example Scheduled Function (Cron Job)
 * Runs every day at midnight UTC
 */
export const scheduledFunction = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async (_context) => {
    functions.logger.info("Running scheduled function");

    // Your scheduled task logic here
    // For example: cleanup old data, send reports, etc.

    return null;
  });

