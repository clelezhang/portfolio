'use client';

import { useState } from 'react';
import ExploreCanvas from '../ExploreCanvas';
import { Exploration, ExploreSegment } from '@/app/lib/types';

const FULL_CONTENT = `## Neural Networks

Neural networks are computing systems inspired by biological neural networks. They consist of interconnected nodes (neurons) organized in layers that process and transmit information.

## Deep Learning

Deep learning uses neural networks with many hidden layers (hence "deep"). These networks can automatically learn hierarchical representations of data, making them powerful for complex tasks.

## Applications

Today's neural networks power many AI applications: language models like GPT, image generation tools, recommendation systems, autonomous vehicles, and medical diagnosis systems.`;

const DEMO_SEGMENTS: ExploreSegment[] = [
  {
    id: 'section-1',
    title: 'Neural Networks',
    description: '',
    content: 'Neural networks are computing systems inspired by biological neural networks. They consist of interconnected nodes (neurons) organized in layers that process and transmit information.',
    depth: 0,
    isExpanded: false,
  },
  {
    id: 'section-2',
    title: 'Deep Learning',
    description: '',
    content: 'Deep learning uses neural networks with many hidden layers (hence "deep"). These networks can automatically learn hierarchical representations of data, making them powerful for complex tasks.',
    depth: 0,
    isExpanded: false,
  },
  {
    id: 'section-3',
    title: 'Applications',
    description: '',
    content: "Today's neural networks power many AI applications: language models like GPT, image generation tools, recommendation systems, autonomous vehicles, and medical diagnosis systems.",
    depth: 0,
    isExpanded: false,
  },
];

const DEMO_EXPLORATION: Exploration = {
  id: 'dig-deeper-demo',
  rootTopic: 'Neural Networks and Deep Learning',
  title: 'Neural Networks and Deep Learning',
  fullContent: FULL_CONTENT,
  segments: DEMO_SEGMENTS,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

export default function DigDeeperDemo() {
  const [exploration, setExploration] = useState<Exploration>(DEMO_EXPLORATION);

  return (
    <div className="demo-container" style={{ height: '600px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <ExploreCanvas
        initialExploration={exploration}
        onExplorationChange={setExploration}
        explorationId="dig-deeper-demo"
      />
    </div>
  );
}
