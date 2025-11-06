'use client';

import { useState } from 'react';
import SwipeDeeper from '../SwipeDeeper';
import { Exploration, ExploreSegment } from '@/app/lib/types';

const DEMO_SEGMENTS: ExploreSegment[] = [
  {
    id: 'segment-1',
    title: 'Neural Networks',
    description: 'Foundation of deep learning',
    content: `Neural networks are computational models inspired by biological neurons. They consist of layers of interconnected nodes that process information through weighted connections. Each layer transforms the input data, allowing the network to learn complex patterns.`,
    depth: 0,
    isExpanded: false,
  },
  {
    id: 'segment-2',
    title: 'Training Process',
    description: 'How networks learn',
    content: `Training involves feeding data through the network, comparing outputs to expected results, and adjusting weights to minimize error. This process uses backpropagation and gradient descent to optimize the network's performance over many iterations.`,
    depth: 0,
    isExpanded: false,
  },
  {
    id: 'segment-3',
    title: 'Applications',
    description: 'Real-world uses',
    content: `Neural networks power image recognition, natural language processing, autonomous vehicles, and recommendation systems. They excel at tasks involving pattern recognition and prediction from large datasets.`,
    depth: 0,
    isExpanded: false,
  },
];

// Pre-generate the full content so it starts with sections visible
const FULL_CONTENT = `## Neural Networks

Neural networks are computational models inspired by biological neurons. They consist of layers of interconnected nodes that process information through weighted connections. Each layer transforms the input data, allowing the network to learn complex patterns.

## Training Process

Training involves feeding data through the network, comparing outputs to expected results, and adjusting weights to minimize error. This process uses backpropagation and gradient descent to optimize the network's performance over many iterations.

## Applications

Neural networks power image recognition, natural language processing, autonomous vehicles, and recommendation systems. They excel at tasks involving pattern recognition and prediction from large datasets.`;

const DEMO_EXPLORATION: Exploration = {
  id: 'swipe-demo',
  rootTopic: 'Neural Networks and Deep Learning',
  title: 'Neural Networks and Deep Learning',
  fullContent: FULL_CONTENT,
  segments: DEMO_SEGMENTS,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

export default function SwipeDemo() {
  const [exploration, setExploration] = useState<Exploration>(DEMO_EXPLORATION);

  return (
    <div className="demo-container" style={{ height: '600px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <SwipeDeeper
          initialExploration={exploration}
          onExplorationChange={setExploration}
          explorationId="swipe-demo"
        />
      </div>
    </div>
  );
}

