# Drawing Evolution Timeline — Design Doc

## Overview
A `/drawing` page showcasing the evolution of the Draw with Claude project through horizontally-scrollable, interactive stages. Each stage represents a key git snapshot that users can play with live.

## Layout
- **Top**: Title + description for the focused stage (minimal, no dates/tags)
- **Middle**: Horizontal carousel of cards (~75% viewport width) with peeking neighbors
- **Bottom**: Back/Next buttons + dot navigation, keyboard navigable (←/→ arrows)

## Stage Content
Each stage is either:
- **Live iframe**: A Vercel branch deploy of that git snapshot
- **Video fallback**: For versions too old to deploy cleanly

## Data Model
```ts
type Stage = {
  id: string;
  title: string;
  description: string;
  commitHash: string;
  embedUrl?: string;   // Vercel deploy URL
  videoUrl?: string;   // Fallback video
};
```

Stages defined in a static config file (`stages.ts`).

## Interaction
- CSS scroll-snap carousel with Framer Motion transitions
- Mouse wheel → horizontal scroll, trackpad swipe, drag
- Keyboard: ←/→ navigate, Enter activates iframe, Escape deactivates
- Only active card + 1 neighbor load iframes (lazy)
- Overlay on non-focused iframes prevents scroll hijacking
- "Open full version" link per card

## Tech
- Framer Motion (already in project)
- CSS scroll-snap
- DialKit for animation params (scroll damping, parallax, transition timing)
- No new dependencies

## File Structure
```
src/app/drawing/
  page.tsx
  drawing.css
  stages.ts
  components/
    StageCard.tsx
    Timeline.tsx
    ProgressBar.tsx
```
