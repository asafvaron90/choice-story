import { NextRequest, NextResponse } from 'next/server';
import firestoreServerService from '@/app/services/firestore.server';
import { verifyAuthHeader } from '@/app/utils/auth-helpers';
import { checkFirestoreReady } from '@/app/utils/api-helpers';
import * as Sentry from '@sentry/nextjs';
import { logger } from '@/lib/logger';

/**
 * GET endpoint to fetch all accounts (admin only)
 * This endpoint retrieves all user accounts from the database
 */
export async function GET(req: NextRequest) {
  logger.info({ message: 'GET /api/admin/accounts called' });
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "GET /api/admin/accounts",
    },
    async (span) => {
      try {
        // Check if Firestore service is ready before proceeding
        const readyCheck = checkFirestoreReady(req);
        if (readyCheck) return readyCheck;

        // Verify authentication
        const authHeader = req.headers.get('Authorization');
        const decodedToken = await verifyAuthHeader(authHeader);
        const authenticatedUid = decodedToken?.uid;
        
        span.setAttribute("authenticated_uid", authenticatedUid || "none");
        
        if (!authenticatedUid) {
          span.setAttribute("error_type", "unauthorized");
          logger.warn({ message: 'Unauthorized access attempt to admin accounts endpoint' });
          return NextResponse.json({
            success: false,
            error: "Unauthorized",
            message: "Authentication required"
          }, { status: 401 });
        }

        // Check if user has a role (role-based access control)
        const userAccount = await firestoreServerService.getAccountByUid(authenticatedUid);
        
        if (!userAccount || !userAccount.role) {
          span.setAttribute("error_type", "forbidden_no_role");
          logger.warn({ 
            message: 'Access denied - user has no role',
            uid: authenticatedUid 
          });
          return NextResponse.json({
            success: false,
            error: "Forbidden",
            message: "You do not have permission to access the admin panel. Role required."
          }, { status: 403 });
        }

        span.setAttribute("user_role", userAccount.role);
        console.log(`[/api/admin/accounts] User ${authenticatedUid} with role ${userAccount.role} fetching all accounts`);
        logger.info({ 
          message: 'Fetching all accounts',
          requestedBy: authenticatedUid 
        });
        
        // Fetch all accounts from Firestore
        const accounts = await firestoreServerService.getAllAccounts();
        
        span.setAttribute("accounts_count", accounts.length);
        logger.info({ 
          message: 'Successfully retrieved accounts',
          count: accounts.length 
        });

        return NextResponse.json({
          success: true,
          accounts: accounts,
          count: accounts.length
        }, { status: 200 });

      } catch (error) {
        console.error('[/api/admin/accounts] Error fetching accounts:', error);
        logger.error({ 
          message: 'Error fetching accounts', 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        Sentry.captureException(error);
        
        return NextResponse.json({
          success: false,
          error: "Failed to fetch accounts",
          message: error instanceof Error ? error.message : "An unexpected error occurred"
        }, { status: 500 });
      }
    }
  );
}

