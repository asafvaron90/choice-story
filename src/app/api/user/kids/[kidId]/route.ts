import { NextRequest, NextResponse } from "next/server";
import firestoreServerService from "@/app/services/firestore.server";
import { verifyAuthHeader } from "@/app/utils/auth-helpers";

/**
 * GET endpoint to fetch a specific kid by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kidId: string }> }
): Promise<Response> {
  try {
    // Extract and await kidId before usage
    const { kidId } = await params;
    
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    console.log(`[/api/user/kids/${kidId}] Auth header present: ${!!authHeader}`);
    
    const decodedToken = await verifyAuthHeader(authHeader);
    console.log(`[/api/user/kids/${kidId}] Token verified: ${!!decodedToken}, uid: ${decodedToken?.uid || 'none'}`);
    
    const _authenticatedUid = decodedToken?.uid;
    
    const userId = request.nextUrl.searchParams.get("userId");
    console.log(`[/api/user/kids/${kidId}] Requested userId: ${userId}, kidId: ${kidId}`);
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: "Missing user ID",
      }, { status: 400 });
    }
    
    const kid = await firestoreServerService.getKid(userId, kidId);
    
    if (!kid) {
      return NextResponse.json({
        success: false,
        error: "Kid not found",
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      kid,
    }, { status: 200 });
  } catch (error) {
    const { kidId } = await params;
    console.error(`[KIDS_API_ERROR] GET /api/user/kids/${kidId}:`, error);
    
    return NextResponse.json({
      success: false,
      error: "Failed to fetch kid data",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

/**
 * DELETE endpoint to remove a specific kid by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ kidId: string }> }
): Promise<Response> {
  try {
    // Extract and await kidId before usage
    const { kidId } = await params;
    
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    console.log(`[/api/user/kids/${kidId}] DELETE - Auth header present: ${!!authHeader}`);
    
    const decodedToken = await verifyAuthHeader(authHeader);
    console.log(`[/api/user/kids/${kidId}] DELETE - Token verified: ${!!decodedToken}, uid: ${decodedToken?.uid || 'none'}`);
    
    const _authenticatedUid = decodedToken?.uid;
    
    const userId = request.nextUrl.searchParams.get("userId");
    console.log(`[/api/user/kids/${kidId}] DELETE - Requested userId: ${userId}, kidId: ${kidId}`);
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: "Missing user ID",
      }, { status: 400 });
    }
    
    await firestoreServerService.deleteKid(userId, kidId);
    
    return NextResponse.json({
      success: true,
      message: "Kid deleted successfully",
    }, { status: 200 });
  } catch (error) {
    const { kidId } = await params;
    console.error(`[KIDS_API_ERROR] DELETE /api/user/kids/${kidId}:`, error);
    
    return NextResponse.json({
      success: false,
      error: "Failed to delete kid",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

export const dynamic = "force-dynamic"; 