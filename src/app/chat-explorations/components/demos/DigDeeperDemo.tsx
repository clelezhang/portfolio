'use client';

import React, { useState } from 'react';
import ExploreCanvas from '../blog-demos/ExploreCanvas';
import { Exploration, ExploreSegment } from '@/app/lib/types';

const FULL_CONTENT = `## Definition and Core Concept

A fractal is a geometric shape that exhibits self-similarity across different scales - meaning if you zoom in on any portion, you will find patterns that resemble the whole structure. Fractals are infinitely complex mathematical objects with a recursive nature, where the same pattern repeats at progressively smaller or larger levels. Unlike traditional Euclidean geometry, fractals have non-integer dimensions and can appear throughout nature, mathematics, and art.

## Key Characteristics

Fractals possess several defining features:

- Self-similar: Parts mirror the whole structure
- Recursive: Built through repeated iterations of a rule
- Infinitely detailed: Never fully smooth, always showing complexity at any zoom level
- Deterministic or random: Can follow exact mathematical rules or involve randomness
- Fractional dimension: Often have dimensions between whole numbers (e.g., 1.5 or 2.3)

## Natural Examples

Fractals appear abundantly in nature, including coastlines (endlessly jagged at any magnification), trees and ferns (branching patterns repeating at each level), snowflakes (symmetrical subdivisions), and mountains (similar slopes at different scales). Even human physiology displays fractal patterns in blood vessels, lungs, and neural networks, where branching structures optimize space and efficiency.`;

const DEMO_SEGMENTS: ExploreSegment[] = [
  {
    id: 'section-1',
    title: 'Definition and Core Concept',
    description: '',
    content: 'A fractal is a geometric shape that exhibits self-similarity across different scales - meaning if you zoom in on any portion, you will find patterns that resemble the whole structure. Fractals are infinitely complex mathematical objects with a recursive nature, where the same pattern repeats at progressively smaller or larger levels. Unlike traditional Euclidean geometry, fractals have non-integer dimensions and can appear throughout nature, mathematics, and art.',
    depth: 0,
    isExpanded: false,
  },
  {
    id: 'section-2',
    title: 'Key Characteristics',
    description: '',
    content: `Fractals possess several defining features:

- Self-similar: Parts mirror the whole structure
- Recursive: Built through repeated iterations of a rule
- Infinitely detailed: Never fully smooth, always showing complexity at any zoom level
- Deterministic or random: Can follow exact mathematical rules or involve randomness
- Fractional dimension: Often have dimensions between whole numbers (e.g., 1.5 or 2.3)`,
    depth: 0,
    isExpanded: false,
  },
  {
    id: 'section-3',
    title: 'Natural Examples',
    description: '',
    content: 'Fractals appear abundantly in nature, including coastlines (endlessly jagged at any magnification), trees and ferns (branching patterns repeating at each level), snowflakes (symmetrical subdivisions), and mountains (similar slopes at different scales). Even human physiology displays fractal patterns in blood vessels, lungs, and neural networks, where branching structures optimize space and efficiency.',
    depth: 0,
    isExpanded: false,
  },
];

const DEMO_EXPLORATION: Exploration = {
  id: 'dig-deeper-demo',
  rootTopic: 'What are fractals',
  title: 'What are fractals',
  fullContent: FULL_CONTENT,
  segments: DEMO_SEGMENTS,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

interface DigDeeperDemoProps {
  newTopic?: string;
  onTopicProcessed?: () => void;
}

export default function DigDeeperDemo({ newTopic, onTopicProcessed }: DigDeeperDemoProps = {}) {
  const [exploration, setExploration] = useState<Exploration>(DEMO_EXPLORATION);

  return (
    <div className="demo-container" style={{ height: '600px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <ExploreCanvas
        initialExploration={exploration}
        onExplorationChange={setExploration}
        explorationId="dig-deeper-demo"
        triggerTopic={newTopic}
        onTopicProcessed={onTopicProcessed}
      />
    </div>
  );
}
