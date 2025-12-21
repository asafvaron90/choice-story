// Import shared email template constants
import {
  EMAIL_TEMPLATES,
  TEMPLATE_VARIABLES,
  type EmailTemplateId,
  type SendEmailRequest,
  type SendEmailResponse,
} from "./constants/email-templates";

// Re-export for backward compatibility
export { EMAIL_TEMPLATES, TEMPLATE_VARIABLES };
export type { EmailTemplateId, SendEmailRequest, SendEmailResponse };

// Lazy load Resend to avoid initialization issues with Firebase emulator
let resendClient: import("resend").Resend | null = null;

// Initialize Resend client lazily
const getResendClient = async () => {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not set in environment variables");
    }

    // Dynamic import to avoid issues with emulator network stubbing
    const { Resend } = await import("resend");
    resendClient = new Resend(apiKey);
  }

  return resendClient;
};

/**
 * Send an email using a Resend template
 * @param request - The email request containing recipient and template ID
 * @returns The email send response
 */
export async function sendEmail<T extends EmailTemplateId>(request: SendEmailRequest<T>): Promise<SendEmailResponse> {
  try {
    const resend = await getResendClient();

    // Get the template UUID from our constants
    const templateUuid = EMAIL_TEMPLATES[request.templateId];

    if (!templateUuid) {
      throw new Error(`Unknown template ID: ${request.templateId}`);
    }

    // Fetch the template from Resend
    const templateResponse = await resend.templates.get(templateUuid);

    if (templateResponse.error) {
      throw new Error(`Failed to fetch template: ${templateResponse.error.message}`);
    }

    const template = templateResponse.data;

    if (!template) {
      throw new Error(`Template not found: ${templateUuid}`);
    }

    // Send email using Resend's native template support
    // Resend handles variable replacement automatically
    const emailResponse = await resend.emails.send({
      from: template.from || "support",
      to: request.to,
      template: {
        id: templateUuid,
        variables: (request.variables || {}) as Record<string, string | number>,
      },
    });

    if (emailResponse.error) {
      throw new Error(`Failed to send email: ${emailResponse.error.message}`);
    }

    return {
      success: true,
      id: emailResponse.data?.id,
    };
  } catch (error) {
    console.error("Error sending email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

