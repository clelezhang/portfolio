'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import EditableChatCanvas from '../EditableChatCanvas';
import { Message, QueueItem } from '@/app/lib/types';
import '@/app/components/EditableChatCanvas.css';

const DEMO_MESSAGES: Message[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'how to bake apple pie',
    timestamp: Date.now() - 300000,
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: `## Pie Crust Techniques

- Keep ingredients cold - use chilled butter and ice water
- Don't overwork the dough to avoid tough crust
- Roll from center outward on floured surface
- Transfer carefully to prevent tearing
- Crimp edges decoratively to seal
- Brush top with egg wash for golden color
- Cut steam vents in top crust
- Consider blind baking bottom crust 10-15 minutes to prevent sogginess
- Use pie weights or beans when blind baking`,
    timestamp: Date.now() - 240000,
  },
  {
    id: 'msg-3',
    role: 'user',
    content: 'tell me about apple selection and preparation',
    timestamp: Date.now() - 180000,
  },
  {
    id: 'msg-4',
    role: 'assistant',
    content: `## Apple Selection and Preparation

- Choose firm, tart apples like Granny Smith, Honeycrisp, or Braeburn
- Mix 2-3 varieties for complex flavor
- Peel, core, and slice apples 1/4-inch thick
- Toss with lemon juice to prevent browning
- Mix with sugar, cinnamon, nutmeg, and 2-3 tablespoons flour or cornstarch
- Let mixture sit 10-15 minutes to release juices before filling crust`,
    timestamp: Date.now() - 120000,
  },
];

const DEMO_QUEUE: QueueItem[] = [
  {
    id: 'queue-1',
    title: 'Pie Crust Techniques',
    content: 'tell me about pie crust techniques',
    status: 'past',
    order: 0,
  },
  {
    id: 'queue-2',
    title: 'Apple Selection and Preparation',
    content: 'tell me about apple selection and preparation',
    status: 'past',
    order: 1,
  },
  {
    id: 'queue-3',
    title: 'Filling Ingredients and Spices',
    content: 'tell me about filling ingredients and spices',
    status: 'now',
    order: 2,
  },
  {
    id: 'queue-4',
    title: 'Baking Temperature and Time',
    content: 'tell me about baking temperature and time',
    status: 'upcoming',
    order: 3,
  },
  {
    id: 'queue-5',
    title: 'Assembly and Finishing Steps',
    content: 'tell me about assembly and finishing steps',
    status: 'upcoming',
    order: 4,
  },
];

interface QueueDemoProps {
  triggerDemo?: boolean;
  onDemoTriggered?: () => void;
}

export default function QueueDemo({ triggerDemo, onDemoTriggered }: QueueDemoProps = {}) {
  const [messages, setMessages] = useState<Message[]>(DEMO_MESSAGES);
  const [queueItems, setQueueItems] = useState<QueueItem[]>(DEMO_QUEUE);
  const [hasTriggered, setHasTriggered] = useState(false);

  // Animation state (simplified from layout.tsx)
  const [selectedDotPosition, setSelectedDotPosition] = useState({ top: 0, opacity: 1 });
  const [hoverDotPosition, setHoverDotPosition] = useState({ top: 0, opacity: 0 });
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [selectedIndexItemId, setSelectedIndexItemId] = useState<string>('demo-chat-queue-queue-2'); // Start with NOW item selected
  const [isAnimating, setIsAnimating] = useState(false);

  const indexButtonRefs = useRef<Map<string, HTMLElement>>(new Map());
  const chatButtonRef = useRef<HTMLButtonElement>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
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

  // Handle external trigger
  useEffect(() => {
    if (triggerDemo) {
      // Reset demo state to initial values whenever triggered
      setMessages(DEMO_MESSAGES);
      setQueueItems(DEMO_QUEUE);
      setSelectedIndexItemId('demo-chat-queue-queue-2');
      setHasTriggered(true);

      // Trigger the queue animation
      setTimeout(() => {
        const event = new CustomEvent('triggerQueueItem-queue-demo', {
          detail: { queueItemId: 'queue-3' }
        });
        window.dispatchEvent(event);
        // Call callback after triggering
        if (onDemoTriggered) {
          onDemoTriggered();
        }
      }, 300);
    }
  }, [triggerDemo, onDemoTriggered]);

  // Auto-trigger queue message when scrolled into view (disabled when using external trigger)
  useEffect(() => {
    if (hasTriggered || triggerDemo !== undefined) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTriggered) {
            setHasTriggered(true);
            // Wait a moment for the demo to fully load, then trigger the queue
            setTimeout(() => {
              const event = new CustomEvent('triggerQueueItem-queue-demo', {
                detail: { queueItemId: 'queue-3' }
              });
              window.dispatchEvent(event);
            }, 800);
          }
        });
      },
      {
        threshold: 0.3, // Trigger when 30% visible
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [hasTriggered, triggerDemo]);

  return (
    <div ref={containerRef} className="demo-container" style={{ height: '600px', display: 'flex', position: 'relative', '--dot-duration': `${chatAnimConfig.dotDuration}ms`, '--dot-spring': chatAnimConfig.dotSpring } as React.CSSProperties}>
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
              <span className="chat-title">Apple Pie Baking</span>
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
                    onClick={(e) => {
                      e.stopPropagation();
                      // Trigger this queue item
                      const event = new CustomEvent('triggerQueueItem-queue-demo', {
                        detail: { queueItemId: item.id }
                      });
                      window.dispatchEvent(event);
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
                  <button
                    key={item.id}
                    ref={(el) => {
                      if (el) {
                        indexButtonRefs.current.set(queueItemId, el);
                      } else {
                        indexButtonRefs.current.delete(queueItemId);
                      }
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Trigger this queue item
                      const event = new CustomEvent('triggerQueueItem-queue-demo', {
                        detail: { queueItemId: item.id }
                      });
                      window.dispatchEvent(event);
                    }}
                    className="index-item-btn upcoming"
                    onMouseEnter={() => !isAnimating && setHoveredItemId(queueItemId)}
                    onMouseLeave={() => !isAnimating && setHoveredItemId(null)}
                  >
                    <span className="index-item-title">{item.title}</span>
                  </button>
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
