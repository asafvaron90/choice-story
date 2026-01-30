"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEMPLATE_VARIABLES = exports.EMAIL_TEMPLATES = void 0;
exports.getEmailTemplateId = getEmailTemplateId;
// ============================================
// Template IDs and UUIDs
// ============================================
/**
 * Template IDs mapping to Resend template UUIDs
 * Run `npm run upload:email-templates` to create/update templates and get UUIDs
 */
exports.EMAIL_TEMPLATES = {
    SHARE_KID_EN: '212fefb1-a145-4762-8a6f-aed91926026b',
    SHARE_KID_HE: '1bfc1847-733d-4ccb-853c-03d0f3dba81e',
    STORY_READY_EN: 'cdde88b2-fc1b-4d74-9c91-f5446b5a2f0f',
    STORY_READY_HE: 'cdec5dd2-6eea-4420-b5b1-c1a022a8396f',
};
/**
 * Available variable names for each template (for runtime validation)
 */
exports.TEMPLATE_VARIABLES = {
    SHARE_KID_HE: ['SHARE_URL'],
    SHARE_KID_EN: ['SHARE_URL'],
    STORY_READY_EN: ['STORY_URL', 'STORY_TITLE'],
    STORY_READY_HE: ['STORY_URL', 'STORY_TITLE'],
};
/**
 * Mapping from template category + language to specific template ID
 * This ensures every category has both English and Hebrew versions
 */
const TEMPLATE_CATEGORY_MAP = {
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
function getEmailTemplateId(language, category) {
    return TEMPLATE_CATEGORY_MAP[category][language];
}
//# sourceMappingURL=email-templates.js.map