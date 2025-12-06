import { NextRequest, NextResponse } from "next/server";
import firestoreServerService from "@/app/services/firestore.server";
import { verifyAuthHeader } from "@/app/utils/auth-helpers";
import { checkFirestoreReady } from "@/app/utils/api-helpers";

/**
 * GET endpoint to fetch kids shared with the current user's email
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    // Check if Firestore service is ready before proceeding
    const readyCheck = checkFirestoreReady(request);
    if (readyCheck) return readyCheck;

    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    const decodedToken = await verifyAuthHeader(authHeader);
    
    if (!decodedToken || !decodedToken.email) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized or no email in token",
      }, { status: 401 });
    }
    
    // Get kids shared with this email
    const sharedKids = await firestoreServerService.getKidsSharedWithEmail(decodedToken.email);
    
    return NextResponse.json({
      success: true,
      kids: sharedKids,
    }, { status: 200 });
    
  } catch (error) {
    console.error(`[KIDS_API_ERROR] GET /api/user/kids/shared:`, error);
    
    return NextResponse.json({
      success: false,
      error: "Failed to fetch shared kids",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";

