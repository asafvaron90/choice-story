// Temporary staging index - only exports dev- functions
// This file is used for staging deployments to avoid deleting production functions

// Import utils to ensure Firebase Admin initialization happens
import "./lib/utils";

// Export ONLY generated dev- functions (staging)
export * from "./functions/generated-dev-functions";

