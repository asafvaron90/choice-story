import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';
import { firebaseAdmin } from '@/app/services/firebase-admin.service';

// Get bucket name from environment
const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

// Only log during runtime, not during build
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || (process.env.NODE_ENV === 'production' && typeof window === 'undefined' && !process.env.FIREBASE_PROJECT_ID);
if (!isBuildTime) {
  console.log("[UPLOAD_IMAGE] Storage Bucket Name:", bucketName);
}

// Add a direct HTTP upload fallback that works in any environment
async function uploadWithDirectHTTP(
  fileBuffer: Buffer, 
  filePath: string, 
  contentType: string,
  bucketName: string
): Promise<string> {
  console.log("[UPLOAD_IMAGE] Using direct HTTP upload fallback");
  
  // Ensure the file path doesn't start with a slash
  const normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
  
  // If bucketName doesn't include .appspot.com, add it
  const fullBucketName = bucketName.includes('.appspot.com') 
    ? bucketName 
    : `${bucketName}.appspot.com`;
  
  // Create upload URL
  // Note: This approach needs proper CORS configuration in your Firebase bucket
  const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${fullBucketName}/o?name=${encodeURIComponent(normalizedPath)}`;
  
  // Upload the file
  console.log(`[UPLOAD_IMAGE] POSTing to: ${uploadUrl}`);
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public,max-age=31536000',
      'X-Goog-Meta-Source': 'choice-story-app',
    },
    body: new Uint8Array(fileBuffer)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Direct upload failed with status ${response.status}: ${errorText}`);
  }
  
  // Build the download URL 
  // Format: https://firebasestorage.googleapis.com/v0/b/[bucket]/o/[file]?alt=media
  const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${fullBucketName}/o/${encodeURIComponent(normalizedPath)}?alt=media`;
  console.log(`[UPLOAD_IMAGE] Generated download URL: ${downloadUrl}`);
  
  return downloadUrl;
}

// Define validation schema for the request body
const UploadImageSchema = z.object({
  // Either base64 encoded image data or image URL must be provided
  base64Data: z.string().optional(),
  imageUrl: z.string().optional(),
  // User ID for organizing storage paths (optional)
  userId: z.string().optional(),
  // Optional folder path to organize images
  folderPath: z.string().optional(),
  // Optional filename (will generate one if not provided)
  fileName: z.string().optional(),
  // File type/extension
  fileType: z.string().default('png')
}).refine(data => data.base64Data || data.imageUrl, {
  message: "Either base64Data or imageUrl must be provided",
  path: ["base64Data"]
});

export async function POST(req: NextRequest) {
  try {
    console.log("[UPLOAD_IMAGE -- REQUEST]", req.url);
    
    // Parse and validate the request body
    const body = await req.json();
    console.log("[UPLOAD_IMAGE -- BODY]", JSON.stringify(body, null, 2));
    
    const validatedInput = UploadImageSchema.parse(body);
    
    let fileBuffer: Buffer;
    let contentType: string;
    
    // Handle image source - either from base64 or from URL
    if (validatedInput.base64Data) {
      // Extract base64 data - handle both with and without data:image prefix
      let base64Data = validatedInput.base64Data;
      if (base64Data.includes(',')) {
        base64Data = base64Data.split(',')[1];
      }
      
      // Convert base64 to buffer
      fileBuffer = Buffer.from(base64Data, 'base64');
      
      const fileType = validatedInput.fileType.startsWith('.') ? 
        validatedInput.fileType.substring(1) : validatedInput.fileType;
      
      contentType = `image/${fileType}`;
    } else if (validatedInput.imageUrl) {
      // Fetch the image from URL
      console.log("[UPLOAD_IMAGE] Fetching image from URL:", validatedInput.imageUrl);
      const response = await fetch(validatedInput.imageUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
      
      if (fileBuffer.length === 0) {
        throw new Error('Received empty image data');
      }
      
      contentType = response.headers.get('content-type') || 'image/png';
    } else {
      throw new Error('No image data provided');
    }
    
    // Generate filename if not provided
    const fileType = validatedInput.fileType.startsWith('.') ? 
      validatedInput.fileType.substring(1) : validatedInput.fileType;
    
    const fileName = validatedInput.fileName || 
      `image_${Date.now()}_${uuidv4().substring(0, 8)}.${fileType}`;
    
    // Determine the storage path
    const userId = validatedInput.userId || "anonymous";
    let filePath;
    
    if (validatedInput.folderPath) {
      filePath = `${validatedInput.folderPath}/${fileName}`;
    } else if (userId === "anonymous") {
      filePath = `temp/anonymous/${fileName}`;
    } else {
      filePath = `users/${userId}/images/${fileName}`;
    }
    
    console.log("[UPLOAD_IMAGE] Using path:", filePath);
    
    let url: string;
    
    // Try multiple upload methods in sequence
    try {
      if (!firebaseAdmin.isReady() || !bucketName) {
        console.log("[UPLOAD_IMAGE] Admin SDK not ready or bucket name missing, skipping Admin SDK");
        throw new Error("Admin SDK not ready or bucket name missing");
      }
      
      try {
        // Get the admin storage reference
        const storage = firebaseAdmin.getStorage();
        const bucket = storage.bucket(bucketName);
        console.log(`[UPLOAD_IMAGE] Using admin storage bucket: ${bucketName}`);
        
        // Create a file reference
        const file = bucket.file(filePath);
        
        // Upload the file
        await file.save(fileBuffer, {
          metadata: {
            contentType,
          },
          public: true,
        });
        
        // Get the download URL
        const [signedUrl] = await file.getSignedUrl({
          action: 'read',
          expires: '01-01-2100', // Far future date for a long-lived URL
        });
        
        url = signedUrl;
        console.log("[UPLOAD_IMAGE] Admin SDK upload successful");
      } catch (adminError) {
        console.error("[UPLOAD_IMAGE] Admin SDK upload failed:", adminError);
        throw adminError; // Re-throw to try next method
      }
    } catch (attempt1Error) {
      // Skip client SDK since it also uses user permissions which may fail
      console.log("[UPLOAD_IMAGE] Skipping client SDK due to potential permissions issues");
      
      // Attempt 3: Direct HTTP upload without authentication
      if (!bucketName) {
        return NextResponse.json({
          success: false,
          error: "Upload failed",
          message: "Storage bucket name is missing. Please check your environment configuration."
        }, { status: 500 });
      }
      
      console.log("[UPLOAD_IMAGE] Attempting direct HTTP upload");
      try {
        url = await uploadWithDirectHTTP(fileBuffer, filePath, contentType, bucketName);
        console.log("[UPLOAD_IMAGE] Direct HTTP upload successful");
      } catch (httpError) {
        console.error("[UPLOAD_IMAGE] Direct HTTP upload failed:", httpError);
        
        // As a last resort, attempt to save to temp public folder
        const tempPath = `temp/public/${Date.now()}_${fileName}`;
        console.log(`[UPLOAD_IMAGE] Attempting last resort with public temp folder: ${tempPath}`);
        
        try {
          url = await uploadWithDirectHTTP(fileBuffer, tempPath, contentType, bucketName);
          console.log("[UPLOAD_IMAGE] Public temp folder upload successful");
        } catch (finalError) {
          console.error("[UPLOAD_IMAGE] All upload methods failed:", {
            adminError: attempt1Error,
            httpError,
            finalError
          });
          
          return NextResponse.json({
            success: false,
            error: "Upload failed",
            message: "All image upload methods failed. Please try again later."
          }, { status: 500 });
        }
      }
    }
    
    console.log("[UPLOAD_IMAGE] Upload successful:", url);
    
    return NextResponse.json({
      success: true,
      url: url,
      fileName: fileName,
      path: filePath
    }, { status: 200 });
    
  } catch (error) {
    console.error("[UPLOAD_IMAGE_ERROR]", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: "Invalid input",
        details: error.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: "Failed to upload image",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export const dynamic = "force-dynamic"; 