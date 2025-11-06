'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import EditableChatCanvas from '../EditableChatCanvas';
import { Message, ConversationIndex as ConversationIndexType } from '@/app/lib/types';
import '@/app/components/EditableChatCanvas.css';

const DEMO_MESSAGES: Message[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'Tell me about the history of computing',
    timestamp: Date.now() - 600000,
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: `# Early Mechanical Computers

The history of computing begins with mechanical devices. Charles Babbage designed the Analytical Engine in the 1830s, which is considered the first general-purpose computer design. Ada Lovelace wrote the first algorithm intended for this machine.`,
    timestamp: Date.now() - 540000,
  },
  {
    id: 'msg-3',
    role: 'user',
    content: 'What about electronic computers?',
    timestamp: Date.now() - 480000,
  },
  {
    id: 'msg-4',
    role: 'assistant',
    content: `# Electronic Era

The ENIAC (1945) was one of the first electronic general-purpose computers. It weighed 30 tons and occupied an entire room. The transistor invention in 1947 revolutionized computing by replacing vacuum tubes.`,
    timestamp: Date.now() - 420000,
  },
  {
    id: 'msg-5',
    role: 'user',
    content: 'And personal computers?',
    timestamp: Date.now() - 360000,
  },
  {
    id: 'msg-6',
    role: 'assistant',
    content: `# Personal Computer Revolution

The 1970s-80s saw the rise of personal computers. The Altair 8800 (1975) was the first commercially successful PC. Apple II (1977) and IBM PC (1981) made computers accessible to homes and small businesses. This era democratized computing.`,
    timestamp: Date.now() - 300000,
  },
  {
    id: 'msg-7',
    role: 'user',
    content: 'What about the internet?',
    timestamp: Date.now() - 240000,
  },
  {
    id: 'msg-8',
    role: 'assistant',
    content: `# Internet & Web Era

The internet evolved from ARPANET (1969). Tim Berners-Lee invented the World Wide Web in 1989. The 1990s saw massive growth with browsers like Netscape and Internet Explorer. Email, e-commerce, and search engines transformed how we communicate and access information.`,
    timestamp: Date.now() - 180000,
  },
  {
    id: 'msg-9',
    role: 'user',
    content: 'And now with AI?',
    timestamp: Date.now() - 120000,
  },
  {
    id: 'msg-10',
    role: 'assistant',
    content: `# Modern AI Age

Today we're in the age of artificial intelligence and machine learning. Deep learning breakthroughs have enabled capabilities like natural language processing, computer vision, and generative AI. Cloud computing provides massive computational power, enabling both innovation and widespread access to AI technologies.`,
    timestamp: Date.now() - 60000,
  },
];

const DEMO_INDEX: ConversationIndexType = {
  sections: [
    {
      id: 'section-1',
      title: 'Early Mechanical Computing',
      startMessageId: 'msg-2',
      endMessageId: 'msg-2',
    },
    {
      id: 'section-2',
      title: 'Electronic Computer Era',
      startMessageId: 'msg-4',
      endMessageId: 'msg-4',
    },
    {
      id: 'section-3',
      title: 'Personal Computer Revolution',
      startMessageId: 'msg-6',
      endMessageId: 'msg-6',
    },
    {
      id: 'section-4',
      title: 'Internet & Web Era',
      startMessageId: 'msg-8',
      endMessageId: 'msg-8',
    },
    {
      id: 'section-5',
      title: 'Modern AI Age',
      startMessageId: 'msg-10',
      endMessageId: 'msg-10',
    },
  ],
  lastGenerated: Date.now(),
};

export default function IndexDemo() {
  const [messages, setMessages] = useState<Message[]>(DEMO_MESSAGES);
  
  // Animation state (simplified from layout.tsx)
  const [selectedDotPosition, setSelectedDotPosition] = useState({ top: 0, opacity: 1 });
  const [hoverDotPosition, setHoverDotPosition] = useState({ top: 0, opacity: 0 });
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [selectedIndexItemId, setSelectedIndexItemId] = useState<string | null>(null);
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
        const isHoverIndexItem = hoveredItemId.includes('-section-');
        updateDotPosition(hoveredItemId, setHoverDotPosition, isHoverIndexItem);
      } else {
        setHoverDotPosition((prev) => ({ ...prev, opacity: 0 }));
      }
    }
  }, [hoveredItemId, isAnimating, updateDotPosition]);
  
  // Scroll to message handler
  const scrollToMessage = (messageId: string, sectionId: string) => {
    lockAnimation();
    setSelectedIndexItemId(sectionId);
    const event = new CustomEvent(`scrollToMessage-index-demo`, {
      detail: { messageId }
    });
    window.dispatchEvent(event);
  };

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
              <span className="chat-title">History of Computing</span>
            </button>
            
            {/* Index sections */}
            <div className="chat-index">
              {DEMO_INDEX.sections.map((section) => {
                const indexItemId = `demo-chat-section-${section.id}`;
                const isSelected = selectedIndexItemId === indexItemId;
                
                return (
                  <button
                    key={section.id}
                    ref={(el) => {
                      if (el) {
                        indexButtonRefs.current.set(indexItemId, el);
                      } else {
                        indexButtonRefs.current.delete(indexItemId);
                      }
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      scrollToMessage(section.startMessageId, indexItemId);
                    }}
                    onMouseEnter={() => !isAnimating && setHoveredItemId(indexItemId)}
                    onMouseLeave={() => !isAnimating && setHoveredItemId(null)}
                    className={`index-item-btn ${isSelected ? 'selected' : ''}`}
                  >
                    <span className="index-item-title">{section.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Other demo chats below */}
          <div className="chat-item">
            <button className="chat-button">
              <span className="chat-title">Machine learning basics</span>
            </button>
          </div>
          
          <div className="chat-item">
            <button className="chat-button">
              <span className="chat-title">React hooks explained</span>
            </button>
          </div>
          
          <div className="chat-item">
            <button className="chat-button">
              <span className="chat-title">How to bake sourdough bread</span>
            </button>
          </div>
          
          <div className="chat-item">
            <button className="chat-button">
              <span className="chat-title">Python data structures overview</span>
            </button>
          </div>
          
          <div className="chat-item">
            <button className="chat-button">
              <span className="chat-title">Best practices for API design</span>
            </button>
          </div>
          
          <div className="chat-item">
            <button className="chat-button">
              <span className="chat-title">Understanding quantum physics</span>
            </button>
          </div>
          
          <div className="chat-item">
            <button className="chat-button">
              <span className="chat-title">JavaScript promises and async/await</span>
            </button>
          </div>
          
          <div className="chat-item">
            <button className="chat-button">
              <span className="chat-title">How does photosynthesis work?</span>
            </button>
          </div>
          
          <div className="chat-item">
            <button className="chat-button">
              <span className="chat-title">CSS grid vs flexbox comparison</span>
            </button>
          </div>
          
          <div className="chat-item">
            <button className="chat-button">
              <span className="chat-title">The history of Ancient Rome</span>
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
          conversationId="index-demo"
          conversationIndex={DEMO_INDEX}
          demoId="index-demo"
          hideSettings={true}
        />
      </div>
    </div>
  );
}
