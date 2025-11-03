import { NextRequest, NextResponse } from "next/server";
import firestoreServerService from "@/app/services/firestore.server";
import { KidCreateRequestSchema, KidUpdateRequestSchema } from "@choiceStoryWeb/models";
import { verifyAuthHeader } from "@/app/utils/auth-helpers";

/**
 * POST endpoint to create or update a kid
 */
export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    const decodedToken = await verifyAuthHeader(authHeader);
    const _authenticatedUid = decodedToken?.uid;
    
    const body = await req.json();
    const userId = body.userId;
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: "Missing user ID",
      }, { status: 400 });
    }
    
    const isUpdate = !!body.kid?.id;
    
    // Validate the request body
    try {
      if (isUpdate) {
        KidUpdateRequestSchema.parse(body);
      } else {
        KidCreateRequestSchema.parse(body);
      }
    } catch (validationError) {
      return NextResponse.json({
        success: false,
        error: "Invalid request body",
        message: (validationError as Error).message,
      }, { status: 400 });
    }
    
    const { kid } = body;
    const kidId = await firestoreServerService.saveKid(userId, kid);
    
    return NextResponse.json({
      success: true,
      kidId,
      message: isUpdate ? "Kid updated successfully" : "Kid created successfully",
    }, { status: 200 });
  } catch (error) {
    console.error("[KID_CREATE_API_ERROR]", error);
    
    return NextResponse.json({
      success: false,
      error: "Failed to create/update kid",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

export const dynamic = "force-dynamic"; 