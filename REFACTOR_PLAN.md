# InteractivePortfolio Refactoring Plan

## Quick Wins (Do First)

### 1. Fix TypeScript Warnings
```typescript
// Line 445 - Remove unused cardId
const handleDrag = (info: { point: { x: number; y: number } }) => {

// Line 652 - Remove unused event  
onDrag={(_, info) => {
```

### 2. Extract Styles to Constants
```typescript
// Create styles.ts
export const cardStyles = {
  container: {
    borderRadius: '24px',
    borderColor: 'var(--gray-100)',
  },
  shadowDefault: '0 4px 12px 0 rgba(47, 53, 87, 0.10)',
  shadowTapped: '0 4px 16px 0 rgba(47, 53, 87, 0.15)',
} as const;
```

### 3. Consolidate State with useReducer
```typescript
// Replace 13 useState calls with:
interface PortfolioState {
  tappedCard: string | null;
  pickedCardsOrder: string[];
  cardRotations: Record<string, number>;
  hiddenCards: Set<string>;
  dragState: DragState;
  // ... etc
}

const [state, dispatch] = useReducer(portfolioReducer, initialState);
```

## Medium Improvements

### 4. Split into Smaller Components
```
src/app/components/portfolio/
├── InteractivePortfolio.tsx (main container)
├── CardStack.tsx (card grid logic)
├── DraggableCard.tsx (individual card)
├── ChatEnvelope.tsx (chat container)
├── ChatMessage.tsx (already extracted)
├── hooks/
│   ├── useDragAndDrop.ts
│   └── useCardAnimations.ts
└── styles/
    └── portfolioStyles.ts
```

### 5. Optimize useChat Hook
```typescript
// Remove messages from dependencies
const sendMessage = useCallback(async (text: string, cardImage?: string, cardId?: string) => {
  // Use functional update instead
  setMessages(prev => {
    const userMessage = createUserMessage(text, cardImage);
    return [...prev, userMessage];
  });
  // ... rest of logic
}, []); // No dependencies needed
```

### 6. Memoize Expensive Calculations
```typescript
const cardPositions = useMemo(() => 
  getScatteredPositions(), 
[]); // Static positions, never change

const sortedCards = useMemo(() => 
  cardData.map((card, index) => ({
    ...card,
    position: getCardPosition(index, card.id, pickedCardsOrder)
  })),
[pickedCardsOrder]); // Only recalc when order changes
```

## Advanced Optimizations

### 7. Virtual Scrolling for Chat
```typescript
// For long chat histories
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={400}
  itemCount={messages.length}
  itemSize={80}
>
  {({ index, style }) => (
    <div style={style}>
      <ChatMessage message={messages[index]} />
    </div>
  )}
</FixedSizeList>
```

### 8. Animation Optimization
```typescript
// Use CSS transforms instead of Framer Motion for simple animations
.card-hover {
  transition: transform 0.2s ease-out;
  will-change: transform;
}

.card-hover:hover {
  transform: scale(1.08);
}
```

### 9. Lazy Load Heavy Components
```typescript
const ChatEnvelope = lazy(() => import('./ChatEnvelope'));

// Show cards immediately, load chat later
<Suspense fallback={<EnvelopeSkeleton />}>
  <ChatEnvelope />
</Suspense>
```

## Performance Metrics to Track

After refactoring, measure:
- Time to Interactive (TTI) - should be < 3s
- First Input Delay (FID) - should be < 100ms
- Component render time - use React DevTools Profiler
- Memory usage - check for leaks in Chrome DevTools

## Implementation Priority

1. **Week 1**: Quick wins (1-3) - Easy fixes, immediate impact
2. **Week 2**: Component splitting (4) - Better maintainability
3. **Week 3**: State & hook optimizations (5-6) - Performance boost
4. **Later**: Advanced optimizations (7-9) - If needed

## Expected Results

- **50% fewer re-renders** from state consolidation
- **30% faster interactions** from memoization
- **Better code maintainability** from component splitting
- **Easier testing** from separated concerns