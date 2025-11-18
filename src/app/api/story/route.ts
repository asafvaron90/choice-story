import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import firestoreServerService from "@/app/services/firestore.server";
import { Story, StoryStatus, PageType } from "@/models";
import { verifyAuthHeader } from "@/app/utils/auth-helpers";
import { checkFirestoreReady } from "@/app/utils/api-helpers";

// Schema for story validation
const CreateStorySchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  accountId: z.string(),
  kidId: z.string(),
  title: z.string(),
  problemDescription: z.string(),
  pages: z.array(z.object({
    pageNum: z.number(),
    pageType: z.nativeEnum(PageType),
    storyText: z.string(),
    selectedImageUrl: z.string().nullable().optional(),
    imagesUrls: z.array(z.string()).optional(),
    imagePrompt: z.string().optional()
  }))
});

// Schema for getting a specific story
// const GetStorySchema = z.object({
//   storyId: z.string()
// });

// // Schema for getting stories by kid
// const GetStoriesByKidSchema = z.object({
//   userId: z.string(),
//   kidId: z.string()
// });

// // Schema for deleting a story
// const DeleteStorySchema = z.object({
//   userId: z.string(),
//   storyId: z.string(),
//   kidId: z.string()
// });

/**
 * POST endpoint to create a new story
 */
export async function POST(req: NextRequest) {
  try {
    // Check if Firestore service is ready before proceeding
    const readyCheck = checkFirestoreReady(req);
    if (readyCheck) return readyCheck;

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    const decodedToken = await verifyAuthHeader(authHeader);
    const _authenticatedUid = decodedToken?.uid;
    
    const body = await req.json();
    const validatedData = CreateStorySchema.parse(body);
    
    // Validate inputs
    if (!validatedData.userId) throw new Error('Missing user ID');
    if (!validatedData.kidId) throw new Error('Missing kid ID');
    if (!validatedData.title) throw new Error('Missing story title');
    if (!validatedData.problemDescription) throw new Error('Missing problem description');
    if (!validatedData.pages || validatedData.pages.length < 1) throw new Error('Missing pages');
    
    // Validate that all pages have required image URLs
    // const missingImages = validatedData.pages.filter((page: z.infer<typeof CreateStorySchema>['pages'][0]) => !page.selectedImageUrl);
    // if (missingImages.length > 0) {
    //   console.error('[/api/story] Pages missing images:', missingImages.map((p: z.infer<typeof CreateStorySchema>['pages'][0]) => p.pageType));
    //   throw new Error('All pages must have selected images before saving');
    // }
    
    // Create initial story object with properly typed pages
    const initialStory: Story = {
      ...validatedData,
      id: validatedData.id || '', // Will be assigned by Firestore
      advantages: '',
      disadvantages: '',
      status: StoryStatus.COMPLETE,
      createdAt: new Date(),
      lastUpdated: new Date(),
      pages: validatedData.pages.map(page => ({
        ...page,
        imagePrompt: page.imagePrompt || '' // Ensure imagePrompt is always a string
      }))
    };
    
    console.log('[/api/story] Saving story:', {
      title: initialStory.title,
      problemDescription: initialStory.problemDescription,
      pagesCount: initialStory.pages.length,
      pageTypes: initialStory.pages.map(p => p.pageType)
    });
    
    // Save story to Firestore
    try {
      const savedStory = await firestoreServerService.saveStory(initialStory);
      
      if (!savedStory) {
        throw new Error('Failed to save story to database');
      }
      
      
      console.log('[/api/story] Story saved successfully:', {
        id: savedStory.id,
        title: savedStory.title
      });
      
      return NextResponse.json({
        success: true,
        data: {
          story: savedStory,
          message: 'Story created successfully'
        }
      }, { status: 201 });
    } catch (error) {
      console.error('[/api/story] Database error:', error);
      throw new Error('Failed to save story to database');
    }
  } catch (error) {
    console.error('[/api/story] Error handling story creation:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create story'
    }, { status: 500 });
  }
}

/**
 * GET endpoint to fetch stories
 */
export async function GET(req: NextRequest): Promise<Response> {
  try {
    // Check if Firestore service is ready before proceeding
    const readyCheck = checkFirestoreReady(req);
    if (readyCheck) return readyCheck;

    const storyId = req.nextUrl.searchParams.get("storyId");
    const userId = req.nextUrl.searchParams.get("userId");
    const kidId = req.nextUrl.searchParams.get("kidId");

    // Get single story by ID - Allow public access for sharing
    if (storyId) {
      const story = await firestoreServerService.getStoryById(storyId);
      
      if (!story) {
        return NextResponse.json({
          success: false,
          error: "Story not found"
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        story
      }, { status: 200 });
    }

    // For listing stories (by kidId), require authentication
    const authHeader = req.headers.get('Authorization');
    const decodedToken = await verifyAuthHeader(authHeader);
    const _authenticatedUid = decodedToken?.uid;

    // Get stories by kid ID
    if (kidId) {
      const stories = await firestoreServerService.getStoriesByKidId(kidId);
      return NextResponse.json({
        success: true,
        stories
      }, { status: 200 });
    }
    
    return NextResponse.json({
      success: false,
      error: "Missing required parameters"
    }, { status: 400 });
    
  } catch (error) {
    console.error("[STORY_API_ERROR]", error);
    
    return NextResponse.json({
      success: false,
      error: "Failed to fetch stories",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

/**
 * DELETE endpoint to remove a story
 */
export async function DELETE(req: NextRequest): Promise<Response> {
  try {
    // Check if Firestore service is ready before proceeding
    const readyCheck = checkFirestoreReady(req);
    if (readyCheck) return readyCheck;

    const authHeader = req.headers.get('Authorization');
    const decodedToken = await verifyAuthHeader(authHeader);
    const _authenticatedUid = decodedToken?.uid;
    
    const userId = req.nextUrl.searchParams.get("userId");
    const storyId = req.nextUrl.searchParams.get("storyId");
    const kidId = req.nextUrl.searchParams.get("kidId");

    if (!userId || !storyId || !kidId) {
      return NextResponse.json({
        success: false,
        error: "Missing required parameters"
      }, { status: 400 });
    }

    await firestoreServerService.deleteStory(userId, kidId, storyId);
    
    return NextResponse.json({
      success: true,
      message: "Story deleted successfully"
    }, { status: 200 });
    
  } catch (error) {
    console.error("[STORY_API_ERROR]", error);
    
    return NextResponse.json({
      success: false,
      error: "Failed to delete story",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

/**
 * PATCH endpoint for partial updates to a story
 * Uses Firestore transaction to prevent race conditions when multiple updates happen simultaneously
 */
export async function PATCH(req: NextRequest) {
  try {
    // Check if Firestore service is ready before proceeding
    const readyCheck = checkFirestoreReady(req);
    if (readyCheck) return readyCheck;

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    const decodedToken = await verifyAuthHeader(authHeader);
    const _authenticatedUid = decodedToken?.uid;
    
    const storyId = req.nextUrl.searchParams.get("storyId");
    if (!storyId) {
      return NextResponse.json({
        success: false,
        error: "Missing story ID"
      }, { status: 400 });
    }
    
    // Get the patch data from the request body
    const patchData = await req.json();
    
    // Use transaction to prevent race conditions
    const updatedStory = await firestoreServerService.updateStoryWithTransaction(storyId, patchData);
    
    if (!updatedStory) {
      return NextResponse.json({
        success: false,
        error: "Story not found"
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      story: updatedStory
    }, { status: 200 });
  } catch (error) {
    console.error("[STORY_PATCH_API_ERROR]", error);
    
    return NextResponse.json({
      success: false,
      error: "Failed to update story",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export const dynamic = "force-dynamic"; 