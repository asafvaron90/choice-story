import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * API endpoint to receive error reports from the client
 * This is optional - you can also use external services like Sentry, LogRocket, etc.
 */
export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      const rawBody = await request.text();
      logger.error({
        message: 'Failed to parse error report JSON',
        error: jsonError,
        rawBody: rawBody,
      });
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    const { type, data, environment, version } = body;

    // Log the error report
    logger.error({
      message: `Error Report: ${type}`,
      error: data.error,
      context: {
        type,
        environment,
        version,
        url: data.url,
        userId: data.userId,
        userProperties: data.userProperties,
        userAgent: data.userAgent
      }
    });

    // Here you could:
    // - Send to external error reporting service
    // - Store in database
    // - Send notifications
    // - Trigger alerts

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing error report:', error);
    return NextResponse.json(
      { error: 'Failed to process error report' },
      { status: 500 }
    );
  }
} 