'use client';

import { useState } from 'react';
import EditableChatCanvas from '../blog-demos/EditableChatCanvas';
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

**Active power** - the biggest risk is if the keyboard is currently plugged in/on when liquid hits the electronics`,
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

