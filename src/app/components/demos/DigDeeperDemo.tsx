'use client';

import React, { useState } from 'react';
import ExploreCanvas from '../ExploreCanvas';
import { Exploration, ExploreSegment } from '@/app/lib/types';

const FULL_CONTENT = `## Core Definition

Next.js is a React framework built on top of Node.js that enables developers to build full-stack web applications with both frontend and backend capabilities. It simplifies the process of creating production-ready applications by providing built-in features like server-side rendering (SSR), static site generation (SSG), and API routes without requiring extensive configuration. Think of it as React plus a comprehensive toolkit for scaling applications from simple websites to complex web platforms.

## Key Features & Capabilities

Next.js offers powerful built-in features including:

- App Router or Pages Router for file-based routing
- Server-Side Rendering (SSR) and Static Generation (SSG) for optimized performance
- API Routes to build backend endpoints within the same project
- Image Optimization and automatic code splitting
- Incremental Static Regeneration (ISR) for dynamic static content

## Why Use Next.js?

Developers choose Next.js because it dramatically reduces development time through zero-config setup, provides excellent SEO optimization out-of-the-box, and delivers superior performance through automatic optimizations. It also simplifies deployment with seamless integration to Vercel (its creator) and other hosting platforms, making it ideal for startups and enterprises alike.

## Use Cases

Next.js is perfect for building e-commerce sites, content platforms, SaaS applications, progressive web apps (PWAs), and real-time collaborative tools. Its flexibility allows it to power everything from simple landing pages to complex applications requiring authentication, databases, and real-time features.

## Getting Started

To start with Next.js, you can run npx create-next-app@latest in your terminal to bootstrap a new project instantly. The framework includes excellent documentation, a vibrant community, and numerous learning resources, making it accessible for beginners while powerful enough for experienced developers.`;

const DEMO_SEGMENTS: ExploreSegment[] = [
  {
    id: 'section-1',
    title: 'Core Definition',
    description: '',
    content: 'Next.js is a React framework built on top of Node.js that enables developers to build full-stack web applications with both frontend and backend capabilities. It simplifies the process of creating production-ready applications by providing built-in features like server-side rendering (SSR), static site generation (SSG), and API routes without requiring extensive configuration. Think of it as React plus a comprehensive toolkit for scaling applications from simple websites to complex web platforms.',
    depth: 0,
    isExpanded: false,
  },
  {
    id: 'section-2',
    title: 'Key Features & Capabilities',
    description: '',
    content: `Next.js offers powerful built-in features including:

- App Router or Pages Router for file-based routing
- Server-Side Rendering (SSR) and Static Generation (SSG) for optimized performance
- API Routes to build backend endpoints within the same project
- Image Optimization and automatic code splitting
- Incremental Static Regeneration (ISR) for dynamic static content`,
    depth: 0,
    isExpanded: false,
  },
  {
    id: 'section-3',
    title: 'Why Use Next.js?',
    description: '',
    content: 'Developers choose Next.js because it dramatically reduces development time through zero-config setup, provides excellent SEO optimization out-of-the-box, and delivers superior performance through automatic optimizations. It also simplifies deployment with seamless integration to Vercel (its creator) and other hosting platforms, making it ideal for startups and enterprises alike.',
    depth: 0,
    isExpanded: false,
  },
  {
    id: 'section-4',
    title: 'Use Cases',
    description: '',
    content: 'Next.js is perfect for building e-commerce sites, content platforms, SaaS applications, progressive web apps (PWAs), and real-time collaborative tools. Its flexibility allows it to power everything from simple landing pages to complex applications requiring authentication, databases, and real-time features.',
    depth: 0,
    isExpanded: false,
  },
  {
    id: 'section-5',
    title: 'Getting Started',
    description: '',
    content: 'To start with Next.js, you can run npx create-next-app@latest in your terminal to bootstrap a new project instantly. The framework includes excellent documentation, a vibrant community, and numerous learning resources, making it accessible for beginners while powerful enough for experienced developers.',
    depth: 0,
    isExpanded: false,
  },
];

const DEMO_EXPLORATION: Exploration = {
  id: 'dig-deeper-demo',
  rootTopic: 'What is Next.js',
  title: 'What is Next.js',
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
                    id: `dig-deeper-${Date.now()}`,
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
                      id: `dig-deeper-${Date.now()}`,
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
            id: `dig-deeper-${Date.now()}`,
            rootTopic: newTopic,
            title: newTopic,
            fullContent: `## ${newTopic}\n\nGenerating content...`,
            segments: [{
              id: 'loading',
              title: newTopic,
              description: '',
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
        id: `section-${index + 1}`,
        title,
        description: '',
        content,
        depth: 0,
        isExpanded: false,
      };
    });
  };

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
