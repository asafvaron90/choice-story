import { NextRequest, NextResponse } from 'next/server';
import firestoreServerService from '@/app/services/firestore.server';
import { verifyAuthHeader } from '@/app/utils/auth-helpers';
import { checkFirestoreReady } from '@/app/utils/api-helpers';
import * as Sentry from '@sentry/nextjs';
import { logger } from '@/lib/logger';

/**
 * PATCH endpoint to update account role and access_rights (admin only)
 */
export async function PATCH(req: NextRequest) {
  logger.info({ message: 'PATCH /api/admin/accounts/update called' });
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "PATCH /api/admin/accounts/update",
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
          logger.warn({ message: 'Unauthorized access attempt to update account endpoint' });
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
            message: "You do not have permission to update accounts. Role required."
          }, { status: 403 });
        }

        span.setAttribute("user_role", userAccount.role);

        const body = await req.json();
        const { uid, role, access_rights, kids_limit, story_per_kid_limit } = body;

        if (!uid) {
          return NextResponse.json({
            success: false,
            error: "Missing uid parameter",
            message: "Account UID is required"
          }, { status: 400 });
        }

        span.setAttribute("target_uid", uid);
        span.setAttribute("new_role", role || "none");
        span.setAttribute("new_access_rights", access_rights || "none");
        span.setAttribute("new_kids_limit", kids_limit?.toString() || "none");
        span.setAttribute("new_story_per_kid_limit", story_per_kid_limit?.toString() || "none");

        console.log(`[/api/admin/accounts/update] Updating account ${uid}`);
        logger.info({ 
          message: 'Updating account role, access_rights, and limits',
          targetUid: uid,
          role,
          access_rights,
          kids_limit,
          story_per_kid_limit,
          requestedBy: authenticatedUid 
        });

        // Get the account
        const account = await firestoreServerService.getAccountByUid(uid);
        
        if (!account) {
          span.setAttribute("error_type", "not_found");
          return NextResponse.json({
            success: false,
            error: "Account not found",
            message: `No account found with UID: ${uid}`
          }, { status: 404 });
        }

        // Update the account with new role, access_rights, and limits
        // Handle null/empty string for role and access_rights (to clear them)
        const updatedAccount = await firestoreServerService.updateAccountData({
          ...account,
          role: role !== undefined ? (role || undefined) : account.role,
          access_rights: access_rights !== undefined ? (access_rights || undefined) : account.access_rights,
          kids_limit: kids_limit !== undefined ? kids_limit : account.kids_limit,
          story_per_kid_limit: story_per_kid_limit !== undefined ? story_per_kid_limit : account.story_per_kid_limit,
        });

        logger.info({ 
          message: 'Successfully updated account',
          uid 
        });

        return NextResponse.json({
          success: true,
          account: updatedAccount
        }, { status: 200 });

      } catch (error) {
        console.error('[/api/admin/accounts/update] Error updating account:', error);
        logger.error({ 
          message: 'Error updating account', 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        Sentry.captureException(error);
        
        return NextResponse.json({
          success: false,
          error: "Failed to update account",
          message: error instanceof Error ? error.message : "An unexpected error occurred"
        }, { status: 500 });
      }
    }
  );
}

