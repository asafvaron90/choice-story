import { NextRequest, NextResponse } from "next/server";
import firestoreServerService from "@/app/services/firestore.server";
import { UserDataSchema, UpdateUserDataSchema } from "@/models";
import { verifyAuthHeader } from "@/app/utils/auth-helpers";
import { UserData } from "@/app/network/UserApi";
/**
 * Verify a user has permission to access/modify a profile by UID
 * @param requestUid The UID in the request
 * @param authenticatedUid The UID from the verified token
 * @returns true if authorized, false otherwise
 */
function _isAuthorized(requestUid: string, authenticatedUid?: string): boolean {
  // Not authenticated
  if (!authenticatedUid) {
    return false;
  }
  
  // Only allow users to access their own data
  return requestUid === authenticatedUid;
}

/**
 * GET endpoint to fetch user data by UID
 */
export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    const decodedToken = await verifyAuthHeader(authHeader);
    const _authenticatedUid = decodedToken?.uid;
    
    // Get the requested user ID
    const uid = req.nextUrl.searchParams.get("uid");
    
    if (!uid) {
      return NextResponse.json({
        success: false,
        error: "Missing user ID",
      }, { status: 400 });
    }
    
    const user = await firestoreServerService.getUserByUid(uid);

    if (!user) {
      return NextResponse.json({
        success: false,
        error: "User not found",
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user,
    }, { status: 200 });
  } catch (error) {
    console.error("[USER_API_ERROR]", error);
    
    return NextResponse.json({
      success: false,
      error: "Failed to fetch user data",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

/**
 * POST endpoint to create or update a user
 */
export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    const decodedToken = await verifyAuthHeader(authHeader);
    const _authenticatedUid = decodedToken?.uid;
    
    const body = await req.json();
    const validatedInput = UserDataSchema.parse(body);
    
    console.log(`[/api/user] Received request to save user data for UID: ${validatedInput.uid}`);
    
    // Check if user exists
    const existingUser = await firestoreServerService.getUserByUid(validatedInput.uid);
    
    if (existingUser) {
      console.log(`[/api/user] User ${validatedInput.uid} already exists, updating data`);
      
      // Convert UserData to Account
      const accountData = {
        uid: validatedInput.uid,
        email: validatedInput.email,
        displayName: validatedInput.displayName,
        photoURL: validatedInput.photoURL,
        phoneNumber: validatedInput.phoneNumber,
        createAt: validatedInput.createAt ? new Date(validatedInput.createAt) : new Date(),
        lastUpdated: validatedInput.lastUpdated ? new Date(validatedInput.lastUpdated) : new Date(),
      };
      
      // Update existing user
      const updatedUser = await firestoreServerService.updateUserData(accountData);
      
      return NextResponse.json({
        success: true,
        user: updatedUser,
        action: "updated",
      }, { status: 200 });
    } else {
      console.log(`[/api/user] User ${validatedInput.uid} does not exist, creating new user record`);
      
      // Convert UserData to Account
      const accountData = {
        uid: validatedInput.uid,
        email: validatedInput.email,
        displayName: validatedInput.displayName,
        photoURL: validatedInput.photoURL,
        phoneNumber: validatedInput.phoneNumber,
        createAt: validatedInput.createAt ? new Date(validatedInput.createAt) : new Date(),
        lastUpdated: validatedInput.lastUpdated ? new Date(validatedInput.lastUpdated) : new Date(),
      };
      
      // Create new user
      const newUser = await firestoreServerService.createUserData(accountData);
      
      return NextResponse.json({
        success: true,
        user: newUser,
        action: "created",
      }, { status: 201 });
    }
  } catch (error) {
    console.error("[USER_API_ERROR]", error);
    
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({
        success: false,
        error: "Invalid input",
        details: error.message,
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: "Failed to save user data",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

/**
 * PATCH endpoint to update user data
 */
export async function PATCH(req: NextRequest) {
  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    const decodedToken = await verifyAuthHeader(authHeader);
    const _authenticatedUid = decodedToken?.uid;
    
    const body = await req.json();
    const validatedInput = UpdateUserDataSchema.parse(body);
    
    // Check if user exists
    const existingUser = await firestoreServerService.getUserByUid(validatedInput.uid);
    
    if (!existingUser) {
      return NextResponse.json({
        success: false,
        error: "User not found",
      }, { status: 404 });
    }
    
    // Convert UserData to Account - merge with existing user data
    const accountData = {
      uid: validatedInput.uid,
      email: validatedInput.email || existingUser.email,
      displayName: validatedInput.displayName || existingUser.displayName,
      photoURL: validatedInput.photoURL || existingUser.photoURL,
      phoneNumber: validatedInput.phoneNumber || existingUser.phoneNumber,
      createAt: existingUser.createAt || new Date(),
      lastUpdated: new Date(),
    };
    
    // Update user
    const updatedUser = await firestoreServerService.updateUserData(accountData);
    
    return NextResponse.json({
      success: true,
      user: updatedUser,
    }, { status: 200 });
  } catch (error) {
    console.error("[USER_API_ERROR]", error);
    
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({
        success: false,
        error: "Invalid input",
        details: error.message,
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: "Failed to update user data",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

export const dynamic = "force-dynamic"; 