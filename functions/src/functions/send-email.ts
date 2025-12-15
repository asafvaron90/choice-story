import * as functions from "firebase-functions/v1";
import { admin } from "../lib/utils";
import { sendEmail, EmailTemplateId, EMAIL_TEMPLATES, TEMPLATE_VARIABLES } from "../email-service";

/**
 * Send Email - HTTP Function
 * Sends an email using Resend templates
 * 
 * Request body:
 * {
 *   "to": "recipient@example.com",
 *   "templateId": "WELCOME",
 *   "variables": {
 *     "name": "John",
 *     "orderNumber": 12345
 *   }
 * }
 * 
 * Authentication: Bearer token in Authorization header (Firebase ID token)
 */
export const sendEmailFunction = functions.runWith({
  timeoutSeconds: 60,
  memory: '1GB',
  // Allow outgoing network requests for Resend API
  ingressSettings: 'ALLOW_ALL',
}).https.onRequest(async (request, response) => {
  // Only allow POST requests
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    // Verify authentication
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      response.status(401).json({ error: "Unauthorized: Missing or invalid authorization header" });
      return;
    }

    const idToken = authHeader.split("Bearer ")[1];
    
    try {
      await admin.auth().verifyIdToken(idToken);
    } catch (authError) {
      console.error("Unauthorized: Invalid token", authError);
      response.status(401).json({ error: "Unauthorized: Invalid token" });
      return;
    }

    // Parse request body
    const { to, templateId, variables } = request.body;

    // Validate required fields
    if (!to || typeof to !== "string") {
      response.status(400).json({ error: "Missing or invalid 'to' field" });
      return;
    }

    if (!templateId || typeof templateId !== "string") {
      response.status(400).json({ error: "Missing or invalid 'templateId' field" });
      return;
    }

    // Validate templateId is a known template
    if (!(templateId in EMAIL_TEMPLATES)) {
      response.status(400).json({ 
        error: `Unknown templateId: ${templateId}`,
        validTemplates: Object.keys(EMAIL_TEMPLATES)
      });
      return;
    }

    // Validate variables if provided
    if (variables !== undefined && (typeof variables !== "object" || variables === null || Array.isArray(variables))) {
      response.status(400).json({ error: "'variables' must be a JSON object" });
      return;
    }

    // Get expected variables for this template
    const typedTemplateId = templateId as EmailTemplateId;
    const expectedVariables = TEMPLATE_VARIABLES[typedTemplateId];

    // Validate that provided variables match expected ones
    if (variables) {
      const providedKeys = Object.keys(variables);
      const unexpectedKeys = providedKeys.filter(key => !expectedVariables.includes(key));
      
      if (unexpectedKeys.length > 0) {
        response.status(400).json({
          error: `Unexpected variables for template '${templateId}': ${unexpectedKeys.join(', ')}`,
          expectedVariables,
        });
        return;
      }
    }

    // Send the email
    const result = await sendEmail({
      to,
      templateId: typedTemplateId,
      variables,
    });

    if (result.success) {
      response.status(200).json({
        success: true,
        id: result.id,
        message: "Email sent successfully",
      });
    } else {
      response.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    functions.logger.error("Error in sendEmailFunction:", error);
    response.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

