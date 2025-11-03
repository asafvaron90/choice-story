import { NextRequest, NextResponse } from 'next/server';

/**
 * Route handler for proxying requests to the batchImageGen Firebase Function
 * This provides a local endpoint during development that forwards to the deployed function
 */
export async function POST(request: NextRequest) {
  try {
    // Determine the Firebase function URL based on environment
    let functionUrl = 'https://us-central1-choicestory-b3135.cloudfunctions.net/batchImageGen';
    
    // If we're in development and you have a local emulator running
    if (process.env.FIREBASE_EMULATOR === 'true') {
      // Use local emulator
      functionUrl = 'http://localhost:5001/choicestory-b3135/us-central1/batchImageGen';
    }
    
    // Get the request body
    const requestBody = await request.json();
    
    console.log(`[API] Proxying batchImageGen request to: ${functionUrl}`);
    
    // Forward the request to the Firebase function
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    // If the response is not OK, throw an error
    if (!response.ok) {
      console.error(`[API] batchImageGen function returned status: ${response.status}`);
      const errorText = await response.text();
      console.error(`[API] batchImageGen error: ${errorText}`);
      return NextResponse.json(
        { success: false, error: `Firebase function returned status: ${response.status}` },
        { status: response.status }
      );
    }
    
    // Get the response body
    const responseBody = await response.json();
    
    // Return the response
    return NextResponse.json(responseBody);
  } catch (error) {
    console.error('[API] Error proxying to batchImageGen function:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 