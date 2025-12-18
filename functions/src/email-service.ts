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

// Template IDs mapping constant names to Resend template UUIDs
export const EMAIL_TEMPLATES = {
  TEST: '27f7dd64-f5e4-4274-ac8a-7751dca3bccb',
  // Add more templates here as needed
  // WELCOME: '5e4d5e4d-5e4d-5e4d-5e4d-5e4d5e4d5e4d',
  // ORDER_CONFIRMATION: '...',
} as const;

export type EmailTemplateId = keyof typeof EMAIL_TEMPLATES;

// ============================================
// Template Variables - Define variables for each template
// ============================================

/**
 * Variables for TEST template
 * Add properties as your template requires them
 */
export interface TestTemplateVariables {
  SHARE_URL: string;
}

/**
 * Variables for WELCOME template (example for future use)
 */
// export interface WelcomeTemplateVariables {
//   userName: string;
//   accountType: string;
// }

/**
 * Variables for ORDER_CONFIRMATION template (example for future use)
 */
// export interface OrderConfirmationTemplateVariables {
//   orderNumber: number;
//   customerName: string;
//   totalAmount: number;
//   orderDate: string;
// }

// ============================================
// Template Variables Mapping
// ============================================

/**
 * Maps each template ID to its specific variables type
 */
export interface TemplateVariablesMap {
  TEST: TestTemplateVariables;
  // WELCOME: WelcomeTemplateVariables;
  // ORDER_CONFIRMATION: OrderConfirmationTemplateVariables;
}

/**
 * Available variable names for each template (for runtime validation)
 */
export const TEMPLATE_VARIABLES: Record<EmailTemplateId, string[]> = {
  TEST: [
    'SHARE_URL',
  ],
  // WELCOME: ['userName', 'accountType'],
  // ORDER_CONFIRMATION: ['orderNumber', 'customerName', 'totalAmount', 'orderDate'],
};

/**
 * Email send request with type-safe variables
 */
export interface SendEmailRequest<T extends EmailTemplateId = EmailTemplateId> {
  to: string;
  templateId: T;
  variables?: T extends keyof TemplateVariablesMap ? TemplateVariablesMap[T] : never;
}

/**
 * Email send response
 */
export interface SendEmailResponse {
  success: boolean;
  id?: string;
  error?: string;
}

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

