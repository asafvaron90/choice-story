import { getAnalytics, logEvent, setUserProperties, Analytics } from 'firebase/analytics';
import * as Sentry from '@sentry/nextjs';

/**
 * Session tracking for timing and cost accumulation
 */
interface SessionData {
  startTime: number;
  costs: {
    titleGeneration: number;
    storyText: number;
    imageGeneration: number;
  };
  metadata?: Record<string, any>;
}

interface PageViewData {
  startTime: number;
  pageNum: number;
  pageType: string;
}

interface ImageGenerationData {
  startTime: number;
}

/**
 * Firebase Analytics Service
 * Centralizes all analytics tracking for the application
 * 
 * Features:
 * - Automatic timing tracking (no manual Date.now() needed)
 * - Session-based cost accumulation
 * - Automatic cleanup and memory management
 * 
 * @see ANALYTICS_REFERENCE.md for complete usage guide and event reference
 * 
 * Quick Start:
 * - Use hooks in React components: useStoryCreationAnalytics, useStoryReadingAnalytics, useImageGenerationAnalytics
 * - Use service directly in API routes and server-side code
 * - Call startXxx() before operations, trackXxx() after operations
 * - Service automatically tracks timing and accumulates costs
 */
export class FirebaseAnalyticsService {
  private static analytics: Analytics | null = null;
  private static isInitialized = false;
  
  // Session management
  private static storySessions = new Map<string, SessionData>(); // key: storyId or userId
  private static readingSessions = new Map<string, number>(); // key: storyId, value: startTime
  private static pageViews = new Map<string, PageViewData>(); // key: storyId
  private static imageGenerations = new Map<string, ImageGenerationData>(); // key: storyId-pageType

  /**
   * Initialize Firebase Analytics
   */
  static initialize(): void {
    if (typeof window === 'undefined') {
      // Analytics only works in the browser
      return;
    }

    if (this.isInitialized) {
      return;
    }

    try {
      // Enable debug mode for development
      const isDevelopment = process.env.NODE_ENV === 'development' || 
                           window.location.hostname === 'localhost';
      
      if (isDevelopment) {
        // Set debug mode BEFORE loading analytics
        // This tells Firebase to treat this as a debug device
        (window as any)['ga-disable-G-7HYE0TTQCL'] = false; // Enable analytics
        
        // Set Firebase Analytics debug mode
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get('analytics_debug') === '1' || 
            localStorage.getItem('firebase_analytics_debug') === 'true' ||
            isDevelopment) {
          // Enable debug mode flags
          (window as any).gtag_enable_tcf_support = true;
          console.log('[Analytics] 🐛 DEBUG MODE ENABLED - Events will show in DebugView immediately!');
          console.log('[Analytics] 📍 Go to: Firebase Console → Analytics → DebugView');
          console.log('[Analytics] 🔗 https://console.firebase.google.com/');
        }
      }

      // Lazy import firebase app to avoid SSR issues
      import('@choiceStoryWeb/firebase').then(({ app }) => {
        if (app) {
          try {
            // Initialize analytics with debug mode if enabled
            this.analytics = getAnalytics(app);
            
            // Additional debug mode configuration
            if (isDevelopment) {
              // Set the analytics to debug mode
              (window as any).gtag?.('config', 'G-7HYE0TTQCL', {
                'debug_mode': true
              });
            }
            
            this.isInitialized = true;
            console.log('[Analytics] ✅ Firebase Analytics initialized' + (isDevelopment ? ' (DEBUG MODE)' : ''));
            
            // Test event to verify connection
            if (isDevelopment) {
              setTimeout(() => {
                this.logAnalyticsEvent('analytics_debug_test', {
                  test: true,
                  timestamp: Date.now()
                });
                console.log('[Analytics] 🧪 Test event sent. Check DebugView in 10-15 seconds.');
              }, 2000);
            }
          } catch (analyticsError: any) {
            // Handle common Analytics initialization errors
            if (analyticsError?.message?.includes('gtag') || 
                analyticsError?.message?.includes('googletagmanager')) {
              console.warn('[Analytics] ⚠️ Google Tag Manager blocked (likely browser settings or network restriction)');
              console.warn('[Analytics] 💡 Analytics will still log to console for development.');
              console.warn('[Analytics] 🔧 Events will work in production but DebugView won\'t work locally.');
              
              // Mark as initialized anyway so we can at least log to console
              this.isInitialized = true;
            } else {
              console.error('[Analytics] Failed to initialize:', analyticsError);
              Sentry.captureException(analyticsError);
            }
          }
        }
      }).catch(error => {
        console.error('[Analytics] Failed to load Firebase app:', error);
        Sentry.captureException(error);
      });
    } catch (error) {
      console.error('[Analytics] Error during Analytics initialization:', error);
      Sentry.captureException(error);
    }
  }

  /**
   * Set user properties for analytics
   */
  static setUser(userId: string, properties?: Record<string, string>): void {
    if (!this.analytics || typeof window === 'undefined') {
      return;
    }

    try {
      setUserProperties(this.analytics, {
        user_id: userId,
        ...properties
      });
    } catch (error) {
      console.error('[Analytics] Error setting user properties:', error);
      Sentry.captureException(error);
    }
  }

  // ============================================
  // Story Reading Analytics
  // ============================================

  /**
   * Track when a user starts reading a story
   * Automatically manages session timing
   */
  static trackReadingStoryStart(storyId: string, userId: string, storyTitle?: string): void {
    // Store session start time
    this.readingSessions.set(storyId, Date.now());
    
    this.logAnalyticsEvent('reading_story_start', {
      story_id: storyId,
      user_id: userId,
      story_title: storyTitle || 'Unknown',
      timestamp: Date.now()
    });
  }

  /**
   * Track when a user finishes reading a story
   * Automatically calculates duration from session start
   */
  static trackReadingStoryFinish(
    storyId: string, 
    userId: string, 
    storyTitle?: string
  ): void {
    const startTime = this.readingSessions.get(storyId);
    const durationMs = startTime ? Date.now() - startTime : 0;
    
    this.logAnalyticsEvent('reading_story_finish', {
      story_id: storyId,
      user_id: userId,
      story_title: storyTitle || 'Unknown',
      duration_ms: durationMs,
      duration_seconds: Math.round(durationMs / 1000),
      duration_minutes: Math.round(durationMs / 60000),
      timestamp: Date.now()
    });
    
    // Clean up session
    this.readingSessions.delete(storyId);
    this.pageViews.delete(storyId);
  }

  /**
   * Track when a user selects a story path (good or bad choice)
   */
  static trackReadingStorySelectedPath(
    storyId: string,
    userId: string,
    pathType: 'good' | 'bad',
    pageNum: number,
    storyTitle?: string
  ): void {
    this.logAnalyticsEvent('reading_story_selected_path', {
      story_id: storyId,
      user_id: userId,
      path_type: pathType,
      page_num: pageNum,
      story_title: storyTitle || 'Unknown',
      timestamp: Date.now()
    });
  }

  // Legacy methods for backward compatibility
  static trackStoryReadStart = this.trackReadingStoryStart;
  static trackStoryReadEnd = this.trackReadingStoryFinish;

  /**
   * Track when user views a story page
   * Automatically tracks duration from previous page
   */
  static trackStoryPageView(
    storyId: string,
    pageNum: number,
    pageType: string
  ): void {
    // Track previous page duration
    const previousPage = this.pageViews.get(storyId);
    if (previousPage) {
      const durationMs = Date.now() - previousPage.startTime;
      this.logAnalyticsEvent('story_page_view', {
        story_id: storyId,
        page_num: previousPage.pageNum,
        page_type: previousPage.pageType,
        duration_ms: durationMs,
        duration_seconds: Math.round(durationMs / 1000)
      });
    }
    
    // Start tracking new page
    this.pageViews.set(storyId, {
      startTime: Date.now(),
      pageNum,
      pageType
    });
  }

  // ============================================
  // Story Creation Analytics (with Session Management)
  // ============================================

  /**
   * Start a story creation session
   * Automatically manages timing and cost accumulation
   */
  static startStoryCreationSession(
    userId: string,
    kidId: string,
    problemDescription: string
  ): void {
    const sessionKey = `${userId}-${kidId}`;
    
    // Initialize session
    this.storySessions.set(sessionKey, {
      startTime: Date.now(),
      costs: {
        titleGeneration: 0,
        storyText: 0,
        imageGeneration: 0
      },
      metadata: { kidId, problemDescription }
    });
    
    this.logAnalyticsEvent('story_creation_start', {
      user_id: userId,
      kid_id: kidId,
      problem_length: problemDescription.length,
      timestamp: Date.now()
    });
  }

  /**
   * Track when story creation completes
   * Automatically calculates duration and total cost from session
   */
  static trackStoryCreationComplete(
    storyId: string,
    userId: string,
    kidId: string,
    storyTitle?: string
  ): void {
    const sessionKey = `${userId}-${kidId}`;
    const session = this.storySessions.get(sessionKey);
    
    const durationMs = session ? Date.now() - session.startTime : 0;
    const totalCost = session 
      ? session.costs.titleGeneration + session.costs.storyText + session.costs.imageGeneration 
      : 0;
    
    this.logAnalyticsEvent('story_creation_complete', {
      story_id: storyId,
      user_id: userId,
      kid_id: kidId,
      story_title: storyTitle || 'Unknown',
      duration_ms: durationMs,
      duration_seconds: Math.round(durationMs / 1000),
      duration_minutes: Math.round(durationMs / 60000),
      total_cost_usd: totalCost,
      timestamp: Date.now()
    });
    
    // Track cost breakdown
    if (session) {
      this.trackStoryCreationCost(userId, storyId, totalCost, {
        titleGenerationCost: session.costs.titleGeneration,
        storyTextCost: session.costs.storyText,
        imageGenerationCost: session.costs.imageGeneration
      });
    }
    
    // Clean up session
    this.storySessions.delete(sessionKey);
  }

  /**
   * Track story creation failure
   * Automatically calculates duration from session
   */
  static trackStoryCreationError(
    userId: string,
    kidId: string,
    error: string
  ): void {
    const sessionKey = `${userId}-${kidId}`;
    const session = this.storySessions.get(sessionKey);
    const durationMs = session ? Date.now() - session.startTime : 0;
    
    this.logAnalyticsEvent('story_creation_error', {
      user_id: userId,
      kid_id: kidId,
      error_message: error,
      duration_ms: durationMs,
      timestamp: Date.now()
    });
    
    // Clean up session
    this.storySessions.delete(sessionKey);
  }
  
  /**
   * Legacy method for backward compatibility
   */
  static trackStoryCreationStart = this.startStoryCreationSession;

  // ============================================
  // Story Generation Steps Analytics
  // ============================================

  /**
   * Start tracking title generation
   */
  static startTitleGeneration(userId: string, kidId: string): void {
    const sessionKey = `${userId}-${kidId}`;
    const session = this.storySessions.get(sessionKey);
    if (session) {
      session.metadata = { ...session.metadata, titleGenStartTime: Date.now() };
    }
  }

  /**
   * Track title generation completion
   * Automatically calculates duration and adds cost to session
   */
  static trackTitleGeneration(
    userId: string,
    kidId: string,
    titlesCount: number,
    cost?: number
  ): void {
    const sessionKey = `${userId}-${kidId}`;
    const session = this.storySessions.get(sessionKey);
    
    const startTime = session?.metadata?.titleGenStartTime || Date.now();
    const durationMs = Date.now() - startTime;
    const titleCost = cost || 0;
    
    // Add cost to session
    if (session) {
      session.costs.titleGeneration = titleCost;
    }
    
    this.logAnalyticsEvent('title_generation', {
      user_id: userId,
      kid_id: kidId,
      duration_ms: durationMs,
      duration_seconds: Math.round(durationMs / 1000),
      titles_count: titlesCount,
      cost_usd: titleCost,
      timestamp: Date.now()
    });
    
    // Track OpenAI cost
    if (cost) {
      this.trackOpenAICost(userId, 'title_generation', cost, 'gpt-4o-mini');
    }
  }

  /**
   * Track story text generation start
   */
  static startTextGeneration(
    userId: string,
    kidId: string,
    storyTitle?: string
  ): void {
    const sessionKey = `${userId}-${kidId}`;
    const session = this.storySessions.get(sessionKey);
    if (session) {
      session.metadata = { 
        ...session.metadata, 
        textGenStartTime: Date.now(),
        storyTitle 
      };
    }
    
    this.logAnalyticsEvent('creating_text_start', {
      user_id: userId,
      kid_id: kidId,
      story_title: storyTitle || 'Unknown',
      timestamp: Date.now()
    });
  }

  /**
   * Track story text generation finish
   * Automatically calculates duration and adds cost to session
   */
  static trackTextGeneration(
    userId: string,
    kidId: string,
    pagesCount: number,
    cost?: number,
    storyTitle?: string
  ): void {
    const sessionKey = `${userId}-${kidId}`;
    const session = this.storySessions.get(sessionKey);
    
    const startTime = session?.metadata?.textGenStartTime || Date.now();
    const durationMs = Date.now() - startTime;
    const textCost = cost || 0;
    
    // Add cost to session
    if (session) {
      session.costs.storyText = textCost;
    }
    
    this.logAnalyticsEvent('creating_text_finish', {
      user_id: userId,
      kid_id: kidId,
      story_title: storyTitle || session?.metadata?.storyTitle || 'Unknown',
      duration_ms: durationMs,
      duration_seconds: Math.round(durationMs / 1000),
      pages_count: pagesCount,
      cost_usd: textCost,
      timestamp: Date.now()
    });
    
    // Track OpenAI cost
    if (cost) {
      this.trackOpenAICost(userId, 'story_generation', cost, 'gpt-4o-mini');
    }
  }

  /**
   * Legacy methods for backward compatibility
   */
  static trackCreatingTextStart = this.startTextGeneration;
  static trackCreatingTextFinish = this.trackTextGeneration;
  static trackStoryTextGeneration = this.trackTextGeneration;

  // ============================================
  // Image Generation Analytics
  // ============================================

  /**
   * Track image generation start
   * Automatically manages timing
   */
  static startImageGeneration(
    userId: string,
    storyId: string,
    pageType: string,
    isRegeneration: boolean = false,
    storyTitle?: string
  ): void {
    const imageKey = `${storyId}-${pageType}`;
    this.imageGenerations.set(imageKey, { startTime: Date.now() });
    
    this.logAnalyticsEvent('creating_image_start', {
      user_id: userId,
      story_id: storyId,
      page_type: pageType,
      is_regeneration: isRegeneration,
      story_title: storyTitle || 'Unknown',
      timestamp: Date.now()
    });
  }

  /**
   * Track image generation finish
   * Automatically calculates duration and adds cost to session
   */
  static trackImageGeneration(
    userId: string,
    storyId: string,
    pageType: string,
    cost?: number,
    isRegeneration: boolean = false,
    storyTitle?: string,
    kidId?: string,
    durationMsOverride?: number
  ): void {
    const imageKey = `${storyId}-${pageType}`;
    const imageGen = this.imageGenerations.get(imageKey);
    const durationMs = durationMsOverride || (imageGen ? Date.now() - imageGen.startTime : 0);
    const imageCost = cost || 0;
    
    // Add cost to session if available
    if (kidId && userId) {
      const sessionKey = `${userId}-${kidId}`;
      const session = this.storySessions.get(sessionKey);
      if (session) {
        session.costs.imageGeneration += imageCost;
      }
    }
    
    this.logAnalyticsEvent('creating_image_finish', {
      user_id: userId,
      story_id: storyId,
      page_type: pageType,
      duration_ms: durationMs,
      duration_seconds: Math.round(durationMs / 1000),
      cost_usd: imageCost,
      is_regeneration: isRegeneration,
      story_title: storyTitle || 'Unknown',
      timestamp: Date.now()
    });
    
    // Track regeneration separately if needed
    if (isRegeneration) {
      this.trackImageRegeneration(userId, storyId, pageType, durationMs, cost);
    }
    
    // Track OpenAI cost
    if (cost) {
      this.trackOpenAICost(
        userId,
        isRegeneration ? 'image_regeneration' : 'image_generation',
        cost,
        'dall-e-3',
        undefined,
        storyId
      );
    }
    
    // Clean up
    this.imageGenerations.delete(imageKey);
  }

  // Legacy methods for backward compatibility
  static trackCreatingImageStart = this.startImageGeneration;
  static trackCreatingImageFinish = this.trackImageGeneration;
  static trackImageGenerationStart = this.startImageGeneration;
  static trackImageGenerationComplete = this.trackImageGeneration;

  /**
   * Track image regeneration specifically
   */
  static trackImageRegeneration(
    userId: string,
    storyId: string,
    pageType: string,
    durationMs: number,
    cost?: number
  ): void {
    this.logAnalyticsEvent('image_regeneration', {
      user_id: userId,
      story_id: storyId,
      page_type: pageType,
      duration_ms: durationMs,
      duration_seconds: Math.round(durationMs / 1000),
      cost_usd: cost || 0,
      timestamp: Date.now()
    });
  }

  /**
   * Track image generation error
   * Automatically calculates duration from session
   */
  static trackImageGenerationError(
    userId: string,
    storyId: string,
    pageType: string,
    error: string,
    isRegeneration: boolean = false
  ): void {
    const imageKey = `${storyId}-${pageType}`;
    const imageGen = this.imageGenerations.get(imageKey);
    const durationMs = imageGen ? Date.now() - imageGen.startTime : 0;
    
    this.logAnalyticsEvent('image_generation_error', {
      user_id: userId,
      story_id: storyId,
      page_type: pageType,
      error_message: error,
      duration_ms: durationMs,
      is_regeneration: isRegeneration,
      timestamp: Date.now()
    });
    
    // Clean up
    this.imageGenerations.delete(imageKey);
  }

  // ============================================
  // Cost Tracking Analytics
  // ============================================

  /**
   * Track OpenAI API cost
   */
  static trackOpenAICost(
    userId: string,
    operation: 'title_generation' | 'story_generation' | 'image_generation' | 'text_regeneration' | 'image_regeneration',
    costUSD: number,
    model: string,
    tokensUsed?: number,
    storyId?: string
  ): void {
    this.logAnalyticsEvent('openai_cost', {
      user_id: userId,
      operation,
      cost_usd: costUSD,
      model,
      tokens_used: tokensUsed || 0,
      story_id: storyId || 'N/A',
      timestamp: Date.now()
    });
  }

  /**
   * Track total story creation cost
   */
  static trackStoryCreationCost(
    userId: string,
    storyId: string,
    totalCostUSD: number,
    breakdown: {
      titleGenerationCost?: number;
      storyTextCost?: number;
      imageGenerationCost?: number;
    }
  ): void {
    this.logAnalyticsEvent('story_creation_cost', {
      user_id: userId,
      story_id: storyId,
      total_cost_usd: totalCostUSD,
      title_generation_cost: breakdown.titleGenerationCost || 0,
      story_text_cost: breakdown.storyTextCost || 0,
      image_generation_cost: breakdown.imageGenerationCost || 0,
      timestamp: Date.now()
    });
  }

  // ============================================
  // Performance Analytics
  // ============================================

  /**
   * Track API response time
   */
  static trackAPIPerformance(
    endpoint: string,
    durationMs: number,
    success: boolean,
    statusCode?: number
  ): void {
    this.logAnalyticsEvent('api_performance', {
      endpoint,
      duration_ms: durationMs,
      duration_seconds: Math.round(durationMs / 1000),
      success,
      status_code: statusCode || 0,
      timestamp: Date.now()
    });
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Internal method to log analytics events
   */
  private static logAnalyticsEvent(eventName: string, params: Record<string, any>): void {
    const isDevelopment = typeof window !== 'undefined' && 
                         (process.env.NODE_ENV === 'development' || 
                          window.location.hostname === 'localhost');

    // Always log to console in development, even if analytics isn't initialized
    if (isDevelopment) {
      console.group(`[Analytics] 📊 ${eventName}`);
      console.log('Parameters:', params);
      if (this.analytics) {
        console.log('Status: ✅ Sent to Firebase');
      } else {
        console.log('Status: ⚠️ Console only (Analytics not initialized)');
      }
      console.groupEnd();
    }

    if (!this.analytics || typeof window === 'undefined') {
      // If analytics is not initialized, we've already logged to console above
      return;
    }

    try {
      // Firebase Analytics has a limit on parameter values
      const sanitizedParams = this.sanitizeParams(params);
      logEvent(this.analytics, eventName, sanitizedParams);
      
      // Also log to Sentry for tracking
      Sentry.addBreadcrumb({
        category: 'analytics',
        message: `Analytics event: ${eventName}`,
        data: sanitizedParams,
        level: 'info'
      });
    } catch (error: any) {
      // Gracefully handle analytics errors - don't break the app
      if (isDevelopment) {
        console.warn(`[Analytics] ⚠️ Could not send ${eventName} to Firebase:`, error.message);
        console.log('[Analytics] 💡 Event was logged to console. Check for ad blockers or network issues.');
      }
      
      // Only report non-network errors to Sentry
      if (!error.message?.includes('network') && !error.message?.includes('gtag')) {
        Sentry.captureException(error);
      }
    }
  }

  /**
   * Sanitize parameters to meet Firebase Analytics requirements
   * - Max 100 chars for string values
   * - Max 25 parameters per event
   */
  private static sanitizeParams(params: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    let paramCount = 0;

    for (const [key, value] of Object.entries(params)) {
      if (paramCount >= 25) {
        console.warn('[Analytics] Maximum parameter count (25) reached, truncating...');
        break;
      }

      if (typeof value === 'string' && value.length > 100) {
        sanitized[key] = value.substring(0, 97) + '...';
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (value !== null && value !== undefined) {
        sanitized[key] = String(value).substring(0, 100);
      }

      paramCount++;
    }

    return sanitized;
  }
}

// Auto-initialize analytics when module is imported
if (typeof window !== 'undefined') {
  FirebaseAnalyticsService.initialize();
}



