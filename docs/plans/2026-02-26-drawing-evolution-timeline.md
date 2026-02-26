# Drawing Evolution Timeline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a `/drawing` page that showcases the evolution of Draw with Claude through a horizontally-scrollable carousel of live, interactive stages.

**Architecture:** A Next.js page with a Framer Motion-powered horizontal carousel. Each stage card (~75% viewport width) embeds either a live iframe (Vercel branch deploy) or video fallback. Navigation via keyboard, dots, and back/next buttons.

**Tech Stack:** Next.js App Router, Framer Motion, CSS scroll-snap, DialKit (animation params only)

---

### Task 1: Create stages data config

**Files:**
- Create: `src/app/drawing/stages.ts`

**Step 1: Create the stage type and placeholder data**

```ts
export type Stage = {
  id: string;
  title: string;
  description: string;
  commitHash: string;
  embedUrl?: string;
  videoUrl?: string;
};

export const stages: Stage[] = [
  {
    id: 'v1-first-prototype',
    title: 'First Prototype',
    description: 'Basic canvas where Claude could draw simple shapes in response to your drawings.',
    commitHash: 'placeholder',
  },
  {
    id: 'v2-turn-based',
    title: 'Turn-Based Drawing',
    description: 'Introduced the turn-based system — draw, then watch Claude respond.',
    commitHash: 'placeholder',
  },
  {
    id: 'v3-ascii-art',
    title: 'ASCII Art Mode',
    description: 'Claude learned to render ASCII text blocks on the canvas.',
    commitHash: 'placeholder',
  },
  {
    id: 'v4-narration',
    title: 'Narration System',
    description: 'Claude started narrating its reasoning, observations, and intentions.',
    commitHash: 'placeholder',
  },
  {
    id: 'v5-visual-effects',
    title: 'Visual Effects',
    description: 'Added wobbly lines, distortion effects, and playful visual styles.',
    commitHash: 'placeholder',
  },
  {
    id: 'v6-interaction-styles',
    title: 'Interaction Styles',
    description: 'Claude detects whether you\'re being collaborative, playful, or adversarial.',
    commitHash: 'placeholder',
  },
  {
    id: 'v7-multi-ai',
    title: 'Multi-AI Backends',
    description: 'Added Gemini and Kimi alongside Claude for different drawing styles.',
    commitHash: 'placeholder',
  },
  {
    id: 'v8-current',
    title: 'Current Version',
    description: 'Comments, cloud save, and the full collaborative drawing experience.',
    commitHash: 'HEAD',
    embedUrl: '/draw',
  },
];
```

Note: `embedUrl` values will be populated later as Vercel branch deploys are created. For now, only the current version has a live URL. Others will show a placeholder state.

**Step 2: Commit**

```bash
git add src/app/drawing/stages.ts
git commit -m "feat: add drawing evolution stages data config"
```

---

### Task 2: Create the StageCard component

**Files:**
- Create: `src/app/drawing/components/StageCard.tsx`

**Step 1: Build the card component**

This component renders either an iframe (if `embedUrl` exists) or a placeholder/video. It accepts `isActive` and `isNeighbor` props to control iframe loading.

```tsx
'use client';

import { useState } from 'react';
import { type Stage } from '../stages';

type StageCardProps = {
  stage: Stage;
  isActive: boolean;
  isNeighbor: boolean;
  onClick: () => void;
};

export default function StageCard({ stage, isActive, isNeighbor, onClick }: StageCardProps) {
  const [iframeActive, setIframeActive] = useState(false);
  const shouldLoadIframe = stage.embedUrl && (isActive || isNeighbor);

  return (
    <div
      className="stage-card"
      data-active={isActive}
      onClick={onClick}
    >
      <div className="stage-card-embed">
        {shouldLoadIframe ? (
          <>
            <iframe
              src={stage.embedUrl}
              title={stage.title}
              className="stage-card-iframe"
              style={{ pointerEvents: iframeActive ? 'auto' : 'none' }}
            />
            {!iframeActive && isActive && (
              <button
                className="stage-card-activate"
                onClick={(e) => {
                  e.stopPropagation();
                  setIframeActive(true);
                }}
              >
                Click to interact
              </button>
            )}
            {iframeActive && (
              <button
                className="stage-card-deactivate"
                onClick={(e) => {
                  e.stopPropagation();
                  setIframeActive(false);
                }}
              >
                Exit
              </button>
            )}
          </>
        ) : stage.videoUrl ? (
          <video
            src={stage.videoUrl}
            className="stage-card-video"
            autoPlay={isActive}
            loop
            muted
            playsInline
          />
        ) : (
          <div className="stage-card-placeholder">
            <span>Coming soon</span>
          </div>
        )}
      </div>
      {stage.embedUrl && (
        <a
          href={stage.embedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="stage-card-link"
          onClick={(e) => e.stopPropagation()}
        >
          Open full version
        </a>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/drawing/components/StageCard.tsx
git commit -m "feat: add StageCard component with iframe/video/placeholder support"
```

---

### Task 3: Create the ProgressBar component

**Files:**
- Create: `src/app/drawing/components/ProgressBar.tsx`

**Step 1: Build the progress/navigation bar**

Bottom bar with Back, dots, and Next. Keyboard-navigable.

```tsx
'use client';

type ProgressBarProps = {
  total: number;
  current: number;
  onNavigate: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
};

export default function ProgressBar({ total, current, onNavigate, onPrev, onNext }: ProgressBarProps) {
  return (
    <div className="progress-bar">
      <button
        className="progress-bar-btn"
        onClick={onPrev}
        disabled={current === 0}
        aria-label="Previous stage"
      >
        &larr; Back
      </button>
      <div className="progress-bar-dots">
        {Array.from({ length: total }, (_, i) => (
          <button
            key={i}
            className={`progress-bar-dot ${i === current ? 'active' : ''}`}
            onClick={() => onNavigate(i)}
            aria-label={`Go to stage ${i + 1}`}
          />
        ))}
      </div>
      <button
        className="progress-bar-btn"
        onClick={onNext}
        disabled={current === total - 1}
        aria-label="Next stage"
      >
        Next &rarr;
      </button>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/drawing/components/ProgressBar.tsx
git commit -m "feat: add ProgressBar navigation component"
```

---

### Task 4: Create the Timeline carousel component

**Files:**
- Create: `src/app/drawing/components/Timeline.tsx`

**Step 1: Build the horizontal carousel**

This is the core component. It manages scroll position, active index, and keyboard navigation.

```tsx
'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { stages } from '../stages';
import StageCard from './StageCard';
import ProgressBar from './ProgressBar';

export default function Timeline() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollToIndex = useCallback((index: number) => {
    const container = scrollRef.current;
    if (!container) return;
    const cards = container.querySelectorAll('.stage-card');
    const card = cards[index] as HTMLElement;
    if (!card) return;
    const containerRect = container.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const scrollLeft = card.offsetLeft - (containerRect.width - cardRect.width) / 2;
    container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    setActiveIndex(index);
  }, []);

  const handlePrev = useCallback(() => {
    scrollToIndex(Math.max(0, activeIndex - 1));
  }, [activeIndex, scrollToIndex]);

  const handleNext = useCallback(() => {
    scrollToIndex(Math.min(stages.length - 1, activeIndex + 1));
  }, [activeIndex, scrollToIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext]);

  // Update active index on scroll
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const handleScroll = () => {
      const cards = container.querySelectorAll('.stage-card');
      const containerCenter = container.scrollLeft + container.clientWidth / 2;
      let closestIndex = 0;
      let closestDistance = Infinity;
      cards.forEach((card, i) => {
        const el = card as HTMLElement;
        const cardCenter = el.offsetLeft + el.clientWidth / 2;
        const distance = Math.abs(containerCenter - cardCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = i;
        }
      });
      setActiveIndex(closestIndex);
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const currentStage = stages[activeIndex];

  return (
    <div className="timeline">
      {/* Top: Title + Description */}
      <div className="timeline-header">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStage.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <h2 className="timeline-title">{currentStage.title}</h2>
            <p className="timeline-description">{currentStage.description}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Middle: Carousel */}
      <div className="timeline-carousel" ref={scrollRef}>
        {stages.map((stage, i) => (
          <StageCard
            key={stage.id}
            stage={stage}
            isActive={i === activeIndex}
            isNeighbor={Math.abs(i - activeIndex) === 1}
            onClick={() => scrollToIndex(i)}
          />
        ))}
      </div>

      {/* Bottom: Navigation */}
      <ProgressBar
        total={stages.length}
        current={activeIndex}
        onNavigate={scrollToIndex}
        onPrev={handlePrev}
        onNext={handleNext}
      />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/drawing/components/Timeline.tsx
git commit -m "feat: add Timeline carousel with keyboard nav and Framer Motion"
```

---

### Task 5: Create the page and CSS

**Files:**
- Create: `src/app/drawing/page.tsx`
- Create: `src/app/drawing/drawing.css`

**Step 1: Create the page**

```tsx
'use client';

import Timeline from './components/Timeline';
import './drawing.css';

export default function DrawingEvolution() {
  return (
    <div className="drawing-page">
      <Timeline />
    </div>
  );
}
```

**Step 2: Create the stylesheet**

```css
/* Drawing Evolution Timeline */

.drawing-page {
  width: 100vw;
  height: 100dvh;
  overflow: hidden;
  background: var(--lightgray);
  font-family: var(--font-untitled-sans), -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--slate);
  display: flex;
  flex-direction: column;
}

/* Timeline layout */
.timeline {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* Header: title + description */
.timeline-header {
  padding: 2rem 2rem 1rem;
  text-align: center;
  flex-shrink: 0;
}

.timeline-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
  color: var(--slate);
}

.timeline-description {
  font-size: 0.95rem;
  color: var(--accentgray);
  margin: 0;
  max-width: 500px;
  margin-inline: auto;
  line-height: 1.5;
}

/* Carousel */
.timeline-carousel {
  flex: 1;
  display: flex;
  gap: 1.5rem;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  padding: 1rem 12.5%;
  align-items: stretch;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.timeline-carousel::-webkit-scrollbar {
  display: none;
}

/* Stage card */
.stage-card {
  flex: 0 0 75%;
  scroll-snap-align: center;
  border-radius: 16px;
  overflow: hidden;
  background: white;
  border: 1px solid rgba(47, 53, 87, 0.08);
  display: flex;
  flex-direction: column;
  position: relative;
  transition: box-shadow 0.3s ease, transform 0.3s ease;
  cursor: pointer;
}

.stage-card[data-active="true"] {
  box-shadow: 0 8px 32px rgba(47, 53, 87, 0.12);
}

.stage-card[data-active="false"] {
  opacity: 0.6;
  transform: scale(0.96);
}

/* Embed area */
.stage-card-embed {
  flex: 1;
  position: relative;
  min-height: 0;
  background: #f5f5f7;
}

.stage-card-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

.stage-card-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.stage-card-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accentgray);
  font-size: 0.9rem;
}

/* Activate/deactivate buttons */
.stage-card-activate {
  position: absolute;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  background: var(--slate);
  color: white;
  border: none;
  padding: 0.5rem 1.25rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-family: inherit;
  cursor: pointer;
  opacity: 0.9;
  transition: opacity 0.2s;
}

.stage-card-activate:hover {
  opacity: 1;
}

.stage-card-deactivate {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-family: inherit;
  cursor: pointer;
  z-index: 10;
}

/* Open full version link */
.stage-card-link {
  display: block;
  padding: 0.75rem 1rem;
  text-align: center;
  font-size: 0.8rem;
  color: var(--accentgray);
  text-decoration: none;
  border-top: 1px solid rgba(47, 53, 87, 0.06);
  transition: color 0.2s;
}

.stage-card-link:hover {
  color: var(--slate);
}

/* Progress bar */
.progress-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem 1.5rem;
  flex-shrink: 0;
}

.progress-bar-btn {
  background: none;
  border: none;
  font-family: inherit;
  font-size: 0.85rem;
  color: var(--slate);
  cursor: pointer;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  transition: background 0.2s;
}

.progress-bar-btn:hover:not(:disabled) {
  background: rgba(47, 53, 87, 0.06);
}

.progress-bar-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.progress-bar-dots {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.progress-bar-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: none;
  background: rgba(47, 53, 87, 0.15);
  cursor: pointer;
  padding: 0;
  transition: background 0.2s, transform 0.2s;
}

.progress-bar-dot.active {
  background: var(--slate);
  transform: scale(1.3);
}

.progress-bar-dot:hover:not(.active) {
  background: rgba(47, 53, 87, 0.35);
}

/* Mobile adjustments */
@media (max-width: 768px) {
  .timeline-carousel {
    padding: 1rem 5%;
    gap: 1rem;
  }

  .stage-card {
    flex: 0 0 85%;
  }

  .timeline-header {
    padding: 1.5rem 1.5rem 0.75rem;
  }

  .timeline-title {
    font-size: 1.25rem;
  }

  .progress-bar {
    padding: 0.75rem 1rem 1rem;
  }
}
```

**Step 3: Commit**

```bash
git add src/app/drawing/page.tsx src/app/drawing/drawing.css
git commit -m "feat: add /drawing evolution timeline page with styles"
```

---

### Task 6: Add DialKit animation controls

**Files:**
- Modify: `src/app/drawing/components/Timeline.tsx`
- Modify: `src/app/drawing/components/StageCard.tsx`

**Step 1: Add DialKit config for animation params**

Add `useDialKit` to Timeline.tsx to expose transition timing, card scale, opacity values, and title animation params. These are animation parameters only per project convention.

Specific params to expose:
- `cardInactiveOpacity` (0-1, default 0.6)
- `cardInactiveScale` (0.8-1, default 0.96)
- `cardShadowBlur` (0-60, default 32)
- `titleTransitionDuration` (0.1-0.8, default 0.25)
- `titleOffsetY` (0-20, default 8)

Thread these values through as CSS custom properties or direct props to the components.

**Step 2: Commit**

```bash
git add src/app/drawing/components/Timeline.tsx src/app/drawing/components/StageCard.tsx
git commit -m "feat: add DialKit animation controls to timeline"
```

---

### Task 7: Test and polish

**Step 1: Run dev server and verify**

```bash
npm run dev
```

Navigate to `http://localhost:3000/drawing` and verify:
- Horizontal scroll works with mouse wheel, trackpad, and drag
- Keyboard arrows navigate between cards
- Dots and Back/Next buttons work
- Title + description animate on card change
- Active card is highlighted, neighbors peek from edges
- Current version iframe loads and is interactable
- Placeholder shows for stages without embedUrl/videoUrl
- Mobile responsive

**Step 2: Run type check**

```bash
npx tsc --noEmit
```

Fix any type errors.

**Step 3: Run build**

```bash
npm run build
```

Fix any build errors.

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: polish drawing timeline and fix any build issues"
```

---

### Future Tasks (not in this plan)

These are recorded for later:
1. **Create Vercel branch deploys** — Identify key git commits, create branches, deploy each, update `embedUrl` in stages.ts
2. **Record fallback videos** — For versions that can't be deployed, record screen captures
3. **Add to homepage navigation** — Link from WorkSection or Hero to `/drawing`
