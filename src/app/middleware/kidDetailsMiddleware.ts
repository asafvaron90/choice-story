import { KidDetails, KidDetailsUtils } from "@/models";
import { Language } from "@/app/context/LanguageContext";
import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware functions for processing KidDetails objects
 * to ensure backward compatibility with the name property
 */

/**
 * Processes a KidDetails object to ensure it has a name property
 * based on the current language context
 * 
 * @param kid The KidDetails object to process
 * @param language The language to use for the name property
 * @returns The processed KidDetails object with name property
 */
export function processKidDetails(
  kid: KidDetails | null | undefined, 
  language: Language = 'he'
): KidDetails | null | undefined {
  if (!kid) return kid;
  return KidDetailsUtils.updateNameProperty(kid, language);
}

/**
 * Processes an array of KidDetails objects to ensure they all have
 * a name property based on the current language context
 * 
 * @param kids Array of KidDetails objects to process
 * @param language The language to use for the name properties
 * @returns Array of processed KidDetails objects with name properties
 */
export function processKidDetailsArray(
  kids: KidDetails[], 
  language: Language = 'he'
): KidDetails[] {
  return KidDetailsUtils.updateAllNamesProperties(kids, language);
}

/**
 * Higher-order function that wraps a function that returns KidDetails
 * to ensure the returned object has a name property
 * 
 * @param fn Function that returns a KidDetails object
 * @param language The language to use for the name property
 * @returns A wrapped function that processes the KidDetails before returning
 */
export function withKidDetailsProcessing<Args extends unknown[]>(
  fn: (...args: Args) => Promise<KidDetails | null | undefined>,
  language: Language = 'he'
): (...args: Args) => Promise<KidDetails | null | undefined> {
  return async (...args: Args) => {
    const result = await fn(...args);
    return processKidDetails(result, language);
  };
}

/**
 * Higher-order function that wraps a function that returns an array of KidDetails
 * to ensure all returned objects have a name property
 * 
 * @param fn Function that returns an array of KidDetails objects
 * @param language The language to use for the name properties
 * @returns A wrapped function that processes the KidDetails array before returning
 */
export function withKidDetailsArrayProcessing<Args extends unknown[]>(
  fn: (...args: Args) => Promise<KidDetails[]>,
  language: Language = 'he'
): (...args: Args) => Promise<KidDetails[]> {
  return async (...args: Args) => {
    const results = await fn(...args);
    return processKidDetailsArray(results, language);
  };
}

interface _KidResponse {
  success: boolean;
  error?: string;
  data?: {
    kid: KidDetails;
  };
}

interface _KidsResponse {
  success: boolean;
  error?: string;
  data?: {
    kids: KidDetails[];
  };
}

export async function GET(_request: NextRequest) {
  try {
    // ... existing code ...
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(_request: NextRequest) {
  try {
    // ... existing code ...
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
} 