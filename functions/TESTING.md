# Testing Guide

This guide explains how to run and write tests for the Firebase Cloud Functions.

---

## Setup

### Install Dependencies

```bash
cd functions
npm install
```

This will install:
- `jest` - Testing framework
- `ts-jest` - TypeScript support for Jest
- `@types/jest` - TypeScript types for Jest

---

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Specific Test File

```bash
npm test text-generation.test.ts
```

---

## Test Structure

```
functions/src/__tests__/
├── setup.ts                    # Test setup and configuration
├── text-generation.test.ts     # Tests for text generation
├── image-generation.test.ts    # Tests for image generation
└── functions.test.ts           # Tests for cloud functions
```

---

## What's Tested

### 1. Text Generation (`text-generation.test.ts`)

- ✅ Successful text generation
- ✅ Missing API key error
- ✅ API error handling
- ✅ No text content in response error

### 2. Image Generation (`image-generation.test.ts`)

- ✅ Successful image generation
- ✅ Missing API key error
- ✅ API error handling
- ✅ No image result in response error

### 3. Cloud Functions (`functions.test.ts`)

- ✅ `generateStoryPagesText` - Generate and save story
- ✅ `generateKidAvatarImage` - Generate and save avatar
- ✅ `generateStoryPageImage` - Generate and save page image
- ✅ `generateStoryCoverImage` - Generate and save cover image
- ✅ Authentication validation
- ✅ Required fields validation

---

## Writing New Tests

### Example Test Structure

```typescript
import { yourFunction } from '../your-function';

describe('Your Function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should do something successfully', async () => {
    // Arrange
    const input = { /* test data */ };
    
    // Act
    const result = await yourFunction(input);
    
    // Assert
    expect(result).toBe(expectedValue);
  });

  it('should throw error when input is invalid', async () => {
    // Arrange
    const invalidInput = { /* invalid data */ };
    
    // Act & Assert
    await expect(yourFunction(invalidInput)).rejects.toThrow('Expected error');
  });
});
```

### Mocking Firebase Admin

```typescript
jest.mock('firebase-admin', () => ({
  __esModule: true,
  default: {
    firestore: jest.fn(() => ({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          set: jest.fn(),
          update: jest.fn(),
        })),
      })),
    })),
  },
}));
```

### Mocking External APIs

```typescript
global.fetch = jest.fn();

(global.fetch as jest.Mock).mockResolvedValueOnce({
  ok: true,
  json: async () => ({ /* mock response */ }),
});
```

---

## Test Coverage

Run tests with coverage to see what's covered:

```bash
npm run test:coverage
```

This will generate a coverage report showing:
- Statements coverage
- Branches coverage
- Functions coverage
- Lines coverage

---

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd functions
          npm install
      
      - name: Run tests
        run: |
          cd functions
          npm test
```

---

## Best Practices

### 1. Test Naming

Use descriptive test names that explain what is being tested:

```typescript
// Good
it('should return error when user is not authenticated', async () => {
  // ...
});

// Bad
it('should work', async () => {
  // ...
});
```

### 2. AAA Pattern

Structure tests using Arrange-Act-Assert:

```typescript
it('should generate text successfully', async () => {
  // Arrange - Set up test data
  const input = { promptId: 'test-id', input: 'test' };
  
  // Act - Execute the function
  const result = await generateText(input);
  
  // Assert - Verify the result
  expect(result).toBe('expected text');
});
```

### 3. Clean Up After Tests

Always clean up mocks and test data:

```typescript
afterEach(() => {
  jest.clearAllMocks();
});
```

### 4. Test Edge Cases

Don't just test the happy path:

```typescript
// Test success case
it('should succeed with valid input', async () => { /* ... */ });

// Test error cases
it('should fail with missing input', async () => { /* ... */ });
it('should fail with invalid input', async () => { /* ... */ });
```

### 5. Mock External Dependencies

Always mock external APIs and services:

```typescript
// Mock OpenAI API
global.fetch = jest.fn();

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({ /* ... */ }));
```

---

## Debugging Tests

### Run Single Test

```bash
npm test -- -t "should generate text successfully"
```

### Run Tests with Verbose Output

```bash
npm test -- --verbose
```

### Debug in VS Code

Add this to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Jest: Current File",
      "program": "${workspaceFolder}/functions/node_modules/.bin/jest",
      "args": ["${fileBasenameNoExtension}", "--no-coverage"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

---

## Troubleshooting

### Tests Fail with "Cannot find module"

```bash
# Clear Jest cache
npm test -- --clearCache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Tests Timeout

Increase timeout in `jest.config.js`:

```javascript
module.exports = {
  testTimeout: 30000, // 30 seconds
};
```

### Mock Not Working

Make sure mocks are defined before imports:

```typescript
// Mock first
jest.mock('firebase-admin');

// Then import
import * as admin from 'firebase-admin';
```

---

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Firebase Testing Guide](https://firebase.google.com/docs/functions/unit-testing)
- [TypeScript with Jest](https://jestjs.io/docs/getting-started#using-typescript)

