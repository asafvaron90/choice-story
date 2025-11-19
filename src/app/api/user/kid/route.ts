import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import firestoreServerService from "@/app/services/firestore.server";
import { KidDetails } from '@/models';
import { checkFirestoreReady } from "@/app/utils/api-helpers";

// Schema for kid data
// const KidSchema = z.object({
//   userId: z.string(),
//   kid: KidDetailsSchema,
//   // kid: z.object({
//   //   id: z.string().optional(),
//   //   name: z.string(),
//   //   age: z.number(),
//   //   gender: z.string(),
//   //   imageAnalysis: z.any().optional(),
//   // }),
//   avatarUrl: z.string().optional(),
// });

/**
 * POST endpoint to create or update a kid
 */
export async function POST(req: NextRequest) {
  try {
    // Check if Firestore service is ready before proceeding
    const readyCheck = checkFirestoreReady(req);
    if (readyCheck) return readyCheck;

    const validatedInput: {
      userId: string;
      kid: KidDetails;
    } = await req.json();
    
    // Ensure the kid has an accountId field
    const kidToSave = {
      ...validatedInput.kid,
      accountId: validatedInput.userId, // userId in the request is actually the accountId
    };
    
    const kidId = await firestoreServerService.saveKid(kidToSave);
    
    return NextResponse.json({
      success: true,
      kidId,
      action: validatedInput.kid.id ? "updated" : "created",
    }, { status: validatedInput.kid.id ? 200 : 201 });
  } catch (error) {
    console.error("[KID_API_ERROR]", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: "Invalid input",
        details: error.errors,
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: "Failed to save kid data",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

/**
 * GET endpoint to fetch a kid by ID
 */
export async function GET(req: NextRequest) {
  try {
    // Check if Firestore service is ready before proceeding
    const readyCheck = checkFirestoreReady(req);
    if (readyCheck) return readyCheck;

    const kidId = req.nextUrl.searchParams.get("kidId");
    
    if (!kidId) {
      return NextResponse.json({
        success: false,
        error: "Missing kid ID",
      }, { status: 400 });
    }
    
    const kid = await firestoreServerService.getKid(kidId);
    
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
    console.error("[KID_API_ERROR]", error);
    
    return NextResponse.json({
      success: false,
      error: "Failed to fetch kid data",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

/**
 * DELETE endpoint to remove a kid
 */
export async function DELETE(req: NextRequest) {
  try {
    // Check if Firestore service is ready before proceeding
    const readyCheck = checkFirestoreReady(req);
    if (readyCheck) return readyCheck;

    const kidId = req.nextUrl.searchParams.get("kidId");
    
    if (!kidId) {
      return NextResponse.json({
        success: false,
        error: "Missing kid ID",
      }, { status: 400 });
    }
    
    await firestoreServerService.deleteKid(kidId);
    
    return NextResponse.json({
      success: true,
      message: "Kid deleted successfully",
    }, { status: 200 });
  } catch (error) {
    console.error("[KID_API_ERROR]", error);
    
    return NextResponse.json({
      success: false,
      error: "Failed to delete kid",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

export const dynamic = "force-dynamic"; 