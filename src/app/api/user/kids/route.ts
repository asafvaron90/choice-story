import { NextRequest, NextResponse } from "next/server";
import firestoreServerService from "@/app/services/firestore.server";
import { verifyAuthHeader } from "@/app/utils/auth-helpers";

/**
 * GET endpoint to fetch all kids for a user
 */
export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    console.log(`[/api/user/kids] Auth header present: ${!!authHeader}`);
    
    const decodedToken = await verifyAuthHeader(authHeader);
    console.log(`[/api/user/kids] Token verified: ${!!decodedToken}, uid: ${decodedToken?.uid || 'none'}`);
    
    const _authenticatedUid = decodedToken?.uid;
    
    const userId = req.nextUrl.searchParams.get("userId");
    console.log(`[/api/user/kids] Requested userId: ${userId}`);
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: "Missing user ID",
      }, { status: 400 });
    }
    
    const kids = await firestoreServerService.getKids(userId);
    
    return NextResponse.json({
      success: true,
      kids,
    }, { status: 200 });
  } catch (error) {
    console.error("[KIDS_API_ERROR]", error);
    
    return NextResponse.json({
      success: false,
      error: "Failed to fetch kids data",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

export const dynamic = "force-dynamic"; 