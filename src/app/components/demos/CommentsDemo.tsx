'use client';

import { useState } from 'react';
import EditableChatCanvas from '../EditableChatCanvas';
import { Message } from '@/app/lib/types';

const DEMO_MESSAGES: Message[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'if i spilled a bit of matcha on my keyboard, what part is dangerous',
    timestamp: Date.now() - 120000,
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: `The dangerous part is liquid reaching the electrical components underneath the keys - here's what matters:

## Most dangerous:

**PCB (circuit board) underneath** - if matcha reaches the electrical contacts/switches while powered, it can cause short circuits and immediate damage

**Active power** - the biggest risk is if the keyboard is currently plugged in/on when liquid hits the electronics

## What to do right now:

1. Unplug immediately (or turn off if wireless)
2. Flip keyboard upside down to drain liquid away from internals
3. Wipe visible matcha from the surface/between keys
4. Don't turn it back on for at least 24-48 hours

## Matcha-specific issues:

The fine powder can leave residue that gums up key switches

The milk/sugar (if it's a latte) is worse than plain matcha - sticky residue attracts dust and can corrode over time

The moisture is the immediate threat, but the residue is a long-term problem

## Context matters:

**If it's mechanical/external keyboard:** Usually more forgiving - you can sometimes remove keycaps and clean properly

**If it's a laptop keyboard:** More concerning because liquid can seep into the laptop itself and damage the motherboard

How much got on it, and is it a laptop or external keyboard?`,
    timestamp: Date.now() - 60000,
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

