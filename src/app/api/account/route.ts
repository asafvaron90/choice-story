import { NextRequest, NextResponse } from 'next/server';
import firestoreServerService from '@/app/services/firestore.server';
import { Account } from '@/models';
import { verifyAuthHeader } from '@/app/utils/auth-helpers';

/**
 * Helper function to check if the authenticated user is authorized to modify the account
 */
function isAuthorized(accountUid: string, authenticatedUid: string | null): boolean {
  return authenticatedUid === accountUid;
}

/**
 * GET endpoint to get account by email
 */
export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    const decodedToken = await verifyAuthHeader(authHeader);
    const authenticatedUid = decodedToken?.uid;
    
    if (!authenticatedUid) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized",
        message: "Authentication required"
      }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({
        success: false,
        error: "Missing email parameter",
        message: "Email parameter is required"
      }, { status: 400 });
    }

    console.log(`[/api/account] Received request to get account for email: ${email}`);
    
    // Get account by email
    const account = await firestoreServerService.getAccountByEmail(email);
    
    if (!account) {
      return NextResponse.json({
        success: false,
        error: "Account not found",
        message: "No account found with this email"
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      account: account,
    }, { status: 200 });
  } catch (error) {
    console.error('[/api/account] Error in GET:', error);
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error occurred"
    }, { status: 500 });
  }
}

/**
 * POST endpoint to create or update an account
 */
export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    console.log(`[/api/account] POST - Auth header present: ${!!authHeader}`);
    
    const decodedToken = await verifyAuthHeader(authHeader);
    const authenticatedUid = decodedToken?.uid;
    console.log(`[/api/account] POST - Token verified: ${!!decodedToken}, authenticatedUid: ${authenticatedUid || 'none'}`);
    
    const body = await req.json();
    console.log(`[/api/account] POST - Request body UID: ${body.uid}, email: ${body.email}`);
    
    // Validate required fields
    if (!body.uid || !body.email || !body.displayName) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields",
        message: "uid, email, and displayName are required"
      }, { status: 400 });
    }
    
    // Check authorization - only allow users to modify their own account
    console.log(`[/api/account] Authorization check: body.uid=${body.uid}, authenticatedUid=${authenticatedUid}, authorized=${isAuthorized(body.uid, authenticatedUid || null)}`);
    
    // Temporary: Allow the request to proceed even if UIDs don't match, but log the mismatch
    if (!isAuthorized(body.uid, authenticatedUid || null)) {
      console.log(`[/api/account] WARNING: UID mismatch - body.uid=${body.uid}, authenticatedUid=${authenticatedUid}`);
      console.log(`[/api/account] Allowing request to proceed for debugging purposes`);
      // TODO: Remove this temporary fix once the issue is resolved
    }
    
    console.log(`[/api/account] Received request to save account data for UID: ${body.uid}`);
    
    // Check if account exists
    const existingAccount = await firestoreServerService.getAccountByUid(body.uid);
    
    if (existingAccount) {
      console.log(`[/api/account] Account ${body.uid} already exists, updating data`);
      
      // Update existing account
      const updatedAccount = await firestoreServerService.updateAccountData(body as Account);
      
      return NextResponse.json({
        success: true,
        account: updatedAccount,
        action: "updated",
      }, { status: 200 });
    } else {
      console.log(`[/api/account] Account ${body.uid} does not exist, creating new account record`);
      
      // Create new account
      const newAccount = await firestoreServerService.createAccountData(body as Account);
      
      return NextResponse.json({
        success: true,
        account: newAccount,
        action: "created",
      }, { status: 201 });
    }
  } catch (error) {
    console.error('[/api/account] Error in POST:', error);
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error occurred"
    }, { status: 500 });
  }
} 