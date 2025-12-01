/**
 * API Response Models
 * This file contains standard response shapes for API endpoints
 */
import { z } from 'zod';
import { KidDetails, Story, Account } from './domain-models';

// Base success response interface
export interface ApiSuccessResponse<T> {
  success: true;
  data?: T;
  message?: string;
}

// Base error response interface
export interface ApiErrorResponse {
  success: false;
  error: string;
  message?: string;
  details?: unknown;
}

// Combined API response type
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// Common response fields
interface BaseApiResponseFields {
  success: boolean;
  error?: string;
  message?: string;
}

// Common action field for create/update operations
interface ActionResponseFields {
  action?: 'created' | 'updated';
}

// Schema for Name
const NameSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string(),
  languageCode: z.enum(['he', 'en']).default('he')
});

// Zod schemas for validating request bodies
export const KidDetailsSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  id: z.string(),
  names: z.array(NameSchema).min(1, "At least one name is required"),
  age: z.number().int().min(1).max(18),
  gender: z.string().min(1, "Gender is required"),
  avatarUrl: z.string().optional(),
  imageAnalysis: z.string().optional(),
  stories: z.array(z.any()).optional(),
  stories_created: z.number().int().min(0).optional(),
});

export const KidCreateRequestSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  kid: KidDetailsSchema.omit({ id: true }),
});

export const KidUpdateRequestSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  kid: KidDetailsSchema.extend({
    id: z.string().min(1, "Kid ID is required for updates")
  }),
});

// Specific API response types
export interface UserApiResponse extends BaseApiResponseFields, ActionResponseFields {
  user?: Account;
}

export interface KidApiResponse extends BaseApiResponseFields, ActionResponseFields {
  kid?: KidDetails;
  kidId?: string;
}

export interface KidsApiResponse extends BaseApiResponseFields {
  kids?: KidDetails[];
}

export interface StoryApiResponse extends BaseApiResponseFields {
  story?: Story;
  storyId?: string;
}

/**
 * Schema for validating User data
 */
export const UserDataSchema = z.object({
  uid: z.string().min(1, "User ID is required"),
  email: z.string().email("Valid email is required"),
  displayName: z.string().optional(),
  photoURL: z.string().optional(),
  phoneNumber: z.string().optional(),
  createAt: z.string().optional(),
  lastUpdated: z.string().optional(),
});

/**
 * Schema for updating User data
 * Similar to UserDataSchema but with more optional fields
 */
export const UpdateUserDataSchema = z.object({
  uid: z.string().min(1, "User ID is required"),
  email: z.string().email("Valid email is required").optional(),
  displayName: z.string().optional(),
  photoURL: z.string().optional(),
  phoneNumber: z.string().optional(),
  lastUpdated: z.string().optional(),
});

export const GetKidResponseSchema = z.object({
  kid: KidDetailsSchema,
  stories: z.array(z.unknown()).optional(),
});