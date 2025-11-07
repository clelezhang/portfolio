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
