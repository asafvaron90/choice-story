/**
 * Image Generation Models
 * This file contains models related to image generation service
 */

// Base model for all image generation requests
export interface BaseImageGenerationModel {
  image_url: string; // This is used internally
  input_image?: string; // This is what Replicate API expects
  num_steps?: number;
  num_outputs?: number;
  guidance_scale?: number;
  negative_prompt?: string;
  imageAnalysis: string;
}

export type ValidStyleName =
  | "(No style)"
  | "Cinematic"
  | "Disney Charactor"
  | "Digital Art"
  | "Photographic (Default)"
  | "Fantasy art"
  | "Neonpunk"
  | "Enhance"
  | "Comic book"
  | "Lowpoly"
  | "Line art";

// Model for avatar generation
export interface AvatarGenerationModel extends BaseImageGenerationModel {
  gender?: string;
  age?: number;
  style_name?: ValidStyleName;
  style_strength_ratio?: number;
}

// Model for story page generation
export interface StoryPageGenerationModel extends BaseImageGenerationModel {
  prompt?: string;
  pageType: 'cover' | 'story';
  style?: string;
  style_preset?: string;
  image_resolution?: string;
  scheduler?: string;
  seed?: number;
  guidance_scale?: number;
  style_strength_ratio?: number;
  negative_prompt?: string;
  // Additional parameters for cover generation
  age?: number;
  gender?: string;
  title?: string;
  problem?: string;
}

// Model for story choice generation
export interface StoryChoiceGenerationModel extends BaseImageGenerationModel {
  outcome: 'good' | 'bad';
  choiceTitle: string;
  choiceDescription: string;
  age?: number;
  gender?: string;
  problem?: string;
  style?: string;
  image_resolution?: string;
  scheduler?: string;
  seed?: number;
}

export interface ImageGenerationResponse {
  success: boolean;
  imageUrls?: string[];
  error?: string;
} 