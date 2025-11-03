# Services

This directory contains service classes that handle business logic and external integrations.

## Available Services

### Firebase Admin Service
Handles Firebase Admin SDK initialization and provides access to admin services.

### Firestore Service
Handles Firestore database operations for stories and user data.

### Storage Service
Handles Firebase Storage operations for images and other files.

### Upload Service
Handles file uploads to Firebase Storage.

### Story Service
Handles story creation, updates, and management.

### Page Operations Service
Handles story page operations like text generation and image generation.

### Error Reporting Service (NEW)
Handles error reporting, monitoring, and crash tracking.

## Error Reporting Service

The error reporting service provides centralized error monitoring and reporting functionality. It integrates with Sentry for real-time error monitoring and provides:

### Features
- **Error Tracking**: Captures and reports errors with context
- **User Tracking**: Associates errors with user information
- **Global Error Capture**: Automatically captures unhandled errors and promise rejections
- **Custom Logging**: Log custom messages and warnings
- **Error Boundaries**: Enhanced error boundaries with automatic error reporting

### Usage

#### Basic Error Reporting
```typescript
import * as Sentry from '@sentry/nextjs';

// Record an error
Sentry.captureException(new Error('Something went wrong'), {
  extra: {
    component: 'StoryGenerator',
    action: 'generateStory'
  }
});

// Log a custom message
Sentry.addBreadcrumb({
  category: 'info',
  message: 'User started story generation',
  data: {
    storyType: 'adventure',
    kidAge: 8
  },
  level: 'info'
});
```

#### Using the Hook
```typescript
import { useErrorReporting } from '@/app/hooks/useErrorReporting';

function MyComponent() {
  const { log, recordError } = useErrorReporting();
  
  const handleError = () => {
    recordError(new Error('Component error'), {
      component: 'MyComponent'
    });
  };
  
  return <div>...</div>;
}
```

#### Error Boundaries
```typescript
import { ErrorBoundary } from '@/app/components/ui/ErrorBoundary';

<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>
```

### Configuration

The error reporting service automatically:
- Captures unhandled errors and promise rejections
- Tracks user information when authenticated
- Sends error reports to Sentry
- Logs to console in development

### Integration Options

You can extend the error reporting service to integrate with external services:

1. **Sentry**: Already integrated for real-time error monitoring
2. **LogRocket**: Add LogRocket initialization
3. **Bugsnag**: Add Bugsnag error reporting
4. **Custom API**: Modify the API endpoint to send to your own service

### Environment Variables

Optional environment variables:
- `NEXT_PUBLIC_APP_VERSION`: App version for error tracking
- `NEXT_PUBLIC_ERROR_REPORTING_ENDPOINT`: Custom error reporting endpoint

### Monitoring

Error reports are sent to Sentry and logged with the existing logger. You can:

1. Monitor Sentry dashboard for error reports
2. Set up alerts for critical errors
3. Integrate with external monitoring services
4. Store error data in your database

### Best Practices

1. **Use Error Boundaries**: Wrap components that might fail
2. **Add Context**: Include relevant context with errors
3. **User Tracking**: Let the service automatically track user info
4. **Custom Properties**: Set user properties for better error analysis
5. **Avoid Sensitive Data**: Don't log passwords, tokens, or PII 