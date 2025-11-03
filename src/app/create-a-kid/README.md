# Create-a-Kid Module

This module handles the process of creating a kid profile in the Choice Story application. It was separated from the main create-a-story flow to improve code organization and maintainability.

## Structure

- `page.tsx`: Main page component that orchestrates the kid creation flow
- `layout.tsx`: Layout wrapper for the create-a-kid pages
- `state/create-kid-state.ts`: State management for the kid creation process using Zustand
- `components/`: UI components specific to the kid creation process
  - `KidDetailsContent.tsx`: Form for entering kid details (name, age, gender)
  - `GenderSelector.tsx`: Reusable component for selecting gender
  - `ImageUploadContent.tsx`: Interface for uploading and validating the kid's image

## Flow

1. User enters the kid's details (name, age, gender)
2. User uploads an image of the kid
3. The image is validated and analyzed
4. The kid profile is saved to Firestore
5. User is redirected to the create-a-story flow with the selected kid

## State Management

The module uses the `useCreateKidState` hook to manage the kid creation state. This includes:
- Kid details (name, age, gender)
- Image upload and validation
- Step tracking (0 = details, 1 = image upload)
- Completion status

## Integration with Create-a-Story

After a kid is created, the user is automatically redirected to the create-a-story flow with the new kid selected, using a query parameter (`/create-a-story?kidId=[kid_id]`). 