import { NextRequest, NextResponse } from "next/server";
import firestoreServerService from "@/app/services/firestore.server";
import FirestoreService from "@/app/services/firestore.service";
import { verifyAuthHeader } from "@/app/utils/auth-helpers";
import { checkFirestoreReady } from "@/app/utils/api-helpers";
import { getCorsHeaders, CORS_PREFLIGHT_HEADERS } from "@/config/build-config";

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_PREFLIGHT_HEADERS,
  });
}

/**
 * GET endpoint to fetch the currently authenticated user's data
 * 
 * This endpoint properly verifies Firebase ID tokens from clients
 * and uses the server-side Firestore service to fetch user data
 */
export async function GET(req: NextRequest) {
  console.log("[/api/user/me] Request received, URL:", req.url);

  // Get CORS headers based on the request origin
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  try {
    // Check for Authorization header with Bearer token
    const authHeader = req.headers.get('Authorization');
    console.log("[/api/user/me] Authorization header present:", !!authHeader);
    
    // Verify the token from the Authorization header
    const decodedToken = await verifyAuthHeader(authHeader);
    const tokenUid = decodedToken?.uid;
    
    // Get the UID from query params as fallback
    const uidFromQuery = req.nextUrl.searchParams.get("uid");
    
    // Use the token UID if available, otherwise use the query param
    const uid = tokenUid || uidFromQuery;
    
    // Log the authentication method used
    if (tokenUid) {
      console.log(`[/api/user/me] Authentication successful via token for user: ${tokenUid}`);
    } else if (uidFromQuery) {
      console.log(`[/api/user/me] No valid token, using query parameter UID: ${uidFromQuery}`);
    }
    
    // If no user identification is available, return an authentication error
    if (!uid) {
      console.log("[/api/user/me] No authentication provided");
      return NextResponse.json({
        success: false,
        error: "Not authenticated",
        message: "Missing authentication token and no UID parameter"
      }, { status: 401, headers: corsHeaders });
    }
    
    console.log(`[/api/user/me] Fetching data for user: ${uid}`);
    
    try {
      // Check if server-side service is available
      const readyCheck = checkFirestoreReady(req);
      if (readyCheck && process.env.NODE_ENV !== 'development') {
        // In production/staging, return error if service is not ready
        return readyCheck;
      }
      
      if (!firestoreServerService.isReady()) {
        const serverError = firestoreServerService.getInitializationError();
        console.error("[/api/user/me] Server-side Firestore not available:", serverError);
        
        // In development, allow client-side fallback
        if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_ENABLE_CLIENT_FALLBACK === 'true') {
          console.log("[/api/user/me] Using client-side service as fallback (development only)");
          const firestoreService = new FirestoreService();
          const userData = await firestoreService.getUserByUid(uid);
          
          if (!userData) {
            return NextResponse.json({
              success: false,
              error: "User not found",
              message: "User exists in authentication but not in database"
            }, { status: 404, headers: corsHeaders });
          }
          
          return NextResponse.json({
            success: true,
            user: userData,
            isNewUser: false,
          }, { status: 200, headers: corsHeaders });
        }
        
        // In production, fail fast
        return NextResponse.json({
          success: false,
          error: "Service unavailable",
          message: "Firebase Admin service not properly configured. Please check environment variables."
        }, { status: 503, headers: corsHeaders });
      }
      
      // Try to use server-side Firestore service
      const userData = await firestoreServerService.getUserByUid(uid);
      
      if (!userData) {
        console.log(`[/api/user/me] User ${uid} not found in Firestore`);
        return NextResponse.json({
          success: false,
          error: "User not found",
          message: "User exists in authentication but not in database"
        }, { status: 404, headers: corsHeaders });
      }
      
      console.log(`[/api/user/me] Returning existing user data for ${uid}`);
      return NextResponse.json({
        success: true,
        user: {
          ...userData,
          createAt: userData.createAt instanceof Date ? userData.createAt.toISOString() : userData.createAt,
          lastUpdated: userData.lastUpdated instanceof Date ? userData.lastUpdated.toISOString() : userData.lastUpdated
        },
        isNewUser: false,
      }, { status: 200, headers: corsHeaders });
      
    } catch (serviceError) {
      console.error("[/api/user/me] Service error:", serviceError);
      
      // Only try client-side fallback in development
      if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_ENABLE_CLIENT_FALLBACK === 'true') {
        console.log("[/api/user/me] Using client-side Firebase as fallback (development only)");
        try {
          const firestoreService = new FirestoreService();
          const userData = await firestoreService.getUserByUid(uid);
          
          if (!userData) {
            return NextResponse.json({
              success: false,
              error: "User not found",
              message: "User exists in authentication but not in database"
            }, { status: 404, headers: corsHeaders });
          }
          
          return NextResponse.json({
            success: true,
            user: userData,
            isNewUser: false,
          }, { status: 200, headers: corsHeaders });
        } catch (clientError) {
          console.error("[/api/user/me] Client-side fallback also failed:", clientError);
          throw clientError;
        }
      }
      
      // In production, don't attempt client-side fallback
      throw serviceError;
    }
  } catch (error) {
    console.error("[USER_ME_API_ERROR]", error);
    
    return NextResponse.json({
      success: false,
      error: "Failed to fetch user data",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}

// Make Next.js always execute this route on every request
export const dynamic = "force-dynamic"; 