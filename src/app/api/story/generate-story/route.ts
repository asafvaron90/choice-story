import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import firestoreServerService from "@/app/services/firestore.server";
import { Story, StoryStatus, PageType } from "@/models";
import { verifyAuthHeader } from "@/app/utils/auth-helpers";
import { checkFirestoreReady } from "@/app/utils/api-helpers";

// Schema for creating a story
const CreateStorySchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  accountId: z.string(),
  kidId: z.string(),
  title: z.string(),
  problemDescription: z.string(),
  status: z.nativeEnum(StoryStatus).optional().default(StoryStatus.GENERATING),
  coverImage: z.string(),
  pages: z.array(
    z.object({
      pageType: z.nativeEnum(PageType),
      storyText: z.string(),
      pageNum: z.number(),
      imageUrl: z.string().optional(),
      imagePrompt: z.string().optional().default('')
    })
  ),
  // Support both Date objects and strings for dates, converting strings to Date objects
  createdAt: z.union([
    z.date(),
    z.string().transform(dateStr => new Date(dateStr))
  ]).optional().default(() => new Date()),
  lastUpdated: z.union([
    z.date(),
    z.string().transform(dateStr => new Date(dateStr))
  ]).optional().default(() => new Date())
});

// Schema for getting a story
const GetStorySchema = z.object({
  storyId: z.string()
});

// Schema for getting stories by kid
const GetStoriesByKidSchema = z.object({
  userId: z.string(),
  kidId: z.string()
});

// Schema for deleting a story
const DeleteStorySchema = z.object({
  userId: z.string(),
  storyId: z.string(),
  kidId: z.string()
});

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
    if (validatedData.pages.length < 1) throw new Error('Missing pages');
    
    const initialStory: Story = {
      ...validatedData,
      id: validatedData.id || '',
      advantages: '',
      disadvantages: '',
      status: StoryStatus.INCOMPLETE,
    };
    
    // 2. Save initial story to get ID
    try {
      const savedStory = await firestoreServerService.saveStory(initialStory);
      initialStory.id = savedStory.id;
      console.log('Initial story saved with ID:', initialStory.id);
    } catch (error) {
      console.error('Failed to save initial story:', error);
      throw new Error('Failed to create story in database');
    }
    
    return NextResponse.json({
      success: true,
      story: initialStory
    }, { status: 201 });
  } catch (error) {
    console.error("[STORY_API_ERROR]", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: "Invalid input",
        details: error.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: "Failed to create story",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

/**
 * GET endpoint to fetch stories (either one story by ID or all stories for a kid)
 */
export async function GET(req: NextRequest) {
  try {
    // Check if Firestore service is ready before proceeding
    const readyCheck = checkFirestoreReady(req);
    if (readyCheck) return readyCheck;

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    const decodedToken = await verifyAuthHeader(authHeader);
    const _authenticatedUid = decodedToken?.uid;
    
    const storyId = req.nextUrl.searchParams.get("storyId");
    const userId = req.nextUrl.searchParams.get("userId");
    const kidId = req.nextUrl.searchParams.get("kidId");
    
    // If storyId is provided, get a single story
    if (storyId) {
      const validatedData = GetStorySchema.parse({ storyId });
      const story = await firestoreServerService.getStoryById(validatedData.storyId);
      
      if (!story) {
        return NextResponse.json({
          success: false,
          error: "Story not found"
        }, { status: 404 });
      }
      

      return NextResponse.json({
        success: true,
        story
      });
    }
    
    // If userId and kidId are provided, get all stories for a kid
    if (kidId) {
      const validatedData = GetStoriesByKidSchema.parse({ userId, kidId });
      

      
      const stories = await firestoreServerService.getStoriesByKidId(validatedData.kidId);
      
      return NextResponse.json({
        success: true,
        stories
      });
    }
    
    return NextResponse.json({
      success: false,
      error: "Missing required parameters"
    }, { status: 400 });
  } catch (error) {
    console.error("[STORY_API_ERROR]", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: "Invalid input",
        details: error.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: "Failed to fetch stories",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

/**
 * DELETE endpoint to delete a story
 */
export async function DELETE(req: NextRequest) {
  try {
    // Check if Firestore service is ready before proceeding
    const readyCheck = checkFirestoreReady(req);
    if (readyCheck) return readyCheck;

    // Verify authentication
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
    
    const validatedData = DeleteStorySchema.parse({ userId, storyId, kidId });
    
    await firestoreServerService.deleteStory(validatedData.userId, validatedData.kidId, validatedData.storyId);
    
    return NextResponse.json({
      success: true,
      message: "Story deleted successfully"
    });
  } catch (error) {
    console.error("[STORY_API_ERROR]", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: "Invalid input",
        details: error.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: "Failed to delete story",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

// export const dynamic = "force-dynamic"; 