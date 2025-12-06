import { NextRequest, NextResponse } from "next/server";
import firestoreServerService from "@/app/services/firestore.server";
import { verifyAuthHeader } from "@/app/utils/auth-helpers";
import { checkFirestoreReady } from "@/app/utils/api-helpers";

/**
 * POST endpoint to share a kid with an email address
 * Body: { email: string, permission?: 'read' | 'write' }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ kidId: string }> }
): Promise<Response> {
  try {
    // Check if Firestore service is ready before proceeding
    const readyCheck = checkFirestoreReady(request);
    if (readyCheck) return readyCheck;

    // Extract and await kidId before usage
    const { kidId } = await params;
    
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    console.log(`[/api/user/kids/${kidId}/share] POST - Auth header present: ${!!authHeader}`);
    
    const decodedToken = await verifyAuthHeader(authHeader);
    if (!decodedToken) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized",
      }, { status: 401 });
    }
    
    console.log(`[/api/user/kids/${kidId}/share] POST - Token verified, uid: ${decodedToken.uid}`);
    
    // Parse request body
    const body = await request.json();
    const { email, permission = 'read' } = body;
    
    if (!email || typeof email !== 'string') {
      return NextResponse.json({
        success: false,
        error: "Email is required",
      }, { status: 400 });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        success: false,
        error: "Invalid email format",
      }, { status: 400 });
    }
    
    // Validate permission
    if (permission !== 'read' && permission !== 'write') {
      return NextResponse.json({
        success: false,
        error: "Permission must be 'read' or 'write'",
      }, { status: 400 });
    }
    
    console.log(`[/api/user/kids/${kidId}/share] Sharing with email: ${email}, permission: ${permission}`);
    
    // Share the kid
    const result = await firestoreServerService.shareKidWithEmail(
      kidId,
      email,
      decodedToken.uid,
      permission
    );
    
    return NextResponse.json({
      success: true,
      message: `Kid shared successfully with ${email}`,
      data: result,
    }, { status: 200 });
    
  } catch (error) {
    const { kidId } = await params;
    console.error(`[KIDS_API_ERROR] POST /api/user/kids/${kidId}/share:`, error);
    
    return NextResponse.json({
      success: false,
      error: "Failed to share kid",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

/**
 * GET endpoint to get all shares for a kid
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kidId: string }> }
): Promise<Response> {
  try {
    // Check if Firestore service is ready before proceeding
    const readyCheck = checkFirestoreReady(request);
    if (readyCheck) return readyCheck;

    // Extract and await kidId before usage
    const { kidId } = await params;
    
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    const decodedToken = await verifyAuthHeader(authHeader);
    if (!decodedToken) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized",
      }, { status: 401 });
    }
    
    const shares = await firestoreServerService.getKidShares(kidId);
    
    return NextResponse.json({
      success: true,
      shares,
    }, { status: 200 });
    
  } catch (error) {
    const { kidId } = await params;
    console.error(`[KIDS_API_ERROR] GET /api/user/kids/${kidId}/share:`, error);
    
    return NextResponse.json({
      success: false,
      error: "Failed to get shares",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";

