import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { GenerateImageInputSchema } from "./types";
// Removed ReplicateApiService - now using OpenAI directly
import { v4 as uuidv4 } from 'uuid';
import { firebaseAdmin } from '@/app/services/firebase-admin.service';
import * as Sentry from "@sentry/nextjs";

// Function to upload image to Firebase Storage
async function uploadToFirebaseStorage(imageUrl: string, userId?: string, folderPath?: string): Promise<string> {
  return Sentry.startSpan(
    {
      op: "storage.upload",
      name: "Upload Generated Image to Firebase Storage",
    },
    async (span) => {
      try {
        // Fetch the image from Replicate URL
        console.log('[GENERATE_IMAGES] Fetching image from Replicate URL:', imageUrl);
        const response = await fetch(imageUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);
        
        if (fileBuffer.length === 0) {
          throw new Error('Received empty image data');
        }
        
        const contentType = response.headers.get('content-type') || 'image/png';
        
        // Generate filename
        const fileName = `generated_${Date.now()}_${uuidv4().substring(0, 8)}.png`;
        
        // Determine the storage path
        const userIdValue = userId || "anonymous";
        let filePath;
        
        if (folderPath) {
          filePath = `${folderPath}/${fileName}`;
        } else if (userIdValue === "anonymous") {
          filePath = `temp/anonymous/generated/${fileName}`;
        } else {
          filePath = `users/${userIdValue}/generated/${fileName}`;
        }
        
        console.log('[GENERATE_IMAGES] Using Firebase Storage path:', filePath);
        
        // Get bucket name from environment
        const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        
        if (!bucketName) {
          throw new Error('Firebase Storage bucket name is not configured');
        }
        
        let url: string;
        
        // Try Firebase Admin SDK first
        try {
          if (!firebaseAdmin.isReady()) {
            console.log('[GENERATE_IMAGES] Firebase Admin not ready, using direct HTTP upload');
            throw new Error("Firebase Admin not ready");
          }
          
          // Get the admin storage reference
          const storage = firebaseAdmin.getStorage();
          const bucket = storage.bucket(bucketName);
          console.log(`[GENERATE_IMAGES] Using admin storage bucket: ${bucketName}`);
          
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
          console.log('[GENERATE_IMAGES] Admin SDK upload successful');
        } catch (adminError) {
          console.error('[GENERATE_IMAGES] Admin SDK upload failed:', adminError);
          
          // Fallback to direct HTTP upload
          console.log('[GENERATE_IMAGES] Attempting direct HTTP upload');
          
          // Ensure the file path doesn't start with a slash
          const normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
          
          // If bucketName doesn't include .appspot.com, add it
          const fullBucketName = bucketName.includes('.appspot.com') 
            ? bucketName 
            : `${bucketName}.appspot.com`;
          
          // Create upload URL
          const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${fullBucketName}/o?name=${encodeURIComponent(normalizedPath)}`;
          
          // Upload the file
          console.log(`[GENERATE_IMAGES] POSTing to: ${uploadUrl}`);
          const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public,max-age=31536000',
              'X-Goog-Meta-Source': 'choice-story-app',
            },
            body: fileBuffer
          });
          
          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(`Direct upload failed with status ${uploadResponse.status}: ${errorText}`);
          }
          
          // Build the download URL 
          url = `https://firebasestorage.googleapis.com/v0/b/${fullBucketName}/o/${encodeURIComponent(normalizedPath)}?alt=media`;
          console.log(`[GENERATE_IMAGES] Direct HTTP upload successful: ${url}`);
        }
        
        // Add attributes to the span
        span.setAttribute("firebase.bucket", bucketName);
        span.setAttribute("firebase.path", filePath);
        span.setAttribute("file.size", fileBuffer.length);
        span.setAttribute("content.type", contentType);
        
        return url;
      } catch (error) {
        console.error('[GENERATE_IMAGES] Error uploading to Firebase Storage:', error);
        throw error;
      }
    }
  );
}

// Generic Generate Images API Route
export async function POST(req: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "POST /api/story/generate-images",
    },
    async (span) => {
      try {
        const path = req.url;
        console.log("[GENERATE_IMAGES -- REQUEST]", path);

        // Check if OpenAI API key is set
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          console.error("[GENERATE_IMAGES -- ERROR] Missing OPENAI_API_KEY environment variable");
          return NextResponse.json({
            success: false,
            error: "API key not configured. Please set OPENAI_API_KEY in your environment."
          }, { status: 500 });
        }

        // Parse and validate the request body
        const body = await req.json();
        console.log("[GENERATE_IMAGES -- BODY]", JSON.stringify(body, null, 2));
        
        const validatedInput = GenerateImageInputSchema.parse(body);
        console.log("[GENERATE_IMAGES -- VALIDATED INPUT]", JSON.stringify(validatedInput, null, 2));

        // Extract userId and folderPath from the request
        const userId = validatedInput.userId || '';
        const folderPath = validatedInput.folderPath || '';

        // Use the new OpenAI-based story image generation
        const response = await fetch(new URL('/api/ai-bots/generate-story-images', req.url).toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: validatedInput.prompt,
            outputCount: validatedInput.outputCount,
            userId: userId,
            folderPath: folderPath,
            referenceImageUrl: validatedInput.referenceImageUrl
          }),
        });

        const result = await response.json();
        
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to generate images with OpenAI');
        }

        console.log("[GENERATE_IMAGES -- RESULT]", JSON.stringify(result, null, 2));

        if (!result.success || !result.images?.length) {
          console.error("[GENERATE_IMAGES -- ERROR]", result.error || "No images generated");
          throw new Error(result.error || "Failed to generate images");
        }

        // Add attributes to the span
        span.setAttribute("openai.prompt", validatedInput.prompt);
        span.setAttribute("openai.outputCount", validatedInput.outputCount);
        span.setAttribute("user.id", userId || "anonymous");
        span.setAttribute("folder.path", folderPath || "default");
        span.setAttribute("images.count", result.images.length);

        // Upload all generated images to Firebase Storage
        const firebaseImageUrls = [];
        const originalUrls = [];

        for (const openaiUrl of result.images) {
          try {
            const firebaseUrl = await uploadToFirebaseStorage(openaiUrl, userId, folderPath);
            firebaseImageUrls.push(firebaseUrl);
            originalUrls.push(openaiUrl);
          } catch (uploadError) {
            console.error('[GENERATE_IMAGES] Failed to upload image to Firebase:', uploadError);
            // If upload fails, keep the original URL as fallback
            firebaseImageUrls.push(openaiUrl);
            originalUrls.push(openaiUrl);
          }
        }

        // Return Firebase Storage URLs
        return NextResponse.json({
          success: true,
          imageUrls: firebaseImageUrls,
          originalUrls: originalUrls // Keep for reference
        }, { status: 200 });
        
      } catch (error) {
        console.error("[GENERATE_IMAGES_ERROR]", error);
        console.error("[GENERATE_IMAGES_ERROR_STACK]", error instanceof Error ? error.stack : "No stack trace");

        if (error instanceof z.ZodError) {
          return NextResponse.json({
            success: false,
            error: "Invalid input",
            details: error.errors
          }, { status: 400 });
        }

        return NextResponse.json({
          success: false,
          error: "Failed to generate images",
          message: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
      }
    }
  );
}

export const dynamic = "force-dynamic"; 