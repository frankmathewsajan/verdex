# SOIL.OS Authentication Setup

This app includes a complete authentication flow with login and forgot password screens, **with protected routes using Expo Router v5** and **Supabase Authentication fully configured**.

## Features Implemented

✅ Login screen with email/password
✅ Forgot password screen with email reset
✅ Password visibility toggle
✅ Auth context for state management
✅ **Protected routes with Stack.Protected**
✅ **Automatic redirects based on auth state**
✅ Sign out functionality
✅ **Supabase Authentication fully integrated**
✅ **AsyncStorage persistence for auth state**
✅ Error handling with user-friendly alerts
✅ Loading states on buttons
✅ UI matches the design reference

## Supabase Configuration

Supabase is **fully set up and ready to use**:

- ✅ Supabase client initialized
- ✅ Authentication with email/password enabled
- ✅ AsyncStorage persistence for React Native
- ✅ Auth state listener active
- ✅ Password reset email functionality

### Current Supabase Project
- Project URL: `https://kdlhvlpoldivrweyjrfg.supabase.co`
- Configuration: `.env.local`

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

1. **User not logged in**: Can only access `(auth)` screens (login, forgot password)
2. **User logged in**: Can only access `(tabs)` screens (dashboard, history, device, help)
3. **Automatic redirects**: If user tries to access unauthorized route, they're redirected to anchor route `(tabs)`
4. **Index route**: Checks auth state and redirects appropriately

## File Structure

```
utils/
└── supabase.ts             # Supabase client configuration

contexts/
└── auth-context.tsx        # Authentication context and hooks

app/
├── index.tsx               # Root redirect to login/tabs
├── _layout.tsx             # Root layout with AuthProvider
├── (auth)/
│   ├── _layout.tsx        # Auth stack navigator
│   ├── login.tsx          # Login screen
│   └── forgot-password.tsx # Password reset screen
└── (tabs)/                 # Protected tab navigation

.env.local                  # Environment variables (Supabase keys)
```

## Environment Variables

The app uses environment variables stored in `.env.local`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://kdlhvlpoldivrweyjrfg.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=<your-anon-key>
```

## Supabase Setup

### ✅ COMPLETED - Supabase is Ready!

Supabase Authentication is fully configured and working. You can now:

1. **Sign in** - Login with existing accounts
2. **Reset passwords** - Use forgot password feature
3. **Stay signed in** - Auth persists with AsyncStorage
4. **Sign out** - Logout from dashboard

### Enable Email/Password Auth in Supabase Dashboard

To use authentication, ensure Email/Password is enabled:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/kdlhvlpoldivrweyjrfg)
2. Go to **Authentication** → **Providers**
3. Enable **Email** provider
4. Configure email templates (optional)
5. Save changes

### Create User Accounts

Since signup is disabled in the UI, create users via:

1. **Supabase Dashboard**: Authentication → Users → Add User
2. **SQL Editor**: 
   ```sql
   -- Create a new user with email/password
   INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
   VALUES ('user@example.com', crypt('password123', gen_salt('bf')), now());
   ```
3. **Supabase API** or CLI

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
- `signOut()` - Sign out method
- `resetPassword(email)` - Password reset method

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
