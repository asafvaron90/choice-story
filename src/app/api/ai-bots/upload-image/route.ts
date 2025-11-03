import { NextRequest, NextResponse } from 'next/server';
import { firebaseAdmin } from '@/app/services/firebase-admin.service';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, folderPath = 'story-images' } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    console.log(`[Upload Image] Starting upload from: ${imageUrl}`);
    console.log(`[Upload Image] Uploading to folder: ${folderPath}`);
    
    // Check Firebase Admin availability
    if (!firebaseAdmin.isReady()) {
      throw new Error('Firebase Admin not initialized');
    }

    // Download the image from DALL-E
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';

    // Generate a unique filename
    const fileExtension = contentType.split('/')[1] || 'png';
    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = `${folderPath}/${fileName}`;

    // Get bucket name from environment
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      throw new Error('Firebase storage bucket not configured');
    }

    // Upload to Firebase Storage using the existing admin service
    const storage = firebaseAdmin.getStorage();
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filePath);

    await file.save(Buffer.from(imageBuffer), {
      metadata: {
        contentType,
        cacheControl: 'public, max-age=31536000', // Cache for 1 year
      },
      public: true,
    });

    // Get the signed URL for long-term access
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: '01-01-2100', // Far future date for a long-lived URL
    });

    const publicUrl = signedUrl;

    console.log(`[Upload Image] Successfully uploaded to: ${publicUrl}`);

    return NextResponse.json({
      success: true,
      imageUrl: publicUrl,
      originalUrl: imageUrl,
      fileName,
      filePath,
    });

  } catch (error) {
    console.error('[Upload Image] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to upload image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
