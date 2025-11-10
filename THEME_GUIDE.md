# Theme Implementation Guide

## ✅ What's Been Added:

### 1. **Theme Context** (`contexts/theme-context.tsx`)
- Light/Dark theme support
- Persistent theme selection (AsyncStorage)
- Color palette for both themes

### 2. **Settings Page** (`app/(tabs)/settings.tsx`)
- User profile display
- Theme toggle switch
- Logout button

### 3. **Color Schemes:**

**Light Theme (Yellow/White - from your image):**
```typescript
{
  background: '#FFF9E6',     // Cream/yellow tint
  card: '#FFFFFF',           // Pure white cards
  text: '#2C2C2C',          // Dark text
  textSecondary: '#666666', // Gray text
  primary: '#FFD700',       // Gold/yellow accent
  border: '#E8E8E8',        // Light borders
  success: '#0bda95',       // Green (kept)
  error: '#fb444a',         // Red (kept)
}
```

**Dark Theme (Current):**
```typescript
{
  background: '#303135',
  card: '#46474a',
  text: '#e0daca',
  primary: '#0bda95',
  // ... existing dark colors
}
```

## 🎨 How to Use Theme in Components:

### Import and use:
```typescript
import { useTheme } from '@/contexts/theme-context';

export default function MyComponent() {
  const { theme, colors } = useTheme();
  
  return (
    <View style={{ backgroundColor: colors.background }}>
      <Text style={{ color: colors.text }}>Hello</Text>
    </View>
  );
}
```

### Available colors:
- `colors.background` - Main background
- `colors.card` - Card/section background
- `colors.text` - Primary text
- `colors.textSecondary` - Secondary text
- `colors.primary` - Accent color (yellow in light, green in dark)
- `colors.border` - Borders
- `colors.success` - Success states
- `colors.error` - Error states

## 📱 Settings Page Features:

1. **User Info Card**
   - Avatar with first letter
   - Email display

2. **Theme Toggle**
   - Switch between light/dark
   - Saves preference automatically

3. **Logout Button**
   - Confirmation alert
   - Redirects to login

## 🔄 To Apply Theme to Existing Components:

Replace hardcoded colors:
```typescript
// Before:
style={{ backgroundColor: '#303135', color: '#e0daca' }}

// After:
const { colors } = useTheme();
style={{ backgroundColor: colors.background, color: colors.text }}
```

## 📍 Tab Navigation Updated:
- Added Settings tab (5th tab)
- Icon: settings gear
- Positioned after Help tab
