import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from "@sentry/nextjs";

/**
 * Route handler for proxying requests to the sendEmailFunction Firebase Function
 * This provides a local endpoint that forwards to the deployed function
 * 
 * Request body:
 * {
 *   "to": "recipient@example.com",
 *   "templateId": "TEST",
 *   "variables": { ... }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Determine the Firebase function URL based on environment
    const isDevelopment = process.env.APP_ENV === 'development' || process.env.NEXT_PUBLIC_APP_ENV === 'development';
    
    // Use dev prefix for staging/development (camelCase naming)
    const functionName = isDevelopment ? 'devSendEmailFunction' : 'sendEmailFunction';
    const functionUrl = `https://us-central1-choicestory-b3135.cloudfunctions.net/${functionName}`;
    
    // If we're running with local emulator
    // if (process.env.FIREBASE_EMULATOR === 'true') {
    //   functionUrl = `http://localhost:5001/choicestory-b3135/us-central1/${functionName}`;
    // }
    
    // Get the request body
    const requestBody = await request.json();
    
    // Get the authorization header to forward
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Authorization header is required' },
        { status: 401 }
      );
    }
    
    console.log(`[API] Proxying sendEmail request to: ${functionUrl}`);
    console.log(`[API] Request body:`, requestBody);
    
    // Forward the request to the Firebase function
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(requestBody),
    });
    
    // Get the response as text first to handle non-JSON responses
    const responseText = await response.text();
    
    // Try to parse as JSON
    let responseBody;
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      // Response is not JSON (likely HTML error page)
      console.error(`[API] sendEmailFunction returned non-JSON response:`, responseText.substring(0, 500));
      console.error(`[API] Status: ${response.status}, URL: ${functionUrl}`);
      
      return NextResponse.json(
        { 
          success: false, 
          error: `Firebase function returned non-JSON response (status: ${response.status}). The function may not be deployed yet.`,
          hint: 'Make sure to deploy the Firebase functions first: cd functions && npm run deploy:staging-functions'
        },
        { status: response.status || 502 }
      );
    }
    
    // If the response is not OK, log and return the error
    if (!response.ok) {
      console.error(`[API] sendEmailFunction returned status: ${response.status}`);
      console.error(`[API] sendEmailFunction error:`, responseBody);
      return NextResponse.json(
        { success: false, ...responseBody },
        { status: response.status }
      );
    }
    
    // Return the success response
    return NextResponse.json(responseBody);
  } catch (error) {
    console.error('[API] Error proxying to sendEmailFunction:', error);
    Sentry.captureException(error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

