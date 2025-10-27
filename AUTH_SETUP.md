# SOIL.OS Authentication Setup

This app includes a complete authentication flow with login, signup, and forgot password screens, **with protected routes using Expo Router v5** and **Firebase Authentication fully configured**.

## Features Implemented

✅ Login screen with email/password
✅ Signup screen with password confirmation  
✅ Forgot password screen with email reset
✅ Password visibility toggle
✅ Auth context for state management
✅ **Protected routes with Stack.Protected**
✅ **Automatic redirects based on auth state**
✅ Sign out functionality
✅ **Firebase Authentication fully integrated**
✅ **AsyncStorage persistence for auth state**
✅ Error handling with user-friendly alerts
✅ Loading states on buttons
✅ UI matches the design reference

## Firebase Configuration

Firebase is **fully set up and ready to use**:

- ✅ Firebase app initialized with your project config
- ✅ Authentication with email/password enabled
- ✅ AsyncStorage persistence for React Native
- ✅ Auth state listener active
- ✅ Password reset email functionality

### Current Firebase Project
- Project: `verdex-soil`
- Auth Domain: `verdex-soil.firebaseapp.com`
- Region: Auto-configured

## Protected Routes Implementation

The app uses Expo Router v5's `Stack.Protected` feature to prevent unauthorized access:

### Route Protection Logic

```typescript
// Auth screens - only accessible when NOT logged in
<Stack.Protected guard={!user}>
  <Stack.Screen name="(auth)" />
</Stack.Protected>

// Protected screens - only accessible when logged in
<Stack.Protected guard={!!user}>
  <Stack.Screen name="(tabs)" />
  <Stack.Screen name="modal" />
</Stack.Protected>
```

### How It Works

1. **User not logged in**: Can only access `(auth)` screens (login, signup, forgot password)
2. **User logged in**: Can only access `(tabs)` screens (dashboard, history, device, help)
3. **Automatic redirects**: If user tries to access unauthorized route, they're redirected to anchor route `(tabs)`
4. **Index route**: Checks auth state and redirects appropriately

## File Structure

```
app/
├── index.tsx                    # Root redirect to login/tabs
├── _layout.tsx                  # Root layout with AuthProvider
├── (auth)/
│   ├── _layout.tsx             # Auth stack navigator
│   ├── login.tsx               # Login screen
│   ├── signup.tsx              # Signup screen
│   └── forgot-password.tsx     # Password reset screen
└── (tabs)/                      # Protected tab navigation

contexts/
└── auth-context.tsx            # Authentication context and hooks

config/
└── firebase.ts                 # Firebase configuration (to be set up)
```

## Next Steps: Firebase Setup

### ✅ COMPLETED - Firebase is Ready!

Firebase Authentication is fully configured and working. You can now:

1. **Create accounts** - Sign up with email/password
2. **Sign in** - Login with existing accounts
3. **Reset passwords** - Use forgot password feature
4. **Stay signed in** - Auth persists with AsyncStorage
5. **Sign out** - Logout from dashboard

### Enable Email/Password Auth in Firebase Console

To use authentication, ensure Email/Password is enabled:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `verdex-soil`
3. Go to **Authentication** → **Sign-in method**
4. Enable **Email/Password** provider
5. Save changes

That's it! The app is ready to authenticate users.

## Running the App

```bash
# Start the development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

## UI Design

The UI is based on the SOIL.OS design with:
- Dark theme (#303135 background)
- Monospace font for title and buttons
- Red primary color (#fb444a)
- Subtle shadow effects
- Clean, modern interface

## Protected Routes (Expo Router v5)

The app uses Expo Router v5's file-based routing. To fully implement protected routes:

1. Check authentication state in `app/index.tsx`
2. Redirect to login if not authenticated
3. Redirect to tabs if authenticated
4. Use `useAuth()` hook to access auth state anywhere

## Authentication Methods

The `useAuth()` hook provides:
- `user` - Current user object or null
- `isLoading` - Loading state
- `signIn(email, password)` - Sign in method
- `signUp(email, password)` - Sign up method
- `signOut()` - Sign out method

## Example Usage

```typescript
import { useAuth } from '@/contexts/auth-context';

function MyComponent() {
  const { user, signOut } = useAuth();

  if (!user) {
    return <Text>Please log in</Text>;
  }

  return (
    <View>
      <Text>Welcome {user.email}</Text>
      <Button title="Sign Out" onPress={signOut} />
    </View>
  );
}
```
