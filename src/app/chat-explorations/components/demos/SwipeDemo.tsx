'use client';

import React, { useState } from 'react';
import SwipeDeeper from '../blog-demos/SwipeDeeper';
import { Exploration, ExploreSegment } from '@/app/lib/types';

const DEMO_SEGMENTS: ExploreSegment[] = [
  {
    id: 'segment-1',
    title: 'The Chemistry Behind Love',
    description: 'Neurochemicals and hormones',
    content: `Love involves a complex interplay of neurochemicals and hormones that create powerful emotional and physical responses. When we experience attraction, our brains release dopamine (pleasure), norepinephrine (focus), and decrease serotonin (obsessive thinking), creating that euphoric "falling in love" feeling. Over time, oxytocin and vasopressin take over, fostering deeper bonding, trust, and attachment in long-term relationships.`,
    depth: 0,
    isExpanded: false,
  },
  {
    id: 'segment-2',
    title: 'The Psychological Components',
    description: 'Attraction, commitment, and intimacy',
    content: `Love combines multiple psychological elements including attraction, commitment, and intimacy—what psychologists call the "triangular theory" of love. Our attachment styles (formed in childhood), personal values, and emotional needs all influence who we fall for and how we love. Love also involves vulnerability, trust-building, and the willingness to prioritize another person's wellbeing alongside your own.`,
    depth: 0,
    isExpanded: false,
  },
  {
    id: 'segment-3',
    title: "Love's Evolution Over Time",
    description: 'From passion to companionship',
    content: `Passionate love (intense, obsessive) typically transitions to companionate love (deep friendship, stability, commitment) as relationships mature. This shift isn't a sign of failing love but rather its deepening and stabilization. The initial "butterflies" fade, but they're replaced by profound security, reliability, and genuine partnership that often feels more meaningful than the beginning stages.`,
    depth: 0,
    isExpanded: false,
  },
];

// Pre-generate the full content so it starts with sections visible
const FULL_CONTENT = `## The Chemistry Behind Love

Love involves a complex interplay of neurochemicals and hormones that create powerful emotional and physical responses. When we experience attraction, our brains release dopamine (pleasure), norepinephrine (focus), and decrease serotonin (obsessive thinking), creating that euphoric "falling in love" feeling. Over time, oxytocin and vasopressin take over, fostering deeper bonding, trust, and attachment in long-term relationships.

## The Psychological Components

Love combines multiple psychological elements including attraction, commitment, and intimacy—what psychologists call the "triangular theory" of love. Our attachment styles (formed in childhood), personal values, and emotional needs all influence who we fall for and how we love. Love also involves vulnerability, trust-building, and the willingness to prioritize another person's wellbeing alongside your own.

## Love's Evolution Over Time

Passionate love (intense, obsessive) typically transitions to companionate love (deep friendship, stability, commitment) as relationships mature. This shift isn't a sign of failing love but rather its deepening and stabilization. The initial "butterflies" fade, but they're replaced by profound security, reliability, and genuine partnership that often feels more meaningful than the beginning stages.`;

const DEMO_EXPLORATION: Exploration = {
  id: 'swipe-demo',
  rootTopic: 'How Does Love Work',
  title: 'How Does Love Work',
  fullContent: FULL_CONTENT,
  segments: DEMO_SEGMENTS,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

interface SwipeDemoProps {
  newTopic?: string;
  onTopicProcessed?: () => void;
}

export default function SwipeDemo({ newTopic, onTopicProcessed }: SwipeDemoProps = {}) {
  const [exploration, setExploration] = useState<Exploration>(DEMO_EXPLORATION);

  return (
    <div className="demo-container" style={{ height: '600px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <SwipeDeeper
          initialExploration={exploration}
          onExplorationChange={setExploration}
          explorationId="swipe-demo"
          triggerTopic={newTopic}
          onTopicProcessed={onTopicProcessed}
        />
      </div>
    </div>
  );
}

