'use client';

import React, { useState } from 'react';
import SwipeDeeper from '../SwipeDeeper';
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
    title: 'Love as a Choice and Action',
    description: 'Daily practice of showing up',
    content: `Beyond chemistry and emotion, love is actively chosen and maintained through consistent effort, communication, and intentional behaviors. Real love requires:

- Regular emotional connection and vulnerability
- Acts of service and consideration
- Conflict resolution and forgiveness
- Supporting growth and shared goals

Love isn't just a feeling—it's a daily practice of showing up for someone.`,
    depth: 0,
    isExpanded: false,
  },
  {
    id: 'segment-4',
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

## Love as a Choice and Action

Beyond chemistry and emotion, love is actively chosen and maintained through consistent effort, communication, and intentional behaviors. Real love requires:

- Regular emotional connection and vulnerability
- Acts of service and consideration
- Conflict resolution and forgiveness
- Supporting growth and shared goals

Love isn't just a feeling—it's a daily practice of showing up for someone.

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

  // Handle new topic
  React.useEffect(() => {
    if (newTopic && newTopic !== exploration.rootTopic) {
      // Start generating real content for the topic
      const generateExploration = async () => {
        try {
          const response = await fetch('/api/blog-demos/explore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'generateInitial',
              topic: newTopic,
            }),
          });

          if (!response.ok || !response.body) {
            throw new Error('Failed to generate exploration');
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let accumulatedContent = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  // Parse final content into segments
                  const segments = parseMarkdownIntoSegments(accumulatedContent);
                  const newExploration: Exploration = {
                    id: `swipe-${Date.now()}`,
                    rootTopic: newTopic,
                    title: newTopic,
                    fullContent: accumulatedContent,
                    segments,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                  };
                  setExploration(newExploration);
                  onTopicProcessed?.();
                  break;
                }

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.content) {
                    accumulatedContent = parsed.content;
                    // Update with streaming content
                    const segments = parseMarkdownIntoSegments(accumulatedContent);
                    const streamingExploration: Exploration = {
                      id: `swipe-${Date.now()}`,
                      rootTopic: newTopic,
                      title: newTopic,
                      fullContent: accumulatedContent,
                      segments,
                      createdAt: Date.now(),
                      updatedAt: Date.now(),
                    };
                    setExploration(streamingExploration);
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }
        } catch (error) {
          console.error('Error generating exploration:', error);
          // Fallback to simple placeholder
          const newExploration: Exploration = {
            id: `swipe-${Date.now()}`,
            rootTopic: newTopic,
            title: newTopic,
            fullContent: `## ${newTopic}\n\nGenerating content...`,
            segments: [{
              id: 'loading',
              title: newTopic,
              description: 'Introduction',
              content: 'Generating content...',
              depth: 0,
              isExpanded: false,
            }],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          setExploration(newExploration);
          onTopicProcessed?.();
        }
      };

      generateExploration();
    }
  }, [newTopic, exploration.rootTopic, onTopicProcessed]);

  // Helper function to parse markdown into segments
  const parseMarkdownIntoSegments = (markdown: string): ExploreSegment[] => {
    const sections = markdown.split(/(?=^## )/m).filter(Boolean);
    return sections.map((section, index) => {
      const lines = section.trim().split('\n');
      const titleLine = lines[0];
      const title = titleLine.replace(/^##\s*/, '').trim();
      const content = lines.slice(1).join('\n').trim();

      return {
        id: `segment-${index + 1}`,
        title,
        description: content.substring(0, 50) + '...',
        content,
        depth: 0,
        isExpanded: false,
      };
    });
  };

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

