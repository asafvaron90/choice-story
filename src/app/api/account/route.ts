import { NextRequest, NextResponse } from 'next/server';
import firestoreServerService from '@/app/services/firestore.server';
import { Account } from '@/models';
import { verifyAuthHeader } from '@/app/utils/auth-helpers';
import * as Sentry from '@sentry/nextjs';
import { logger } from '@/lib/logger';

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
  logger.info({ message: 'GET /api/account called' });
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "GET /api/account",
    },
    async (span) => {
      try {
        // Verify authentication
        const authHeader = req.headers.get('Authorization');
        const decodedToken = await verifyAuthHeader(authHeader);
        const authenticatedUid = decodedToken?.uid;
        
        span.setAttribute("authenticated_uid", authenticatedUid || "none");
        
        if (!authenticatedUid) {
          span.setAttribute("error_type", "unauthorized");
          return NextResponse.json({
            success: false,
            error: "Unauthorized",
            message: "Authentication required"
          }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const email = searchParams.get('email');
        span.setAttribute("request_email", email || "missing");
        
        if (!email) {
          span.setAttribute("error_type", "validation_error");
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
          span.setAttribute("error_type", "not_found");
          span.setAttribute("response_status", "not_found");
          return NextResponse.json({
            success: false,
            error: "Account not found",
            message: "No account found with this email"
          }, { status: 404 });
        }

        span.setAttribute("response_status", "success");
        return NextResponse.json({
          success: true,
          account: account,
        }, { status: 200 });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        
        logger.error({ message: 'Error in GET /api/account', error });
        console.error('[/api/account] Error in GET:', error);
        
        span.setAttribute("error_type", "exception");
        span.setAttribute("error_message", errorMessage);
        span.setAttribute("response_status", "error");
        
        Sentry.captureException(error, {
          tags: {
            endpoint: "/api/account",
            method: "GET"
          }
        });
        
        return NextResponse.json({
          success: false,
          error: "Internal server error",
          message: errorMessage
        }, { status: 500 });
      }
    }
  );
}

/**
 * Helper function to normalize account data and convert date strings to Date objects
 */
function normalizeAccountData(body: unknown): Account {
  const data = body as Record<string, unknown>;
  
  // Convert date strings to Date objects if they exist
  console.log('Normalizing account data:', data);
  const createAt = data.createAt
    ? (data.createAt instanceof Date ? data.createAt : new Date(data.createAt as string))
    : new Date();
  
  const lastUpdated = data.lastUpdated
    ? (data.lastUpdated instanceof Date ? data.lastUpdated : new Date(data.lastUpdated as string))
    : new Date();
  
  // Build account object, only including defined values
  const account: Account = {
    uid: data.uid as string,
    email: data.email as string,
    createAt,
    lastUpdated,
  };
  
  // Only add optional fields if they are defined
  if (data.displayName !== undefined) {
    account.displayName = data.displayName as string;
  }
  if (data.photoURL !== undefined) {
    account.photoURL = data.photoURL as string;
  }
  if (data.phoneNumber !== undefined) {
    account.phoneNumber = data.phoneNumber as string;
  }
  if (data.metadata !== undefined) {
    account.metadata = (data.metadata as Record<string, unknown>) || {};
  }
  
  return account;
}

/**
 * POST endpoint to create or update an account
 */
export async function POST(req: NextRequest) {
  logger.info({ message: 'POST /api/account called' });
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "POST /api/account",
    },
    async (span) => {
      let requestBody: unknown = null;
      
      try {
        // Verify authentication
        const authHeader = req.headers.get('Authorization');
        console.log(`[/api/account] POST - Auth header present: ${!!authHeader}`);
        
        const decodedToken = await verifyAuthHeader(authHeader);
        const authenticatedUid = decodedToken?.uid;
        console.log(`[/api/account] POST - Token verified: ${!!decodedToken}, authenticatedUid: ${authenticatedUid || 'none'}`);
        
        try {
          requestBody = await req.json();
        } catch (error) {
          logger.error({ message: 'Error parsing request body', error });
          return NextResponse.json({
            success: false,
            error: 'Invalid request body',
            message: 'The request body could not be parsed as JSON.'
          }, { status: 400 });
        }
        
        const body = requestBody as Record<string, unknown>;
        console.log(`[/api/account] POST - Request body UID: ${body.uid}, email: ${body.email}`);
        
        span.setAttribute("request_uid", (body.uid as string) || "missing");
        span.setAttribute("request_email", (body.email as string) || "missing");
        span.setAttribute("authenticated_uid", authenticatedUid || "none");
        
        // Validate required fields
        if (!body.uid || !body.email) {
          span.setAttribute("error_type", "validation_error");
          span.setAttribute("error_message", "Missing required fields");
          return NextResponse.json({
            success: false,
            error: "Missing required fields",
            message: "uid and email are required"
          }, { status: 400 });
        }
        
        // Check authorization - only allow users to modify their own account
        console.log(`[/api/account] Authorization check: body.uid=${body.uid}, authenticatedUid=${authenticatedUid}, authorized=${isAuthorized(body.uid as string, authenticatedUid || null)}`);
        
        if (!isAuthorized(body.uid as string, authenticatedUid || null)) {
          span.setAttribute("error_type", "unauthorized");
          return NextResponse.json({
            success: false,
            error: "Unauthorized",
            message: "User is not authorized to modify this account"
          }, { status: 401 });
        }
        
        console.log(`[/api/account] Received request to save account data for UID: ${body.uid}`);
        
        // Normalize account data (convert date strings to Date objects)
        const accountData = normalizeAccountData(requestBody);
        
        console.log('[/api/account] Normalized account data:', accountData);

        // Check if account exists
        const existingAccount = await firestoreServerService.getAccountByUid(body.uid as string);
        
        if (existingAccount) {
          console.log(`[/api/account] Account ${body.uid} already exists, updating data`);
          span.setAttribute("action", "update");
          
          // Update existing account
          const updatedAccount = await firestoreServerService.updateAccountData(accountData);
          
          span.setAttribute("response_status", "success");
          return NextResponse.json({
            success: true,
            account: updatedAccount,
            action: "updated",
          }, { status: 200 });
        } else {
          console.log(`[/api/account] Account ${body.uid} does not exist, creating new account record`);
          span.setAttribute("action", "create");
          
          // Create new account
          const newAccount = await firestoreServerService.createAccountData(accountData);
          
          span.setAttribute("response_status", "success");
          return NextResponse.json({
            success: true,
            account: newAccount,
            action: "created",
          }, { status: 201 });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        const errorStack = error instanceof Error ? error.stack : undefined;
        
        logger.error({ message: 'Error in POST /api/account', error, context: { requestBody } });
        console.error('[/api/account] Error in POST:', error);
        console.error('[/api/account] Error details:', {
          message: errorMessage,
          stack: errorStack,
          requestBody
        });
        
        span.setAttribute("error_type", "exception");
        span.setAttribute("error_message", errorMessage);
        span.setAttribute("response_status", "error");
        
        // Capture exception in Sentry with context
        Sentry.captureException(error, {
          tags: {
            endpoint: "/api/account",
            method: "POST"
          },
          extra: {
            requestBody: requestBody || "Failed to parse request body",
            authenticatedUid: req.headers.get('Authorization') ? "present" : "missing"
          }
        });
        
        return NextResponse.json({
          success: false,
          error: "Internal server error",
          message: errorMessage
        }, { status: 500 });
      }
    }
  );
} 