'use client';

import { useState } from 'react';
import EditableChatCanvas from '../EditableChatCanvas';
import { Message } from '@/app/lib/types';

const DEMO_MESSAGES: Message[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'can you explain how neural networks learn?',
    timestamp: Date.now() - 120000,
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: `Neural networks learn through a process called **backpropagation**. Here's how it works:

## The Learning Process

Neural networks adjust their internal weights based on errors[1]. When the network makes a prediction, it compares the output to the desired result and calculates the error.

This error is then propagated backwards through the network[2], adjusting weights at each layer. The key insight is using the chain rule from calculus to efficiently compute how each weight contributed to the error.

## Gradient Descent

The adjustment happens through gradient descent[3] - imagine you're trying to find the lowest point in a valley while blindfolded. You feel the slope beneath your feet and take small steps downhill. Neural networks do the same thing mathematically, finding the direction that reduces error most effectively.`,
    timestamp: Date.now() - 60000,
    sources: [
      {
        id: 1,
        url: 'https://en.wikipedia.org/wiki/Backpropagation',
        title: 'Backpropagation - Wikipedia',
      },
      {
        id: 2,
        url: 'https://www.3blue1brown.com/lessons/backpropagation',
        title: 'Backpropagation calculus - 3Blue1Brown',
      },
      {
        id: 3,
        url: 'https://en.wikipedia.org/wiki/Gradient_descent',
        title: 'Gradient descent - Wikipedia',
      },
    ],
  },
];

export default function CommentsDemo() {
  const [messages, setMessages] = useState<Message[]>(DEMO_MESSAGES);

  return (
    <div className="demo-container" style={{ height: '600px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <EditableChatCanvas
        initialMessages={messages}
        onMessagesChange={setMessages}
        demoId="comments-demo"
        hideSettings={true}
      />
    </div>
  );
}

