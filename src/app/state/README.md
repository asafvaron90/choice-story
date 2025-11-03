# State Management Architecture

This directory contains state management for the application using Zustand. The architecture is designed to provide global state that can be accessed from anywhere in the application while maintaining good separation of concerns.

## State Stores

### UserState (`user-state.ts`)

Manages authentication state and user data:

- **Authentication**: Tracks the current Firebase user
- **User Data**: Stores user profile from Firestore
- **Actions**: Methods to fetch, update, and clear user data

```typescript
// Example: Access user state directly
import useUserState from '../state/user-state';

function MyComponent() {
  const { currentUser, userData, updateUserInFirestore } = useUserState();
  
  // Use state and actions...
}
```

### KidsState (`kids-state.ts`)

Manages kids data for the current user:

- **Kids**: Stores array of kids with their details
- **Caching**: Tracks when kids were last fetched
- **Actions**: Methods to set, clear, and update kids data

```typescript
// Example: Access kids state directly
import useKidsState from '../state/kids-state';

function MyComponent() {
  const { kids, setKids, clearKids } = useKidsState();
  
  // Use state and actions...
}
```

### FirestoreState (`firestore.state.ts`)

Manages general Firestore operations:

- **Account Data**: Stores account information
- **Users**: Stores users associated with an account
- **Actions**: Methods to fetch account and user data

## Integrated Access with useUserData

For convenience, the `useUserData` hook in `hooks/useUserData.ts` combines authentication context with user and kids state, providing a single interface for all user-related data:

```typescript
// Example: Using the integrated hook
import useUserData from '../hooks/useUserData';

function UserProfile() {
  const {
    // User data
    user,              // Firebase user object
    userData,          // Firestore user data
    isNewUser,         // Flag for new users
    isLoading,         // Loading state
    
    // Kids data
    kids,              // Array of kid objects
    hasKids,           // Boolean if user has kids
    kidsLoaded,        // Boolean if kids data has been loaded
    
    // Actions
    updateUser,        // Function to update user data
    refreshUserData,   // Function to refresh user data
    refreshKids        // Function to refresh kids data
  } = useUserData();
  
  // Build UI with this data...
}
```

## Best Practices

1. **Use the integrated hook** (`useUserData`) when you need access to both user and kids data
2. **Access specific stores directly** when you only need one type of data
3. **Minimize prop drilling** by accessing state where needed rather than passing it through components
4. **Handle loading and error states** using the flags provided by the state stores
5. **Refresh data** only when needed, the stores handle caching automatically

## State Architecture Diagram

```
┌─────────────────────┐     ┌─────────────────────┐
│                     │     │                     │
│    AuthContext      │     │    useUserState     │
│  (Firebase Auth)    │     │  (Firestore data)   │
│                     │     │                     │
└─────────┬───────────┘     └──────────┬──────────┘
          │                            │
          │                            │
          ▼                            ▼
┌─────────────────────────────────────────────────┐
│                                                 │
│                  useUserData                    │
│          (Combined user data & actions)         │
│                                                 │
└───────────────────────┬─────────────────────────┘
                        │
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│                                                 │
│                 useKidsState                    │
│            (Kids data & actions)                │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Example Usage

See `components/UserProfileExample.tsx` for a complete example of how to use the state management system to build a profile page. 