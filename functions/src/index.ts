// Main index file - exports ALL functions (both production and dev)
// This prevents Firebase from deleting production functions when deploying dev functions

// Import utils to ensure Firebase Admin initialization happens
import "./lib/utils";

// Export production functions (individual function files)
export * from "./functions/example";
export * from "./functions/full-story";
export * from "./functions/http-versions";
export * from "./functions/image-generation";
export * from "./functions/image-prompt-and-image";
export * from "./functions/story-images";
export * from "./functions/story-text";
export * from "./functions/story-titles";
export * from "./functions/text-generation";

// Export generated dev- functions (staging/testing)
export * from "./functions/generated-dev-functions";


