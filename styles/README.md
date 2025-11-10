# Styles Folder

This folder contains separated StyleSheet definitions for better code organization and maintainability.

## Benefits

1. **Reduced file size** - TSX files are cleaner and easier to read
2. **Better organization** - All styles in one dedicated place
3. **Easier maintenance** - Style changes don't clutter component logic
4. **Reusability** - Styles can be shared across components if needed

## Usage Pattern

### 1. Create a style file (e.g., `map.styles.ts`)

```typescript
import { StyleSheet } from 'react-native';

export const createMapStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // ... more styles
});
```

### 2. Import and use in your component

```typescript
import { createMapStyles } from '@/styles/map.styles';

export default function MapScreen() {
  const { colors } = useTheme();
  const styles = createMapStyles(colors);
  
  return (
    <View style={styles.container}>
      {/* Your component */}
    </View>
  );
}
```

## Naming Convention

- File name: `[component-name].styles.ts`
- Export function: `create[ComponentName]Styles`
- Example: `map.styles.ts` → `createMapStyles()`

## Example: map.tsx

See `map.tsx` and `map.styles.ts` for a complete working example of this pattern.

Before: ~200 lines in map.tsx
After: ~120 lines in map.tsx + ~120 lines in map.styles.ts (separated and organized)
