import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { firebaseAdmin } from '@/app/services/firebase-admin.service';
import * as Sentry from "@sentry/nextjs";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Type for DALL-E size options
type DallE3Size = "1024x1024" | "1792x1024" | "1024x1792";
type DetailLevel = "auto" | "low" | "high";

// Define a type for the image generation parameters
interface ImageGenerationParams {
  model: "dall-e-3" | "dall-e-2";
  prompt: string;
  n: number;
  size: DallE3Size;
  quality: "standard" | "hd";
  style: "vivid" | "natural";
}

// Default reference image URL
const DEFAULT_REFERENCE_IMAGE_URL = "https://firebasestorage.googleapis.com/v0/b/choicestory-b3135.appspot.com/o/users%2F8TlRImK7weP13RjLWhp6jGFJJTw1%2Fkids%2Fsofi_1743173246302.png?alt=media&token=d8528cc8-1e14-4514-8f3a-ad2f48fdbc20";

// Function to upload image to Firebase Storage
async function uploadToFirebaseStorage(imageUrl: string, userId?: string, folderPath?: string): Promise<string> {
  return Sentry.startSpan(
    {
      op: "storage.upload",
      name: "Upload Generated Image to Firebase Storage",
    },
    async (span) => {
      try {
        // Fetch the image from OpenAI URL
        console.log('[GENERATE_IMAGE] Fetching image from OpenAI URL:', imageUrl);
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
        
        console.log('[GENERATE_IMAGE] Using Firebase Storage path:', filePath);
        
        // Get bucket name from environment
        const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        
        if (!bucketName) {
          throw new Error('Firebase Storage bucket name is not configured');
        }
        
        let url: string;
        
        // Try Firebase Admin SDK first
        try {
          if (!firebaseAdmin.isReady()) {
            console.log('[GENERATE_IMAGE] Firebase Admin not ready, using direct HTTP upload');
            throw new Error("Firebase Admin not ready");
          }
          
          // Get the admin storage reference
          const storage = firebaseAdmin.getStorage();
          const bucket = storage.bucket(bucketName);
          console.log(`[GENERATE_IMAGE] Using admin storage bucket: ${bucketName}`);
          
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
          console.log('[GENERATE_IMAGE] Admin SDK upload successful');
        } catch (adminError) {
          console.error('[GENERATE_IMAGE] Admin SDK upload failed:', adminError);
          
          // Fallback to direct HTTP upload
          console.log('[GENERATE_IMAGE] Attempting direct HTTP upload');
          
          // Ensure the file path doesn't start with a slash
          const normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
          
          // If bucketName doesn't include .appspot.com, add it
          const fullBucketName = bucketName.includes('.appspot.com') 
            ? bucketName 
            : `${bucketName}.appspot.com`;
          
          // Create upload URL
          const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${fullBucketName}/o?name=${encodeURIComponent(normalizedPath)}`;
          
          // Upload the file
          console.log(`[GENERATE_IMAGE] POSTing to: ${uploadUrl}`);
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
          console.log(`[GENERATE_IMAGE] Direct HTTP upload successful: ${url}`);
        }
        
        // Add attributes to the span
        span.setAttribute("firebase.bucket", bucketName);
        span.setAttribute("firebase.path", filePath);
        span.setAttribute("file.size", fileBuffer.length);
        span.setAttribute("content.type", contentType);
        
        return url;
      } catch (error) {
        console.error('[GENERATE_IMAGE] Error uploading to Firebase Storage:', error);
        throw error;
      }
    }
  );
}

export async function POST(request: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "POST /api/generate-image",
    },
    async (span) => {
      try {
        // Check if the request is multipart/form-data (file upload)
        const contentType = request.headers.get('content-type') || '';
        
        let prompt = '';
        let referenceImageUrl = '';
        let userId = '';
        let folderPath = '';
        let config = {
          model: 'dall-e-3',
          quality: 'standard',
          style: 'vivid',
          size: '1024x1024'
        };
        
        // Handle form data with file upload
        if (contentType.includes('multipart/form-data')) {
          try {
            const formData = await request.formData();
            // We'll ignore the image file since DALL-E 3 doesn't support direct variations
            prompt = formData.get('prompt') as string || '';
            userId = formData.get('userId') as string || '';
            folderPath = formData.get('folderPath') as string || '';
            
            const configStr = formData.get('config') as string;
            if (configStr) {
              try {
                config = JSON.parse(configStr);
              } catch (e) {
                console.error('Error parsing config from form data:', e);
              }
            }
          } catch (formError) {
            console.error('Error processing form data:', formError);
            return NextResponse.json(
              { error: 'Error processing form data: ' + (formError instanceof Error ? formError.message : String(formError)) },
              { status: 400 }
            );
          }
        } 
        // Handle JSON request
        else {
          try {
            const data = await request.json();
            prompt = data.prompt || '';
            referenceImageUrl = data.referenceImageUrl || DEFAULT_REFERENCE_IMAGE_URL;
            userId = data.userId || '';
            folderPath = data.folderPath || '';
            
            if (data.config) {
              config = {
                ...config,
                ...data.config
              };
            }
          } catch (jsonError) {
            console.error('Error parsing JSON request:', jsonError);
            return NextResponse.json(
              { error: 'Invalid JSON request: ' + (jsonError instanceof Error ? jsonError.message : String(jsonError)) },
              { status: 400 }
            );
          }
        }
        
        // Validate inputs
        if (!prompt) {
          // If we have a reference image but no prompt, create a generic prompt
          if (referenceImageUrl) {
            prompt = "Create a high-quality image similar to the reference image";
          } else {
            return NextResponse.json(
              { error: 'A prompt is required for image generation' },
              { status: 400 }
            );
          }
        }
        
        // Check if OpenAI API key is present
        if (!process.env.OPENAI_API_KEY) {
          console.error('OpenAI API key is missing');
          return NextResponse.json(
            { error: 'OpenAI API key is not configured' },
            { status: 500 }
          );
        }
        
        // Convert string size to appropriate type based on model
        const sizeValue = config.size as DallE3Size;
        const modelValue = config.model as "dall-e-3" | "dall-e-2";
        
        try {
          // Generate image using DALL-E (replacing broken custom agent system)
          console.log('Generating image with DALL-E');
          console.log('Using configuration:', { 
            model: modelValue, 
            size: sizeValue, 
            quality: config.quality, 
            style: config.style
          });
          
          // Enhance prompt for children's storybook style
          const enhancedPrompt = `${prompt}. Style: Children's storybook illustration, colorful, friendly, age-appropriate, high quality digital art.`;
          
          // Use standard DALL-E API
          const response = await openai.images.generate({
            model: modelValue,
            prompt: enhancedPrompt,
            n: 1,
            size: sizeValue,
            quality: config.quality as "standard" | "hd",
            style: config.style as "vivid" | "natural",
          });
          
          console.log('DALL-E response received');
          
          // Extract image URL from DALL-E response
          const openaiImageUrl = response.data?.[0]?.url;
          if (!openaiImageUrl) {
            throw new Error('DALL-E did not return an image URL');
          }
          
          console.log('DALL-E generated image URL:', openaiImageUrl);
          
          // Add attributes to the span
          span.setAttribute("openai.model", modelValue);
          span.setAttribute("openai.size", sizeValue);
          span.setAttribute("openai.quality", config.quality);
          span.setAttribute("openai.style", config.style);
          span.setAttribute("user.id", userId || "anonymous");
          span.setAttribute("folder.path", folderPath || "default");
          
          // Upload the generated image to Firebase Storage
          const firebaseImageUrl = await uploadToFirebaseStorage(openaiImageUrl, userId, folderPath);
          
          return NextResponse.json({ 
            imageUrl: firebaseImageUrl,
            originalOpenAIUrl: openaiImageUrl // Keep for reference
          });
          
        } catch (error) {
          console.error('Error generating image with OpenAI:', error);
          return NextResponse.json(
            { error: 'Failed to generate image: ' + (error instanceof Error ? error.message : String(error)) },
            { status: 500 }
          );
        }
      } catch (error) {
        console.error('Error in generate-image API route:', error);
        return NextResponse.json(
          { error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error)) },
          { status: 500 }
        );
      }
    }
  );
} 