/**
 * Type definitions for AI bot responses and parameters
 */

export interface BotResponse {
  data?: unknown;
  status?: string | number;
  [key: string]: unknown;
}

export interface BotParams {
  [key: string]: unknown;
}

export interface BotRequestOptions {
  prompt: string;
  additionalParams?: BotParams;
}
