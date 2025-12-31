/**
 * Email Template Constants - Single Source of Truth
 * 
 * This file contains all email template configuration:
 * - Template IDs (keys) for type safety
 * - Template UUIDs from Resend
 * - Variable definitions for each template
 * 
 * Used by both client-side (Next.js) and server-side (Firebase Functions) code.
 * 
 * To update template UUIDs, run: `npm run upload:email-templates`
 * 
 * @example Client usage
 * import { getShareKidTemplateId } from '@/constants/email-templates';
 * const templateId = getShareKidTemplateId(language);
 * 
 * @example Server usage
 * import { EMAIL_TEMPLATES, TEMPLATE_VARIABLES } from '../src/constants/email-templates';
 * const uuid = EMAIL_TEMPLATES[templateId];
 */

// ============================================
// Template IDs and UUIDs
// ============================================

/**
 * Template IDs mapping to Resend template UUIDs
 * Run `npm run upload:email-templates` to create/update templates and get UUIDs
 */
export const EMAIL_TEMPLATES = {
  SHARE_KID_EN: '212fefb1-a145-4762-8a6f-aed91926026b',
  SHARE_KID_HE: '1bfc1847-733d-4ccb-853c-03d0f3dba81e',
  STORY_READY_EN: 'cdde88b2-fc1b-4d74-9c91-f5446b5a2f0f',
  STORY_READY_HE: 'cdec5dd2-6eea-4420-b5b1-c1a022a8396f',
} as const;

export type EmailTemplateId = keyof typeof EMAIL_TEMPLATES;

// ============================================
// Template Variables - Define variables for each template
// ============================================

/**
 * Variables for Share Kid templates (Hebrew and English)
 */
export interface ShareKidTemplateVariables {
  SHARE_URL: string;
}

/**
 * Variables for Story Ready templates (Hebrew and English)
 */
export interface StoryReadyTemplateVariables {
  STORY_URL: string;
  STORY_TITLE: string;
}

/**
 * Maps each template ID to its specific variables type
 */
export interface TemplateVariablesMap {
  SHARE_KID_HE: ShareKidTemplateVariables;
  SHARE_KID_EN: ShareKidTemplateVariables;
  STORY_READY_EN: StoryReadyTemplateVariables;
  STORY_READY_HE: StoryReadyTemplateVariables;
}

/**
 * Available variable names for each template (for runtime validation)
 */
export const TEMPLATE_VARIABLES: Record<EmailTemplateId, string[]> = {
  SHARE_KID_HE: ['SHARE_URL'],
  SHARE_KID_EN: ['SHARE_URL'],
  STORY_READY_EN: ['STORY_URL', 'STORY_TITLE'],
  STORY_READY_HE: ['STORY_URL', 'STORY_TITLE'],
};

// ============================================
// Template Categories and Mapping
// ============================================

/**
 * Template categories (without language suffix)
 * Add new categories here when creating new templates
 */
export type EmailTemplateCategory = 
  | 'SHARE_KID'
  | 'STORY_READY'
  // Add more template categories here as you create them:
  // | 'WELCOME'
  // | 'PASSWORD_RESET'
  ;

/**
 * Mapping from template category + language to specific template ID
 * This ensures every category has both English and Hebrew versions
 */
const TEMPLATE_CATEGORY_MAP: Record<EmailTemplateCategory, Record<'en' | 'he', EmailTemplateId>> = {
  SHARE_KID: {
    en: 'SHARE_KID_EN',
    he: 'SHARE_KID_HE',
  },
  STORY_READY: {
    en: 'STORY_READY_EN',
    he: 'STORY_READY_HE',
  },
  // Add new template mappings here:
  // WELCOME: {
  //   en: 'WELCOME_EN',
  //   he: 'WELCOME_HE',
  // },
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get the appropriate email template ID based on language and category
 * 
 * @param language - The language code ('en' or 'he')
 * @param category - The template category (e.g., 'SHARE_KID', 'WELCOME')
 * @returns The specific template ID for that language and category
 * 
 * @example
 * const templateId = getEmailTemplateId('he', 'SHARE_KID');
 * // Returns 'SHARE_KID_HE'
 * 
 * @example
 * const templateId = getEmailTemplateId('en', 'WELCOME');
 * // Returns 'WELCOME_EN'
 */
export function getEmailTemplateId(
  language: 'en' | 'he',
  category: EmailTemplateCategory
): EmailTemplateId {
  return TEMPLATE_CATEGORY_MAP[category][language];
}

// ============================================
// Type Definitions for Email Service
// ============================================

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

