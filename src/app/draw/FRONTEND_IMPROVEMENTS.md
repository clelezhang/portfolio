# Draw App Frontend Improvements

This document tracks frontend improvements made to the draw application.

## Changes Made

### 1. Extract Magic Numbers to Constants

**File:** `constants.ts`

Added named constants to replace hardcoded values scattered throughout the codebase:

| Constant | Value | Purpose |
|----------|-------|---------|
| `DRAG_THRESHOLD` | 5 | Minimum pixel distance before drag is recognized |
| `LOCALSTORAGE_DEBOUNCE_MS` | 500 | Debounce delay for localStorage saves |
| `ANIMATION_FRAME_DELAY_MS` | 15 | Base delay between animation frames |
| `CURSOR_HIDE_CHECK_INTERVAL_MS` | 50 | Polling interval to check if Claude cursor should hide |

### 2. Add `useCallback` to Event Handlers

**File:** `page.tsx`

Wrapped event handlers with `useCallback` to prevent unnecessary re-renders:

- `getPoint` - Converts mouse/touch events to canvas coordinates
- `handleCanvasClick` - Handles clicks on canvas (comment creation, closing popups)
- `handleCommentSubmit` - Handles comment form submission

**Before:**
```typescript
const handleCanvasClick = (e: React.MouseEvent) => {
  // Recreated on every render
};
```

**After:**
```typescript
const handleCanvasClick = useCallback((e: React.MouseEvent) => {
  // Memoized - only recreated when dependencies change
}, [openCommentIndex, commentInput, hoveredCommentIndex, tool, getPoint, ...]);
```

### 3. Add `React.memo` to Child Components

**Files:** `CommentSystem.tsx`, `CustomCursor.tsx`

Wrapped components with `React.memo` to prevent re-renders when props haven't changed:

```typescript
export const CommentSystem = memo(function CommentSystem({ ... }) {
  // Component only re-renders when props actually change
});
```

Components updated:
- `CommentSystem` - Receives many props, benefits from shallow comparison
- `CustomCursor` - Simple component with few props, quick wins from memoization

### 4. Fix Confusing Conditional Logic

**File:** `page.tsx`

**Before (ambiguous):**
```typescript
} else if (tool !== 'comment' && tool !== 'select' || isDrawing) {
```

**After (explicit):**
```typescript
const shouldHandleDrawing = (tool !== 'comment' && tool !== 'select') || isDrawing;
// ...
} else if (shouldHandleDrawing) {
```

The original code relied on operator precedence (`&&` before `||`), making it hard to read. The fix extracts the condition into a named variable that clearly expresses the intent.

## Performance Impact

These changes reduce unnecessary re-renders by:

1. **Memoized handlers** - Event handlers maintain referential equality across renders
2. **Memoized components** - Child components skip re-rendering when parent state changes don't affect them
3. **Named constants** - No runtime impact, but improves maintainability

## useEffect Review

Reviewed against [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect).

### Anti-pattern Fixed

**Removed:** Effect that synced a ref to state (line ~1070)
```typescript
// ❌ Before: Effect to sync ref with state
useEffect(() => {
  if (tool === 'draw') {
    lastAsciiStrokeRef.current = asciiStroke;
  }
}, [tool, asciiStroke]);

// ✅ After: Update ref in the same handler that updates state
const handleSetAsciiStroke = useCallback((value: boolean) => {
  setAsciiStroke(value);
  lastAsciiStrokeRef.current = value;
}, []);
```

### Remaining useEffects (all valid)

| Effect | Purpose | Valid Reason |
|--------|---------|--------------|
| Safari detection | Set `isSafari` on mount | Hydration-safe browser detection |
| Keyboard shortcuts | `Ctrl+Z` undo/redo | Subscribing to window events |
| Canvas resize | Update canvas dimensions | Synchronizing with window API |
| Canvas redraw | Call `redraw()` when data changes | Syncing React state → Canvas (external system) |
| Tab visibility | Pause animations when hidden | Browser visibility API subscription |
| Wiggle animation | Animated SVG filter seed | setInterval timing (external system) |
| Random palette | Set initial color on mount | One-time client-side initialization |
| Load localStorage | Restore saved state | External storage read |
| Save localStorage | Persist state (debounced) | External storage write |
| Paste handler | Handle clipboard images | Clipboard API subscription |

## Files Modified

- `src/app/draw/constants.ts` - Added 4 new constants
- `src/app/draw/page.tsx` - Added useCallback wrappers, `shouldHandleDrawing()` helper, use constants
- `src/app/draw/components/CommentSystem.tsx` - Added React.memo
- `src/app/draw/components/CustomCursor.tsx` - Added React.memo
