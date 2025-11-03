# Tests

This directory contains all tests for the Firebase Cloud Functions.

## Quick Start

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Files

- `setup.ts` - Test setup and configuration
- `text-generation.test.ts` - Tests for text generation functions
- `image-generation.test.ts` - Tests for image generation functions
- `functions.test.ts` - Tests for cloud functions

## Running Specific Tests

```bash
# Run only text generation tests
npm test text-generation

# Run only image generation tests
npm test image-generation

# Run only cloud functions tests
npm test functions
```

## Test Coverage

```bash
npm run test:coverage
```

This will show coverage for:
- Statements
- Branches
- Functions
- Lines

## Writing New Tests

See [TESTING.md](../../TESTING.md) for detailed guide on writing tests.

