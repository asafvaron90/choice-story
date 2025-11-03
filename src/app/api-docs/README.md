# API Documentation System with Swagger UI

This directory contains the automatic API documentation system for the Choice Story application, powered by Swagger UI.

## Features

- **Interactive Documentation**: Provides a full Swagger UI experience matching the official swagger.io look and feel
- **Automatic API Discovery**: Scans and detects API endpoints without manual configuration
- **Real-time Updates**: Documentation automatically updates as API changes
- **Try It Out**: Test API endpoints directly from the documentation
- **OpenAPI 3.0 Compliance**: Generates standardized OpenAPI specifications

## How It Works

The system works through these components:

1. **API Scanner** (`route.ts`): Scans the `/api` directory for route files and builds an OpenAPI specification
2. **Swagger UI Integration** (`page.tsx`): Renders the interactive Swagger UI interface using the official swagger-ui-react package
3. **Custom Styling** (`swagger-overrides.css`): Provides styling to match the official Swagger UI experience

## Adding New API Endpoints

Simply create your Next.js API routes using the standard pattern, and they will automatically appear in the documentation:

```typescript
// src/app/api/your-new-endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Your implementation
  return NextResponse.json({ success: true, data: "Hello!" });
}

export async function POST(req: NextRequest) {
  // Your implementation
  const body = await req.json();
  return NextResponse.json({ success: true, receivedData: body });
}
```

## How to Enhance Documentation

For the best documentation experience:

1. **Add TypeScript Types**: Define interfaces and types for your request/response data
2. **Use Zod Validation**: Add Zod schemas to validate request data
3. **Create Custom Documentation**: For specific endpoints, add detailed templates in `route.ts`

## Try It Out Functionality

The Swagger UI integration includes the full "Try it out" feature, allowing you to:

1. Test endpoints directly from the documentation
2. Fill in parameters and request bodies
3. Execute API calls and see real responses
4. View response headers, status codes, and timing information

## Authorization

The documentation is configured to work with Bearer token authentication. When testing protected endpoints:

1. Click the "Authorize" button
2. Enter your Bearer token
3. All subsequent API calls will include the authentication header

## Accessing the Documentation

The API documentation is available at `/api-docs` in the application.

## Dependencies

- **swagger-ui-react**: Official React component for Swagger UI
- **Next.js App Router**: For routing and API endpoint detection

## References

- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) 