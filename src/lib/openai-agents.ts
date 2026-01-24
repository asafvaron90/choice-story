/**
 * OpenAI Agents Configuration
 * Centralized configuration for all OpenAI prompt IDs used in the application
 */

export const OPENAI_AGENTS = {
  //TEXTS RESPONSE
  // Validating uploaded image of kids to match requirements
  IMAGE_VALIDATOR_TEXT: 'pmpt_68f5ff2047c88197a308634afbd5132f02eb2bfabd4c9ca4',
  // Story Titles Creator
  STORY_TITLES_TEXT: 'pmpt_68c9805a3288819596598b4cfc8ba6e1077ae3f79a6fa02f',
  // Story Generation Agent
  STORY_PAGES_TEXT: 'pmpt_68eccc1a52d88197a4eb4b01b55ec9ed0c51c2b70b0f0962',
  // Story Image Prompt Agent
  STORY_IMAGE_PROMPT: 'pmpt_68ece5aeb8e8819797eadd3add0a0bf602ffbf85dcd73618',

  //IMAGES RESPONSE
  // Image Generation Agents
  STORY_COVER_IMAGE: 'pmpt_68ee901cab508194872021a19d9579700e1f53529cfbcead',
} as const;

export type OpenAIAgentType = keyof typeof OPENAI_AGENTS;

/**
 * Get prompt ID for a specific agent
 */
export function getPromptId(agent: OpenAIAgentType): string {
  return OPENAI_AGENTS[agent];
}

