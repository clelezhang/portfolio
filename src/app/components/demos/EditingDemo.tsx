'use client';

import { useState } from 'react';
import EditableChatCanvas from '../EditableChatCanvas';
import { Message } from '@/app/lib/types';

const DEMO_MESSAGES: Message[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'if i felt a little sick (occasional nausea/lower energy/cold temperature) for 5 days, and then felt very sick afterwards (high fever, no energy, cough & congestion) that\'s been declining for the last 3 days, should i go to the doctor? its flu season',
    timestamp: Date.now() - 120000,
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: `Based on what you're describing, if your symptoms are genuinely declining over the last 3 days, you may not need to rush to the doctor—that's a good sign that your body is fighting it off. Most people with flu or a bad cold can recover at home with rest, fluids, and time.

Since you're already 3 days into improvement, it might be worth waiting another day or two to see if the trend continues. If you're clearly getting better, you've probably passed the point where antiviral treatment (if applicable) would help anyway. A doctor visit is more useful if symptoms worsen, plateau, or you develop new concerning symptoms.

In the meantime, rest, hydrate, and monitor yourself. Trust your instincts—if something feels off or you're worried, it's okay to call your doctor's office for advice even if you don't go in.`,
    timestamp: Date.now() - 60000,
  },
];

export default function EditingDemo() {
  const [messages, setMessages] = useState<Message[]>(DEMO_MESSAGES);

  return (
    <div className="demo-container" style={{ height: '600px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <EditableChatCanvas
        initialMessages={messages}
        onMessagesChange={setMessages}
        demoId="editing-demo"
        hideSettings={true}
      />
    </div>
  );
}

