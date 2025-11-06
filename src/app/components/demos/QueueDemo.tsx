'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import EditableChatCanvas from '../EditableChatCanvas';
import { Message, QueueItem } from '@/app/lib/types';
import '@/app/components/EditableChatCanvas.css';

const DEMO_MESSAGES: Message[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'I want to learn about climate change, renewable energy, and carbon capture',
    timestamp: Date.now() - 180000,
  },
];

const DEMO_QUEUE: QueueItem[] = [
  {
    id: 'queue-1',
    title: 'Climate change basics',
    content: 'tell me about climate change basics',
    status: 'past',
    order: 0,
  },
  {
    id: 'queue-2',
    title: 'Renewable energy sources',
    content: 'tell me about renewable energy sources',
    status: 'now',
    order: 1,
  },
  {
    id: 'queue-3',
    title: 'Carbon capture technology',
    content: 'tell me about carbon capture technology',
    status: 'upcoming',
    order: 2,
  },
  {
    id: 'queue-4',
    title: 'Future climate solutions',
    content: 'tell me about future climate solutions',
    status: 'upcoming',
    order: 3,
  },
];

export default function QueueDemo() {
  const [messages, setMessages] = useState<Message[]>(DEMO_MESSAGES);
  const [queueItems, setQueueItems] = useState<QueueItem[]>(DEMO_QUEUE);
  
  // Animation state (simplified from layout.tsx)
  const [selectedDotPosition, setSelectedDotPosition] = useState({ top: 0, opacity: 1 });
  const [hoverDotPosition, setHoverDotPosition] = useState({ top: 0, opacity: 0 });
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [selectedIndexItemId, setSelectedIndexItemId] = useState<string>('demo-chat-queue-queue-2'); // Start with NOW item selected
  const [isAnimating, setIsAnimating] = useState(false);
  
  const indexButtonRefs = useRef<Map<string, HTMLElement>>(new Map());
  const chatButtonRef = useRef<HTMLButtonElement>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const chatAnimConfig = {
    dotDuration: 250,
    dotSpring: 1.350,
  };
  
  // Helper: Calculate dot position (from layout.tsx)
  const updateDotPosition = useCallback((buttonId: string, setter: typeof setSelectedDotPosition, isIndexItem = false) => {
    const button = isIndexItem 
      ? indexButtonRefs.current.get(buttonId)
      : chatButtonRef.current;
    if (!button) return;
    
    const rect = button.getBoundingClientRect();
    const listContainer = button.closest('.chat-list');
    if (!listContainer) return;
    
    const listRect = listContainer.getBoundingClientRect();
    const relativeTop = rect.top - listRect.top + listContainer.scrollTop + (rect.height / 2);
    setter({ top: relativeTop, opacity: 1 });
  }, []);
  
  // Lock hover events during animations
  const lockAnimation = () => {
    setIsAnimating(true);
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    animationTimeoutRef.current = setTimeout(() => setIsAnimating(false), 250);
  };
  
  // Update selected dot position when selection changes
  useEffect(() => {
    const itemId = selectedIndexItemId || 'demo-chat';
    const isIndexItem = !!selectedIndexItemId;
    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        updateDotPosition(itemId, setSelectedDotPosition, isIndexItem);
      });
    });
  }, [selectedIndexItemId, updateDotPosition]);
  
  // Update hover dot position
  useEffect(() => {
    if (!isAnimating) {
      if (hoveredItemId) {
        const isHoverIndexItem = hoveredItemId.includes('-queue-');
        updateDotPosition(hoveredItemId, setHoverDotPosition, isHoverIndexItem);
      } else {
        setHoverDotPosition((prev) => ({ ...prev, opacity: 0 }));
      }
    }
  }, [hoveredItemId, isAnimating, updateDotPosition]);
  
  // Update selection when queue items change
  useEffect(() => {
    const nowItem = queueItems.find(item => item.status === 'now');
    if (nowItem) {
      const queueItemId = `demo-chat-queue-${nowItem.id}`;
      setSelectedIndexItemId(queueItemId);
    }
  }, [queueItems]);

  return (
    <div className="demo-container" style={{ height: '600px', display: 'flex', position: 'relative', '--dot-duration': `${chatAnimConfig.dotDuration}ms`, '--dot-spring': chatAnimConfig.dotSpring } as React.CSSProperties}>
      {/* Sidebar - EXACT structure from chat/layout.tsx */}
      <div className="sidebar">
        <div className="chat-list">
          {/* Hover Dot */}
          <div
            className="floating-dot hover-dot"
            style={{
              top: `${hoverDotPosition.top}px`,
              opacity: hoverDotPosition.opacity,
              transition: `top ${chatAnimConfig.dotDuration}ms cubic-bezier(0.34, ${chatAnimConfig.dotSpring}, 0.64, 1), opacity ${chatAnimConfig.dotDuration}ms ease-out`,
            }}
          />

          {/* Selected Dot */}
          <div
            className="floating-dot selected-dot"
            style={{
              top: `${selectedDotPosition.top}px`,
              opacity: selectedDotPosition.opacity,
              transition: `top ${chatAnimConfig.dotDuration}ms cubic-bezier(0.34, ${chatAnimConfig.dotSpring}, 0.64, 1), opacity ${chatAnimConfig.dotDuration}ms ease-out`,
            }}
          />

          {/* Demo chat item - ACTIVE */}
          <div className="chat-item selected expanded">
            <button
              ref={chatButtonRef}
              className="chat-button"
              onMouseEnter={() => !isAnimating && setHoveredItemId('demo-chat')}
              onMouseLeave={() => !isAnimating && setHoveredItemId(null)}
            >
              <span className="chat-title">Climate Topics</span>
            </button>
            
            {/* Queue items */}
            <div className="chat-index">
              {/* Past items - greyed out, only last 0-2 */}
              {queueItems.filter(item => item.status === 'past').slice(-2).map((item) => (
                <div key={item.id} className="index-item-btn past">
                  <span className="index-item-title">{item.title}</span>
                </div>
              ))}
              
              {/* NOW item - with selection dot */}
              {queueItems.filter(item => item.status === 'now').map((item) => {
                const queueItemId = `demo-chat-queue-${item.id}`;
                const isSelected = selectedIndexItemId === queueItemId;
                return (
                  <button
                    key={item.id}
                    ref={(el) => {
                      if (el) {
                        indexButtonRefs.current.set(queueItemId, el);
                      } else {
                        indexButtonRefs.current.delete(queueItemId);
                      }
                    }}
                    onMouseEnter={() => !isAnimating && setHoveredItemId(queueItemId)}
                    onMouseLeave={() => !isAnimating && setHoveredItemId(null)}
                    className={`index-item-btn ${isSelected ? 'selected' : ''}`}
                  >
                    <span className="index-item-title">{item.title}</span>
                  </button>
                );
              })}
              
              {/* UP NEXT items */}
              {queueItems.filter(item => item.status === 'upcoming').map((item) => {
                const queueItemId = `demo-chat-queue-${item.id}`;
                
                return (
                  <div
                    key={item.id}
                    ref={(el) => {
                      if (el) {
                        indexButtonRefs.current.set(queueItemId, el);
                      } else {
                        indexButtonRefs.current.delete(queueItemId);
                      }
                    }}
                    className="index-item-btn upcoming"
                    onMouseEnter={() => !isAnimating && setHoveredItemId(queueItemId)}
                    onMouseLeave={() => !isAnimating && setHoveredItemId(null)}
                  >
                    <span className="index-item-title">{item.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Other demo chats below */}
          <div className="chat-item">
            <button className="chat-button">
              <span className="chat-title">Space exploration history</span>
            </button>
          </div>
          
          <div className="chat-item">
            <button className="chat-button">
              <span className="chat-title">Learn Spanish basics</span>
            </button>
          </div>
          
          <div className="chat-item">
            <button className="chat-button">
              <span className="chat-title">Photography tips for beginners</span>
            </button>
          </div>
          
          <div className="chat-item">
            <button className="chat-button">
              <span className="chat-title">TypeScript generics explained</span>
            </button>
          </div>
          
          <div className="chat-item">
            <button className="chat-button">
              <span className="chat-title">Cooking perfect pasta carbonara</span>
            </button>
          </div>
          
          <div className="chat-item">
            <button className="chat-button">
              <span className="chat-title">Understanding blockchain technology</span>
            </button>
          </div>
          
          <div className="chat-item">
            <button className="chat-button">
              <span className="chat-title">Git branching strategies</span>
            </button>
          </div>
          
          <div className="chat-item">
            <button className="chat-button">
              <span className="chat-title">How does the immune system work?</span>
            </button>
          </div>
          
          <div className="chat-item">
            <button className="chat-button">
              <span className="chat-title">Database indexing strategies</span>
            </button>
          </div>
          
          <div className="chat-item">
            <button className="chat-button">
              <span className="chat-title">Renaissance art movements</span>
            </button>
          </div>
          
          <div className="chat-item">
            <button className="chat-button">
              <span className="chat-title">Piano chord progressions</span>
            </button>
          </div>
        </div>
        <div className="sidebar-gradient" />
      </div>

      {/* Main content */}
      <div className="main-content">
        <EditableChatCanvas
          initialMessages={messages}
          onMessagesChange={setMessages}
          queueMode={true}
          queueItems={queueItems}
          onQueueItemsChange={setQueueItems}
          demoId="queue-demo"
          hideSettings={true}
        />
      </div>
    </div>
  );
}
