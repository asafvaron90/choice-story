import { NextRequest, NextResponse } from 'next/server';
import firestoreServerService from '@/app/services/firestore.server';
import { verifyAuthHeader } from '@/app/utils/auth-helpers';

/**
 * GET endpoint to fetch account data by UID
 */
export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    const decodedToken = await verifyAuthHeader(authHeader);
    const _authenticatedUid = decodedToken?.uid;
    
    // Get the requested account UID
    const uid = req.nextUrl.searchParams.get("uid");
    
    if (!uid) {
      return NextResponse.json({
        success: false,
        error: "Missing account UID",
      }, { status: 400 });
    }
    
    const account = await firestoreServerService.getAccountByUid(uid);

    if (!account) {
      return NextResponse.json({
        success: false,
        error: "Account not found",
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      account,
    }, { status: 200 });
  } catch (error) {
    console.error("[ACCOUNT_API_ERROR]", error);
    
    return NextResponse.json({
      success: false,
      error: "Failed to fetch account data",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
} 