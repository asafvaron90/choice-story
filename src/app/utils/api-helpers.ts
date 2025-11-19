import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import firestoreServerService from "@/app/services/firestore.server";

/**
 * Checks if Firestore service is ready and returns an appropriate error response if not
 * @param req The Next.js request object
 * @returns A NextResponse with error details if service is not ready, null if service is ready
 */
export function checkFirestoreReady(req: NextRequest): NextResponse | null {
  if (!firestoreServerService.isReady()) {
    const initError = firestoreServerService.getInitializationError();
    console.error("[API_ERROR] Firestore service not ready:", initError);
    
    Sentry.captureException(new Error(`Firestore service not initialized: ${initError}`), {
      tags: { 
        api_endpoint: req.nextUrl.pathname, 
        method: req.method 
      },
      extra: { initializationError: initError }
    });
    
    return NextResponse.json({
      success: false,
      error: "Service temporarily unavailable",
      message: "Database service is not properly initialized",
      details: initError || "Unknown initialization error"
    }, { status: 503 });
  }
  
  return null;
}

