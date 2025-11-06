'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import EditableChatCanvas from '../EditableChatCanvas';
import { Message, ConversationIndex as ConversationIndexType } from '@/app/lib/types';
import '@/app/components/EditableChatCanvas.css';

const DEMO_MESSAGES: Message[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'how could i franchise a boba shop',
    timestamp: Date.now() - 600000,
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: `# Franchise Requirements and Costs

Initial investment: $150K-$350K typically
Franchise fee: $25K-$50K
Liquid capital: $100K-$200K required
Net worth: $250K-$500K minimum
Space: 800-1,500 sq ft retail location
Equipment: $40K-$80K for boba machines, blenders, POS systems
Ongoing fees: 4-7% royalty, 2-4% marketing fee

## Requirements

- Food service experience preferred
- Ability to secure prime retail location
- Pass franchisor's approval process
- Complete training program
- Comply with brand standards and operational procedures

Popular boba franchises include Kung Fu Tea, Gong Cha, and Tiger Sugar.`,
    timestamp: Date.now() - 540000,
  },
  {
    id: 'msg-3',
    role: 'user',
    content: 'tell me about business model development',
    timestamp: Date.now() - 480000,
  },
  {
    id: 'msg-4',
    role: 'assistant',
    content: `# Business Model Development for Boba Shop Franchise

## Revenue Streams

- Beverage sales (boba tea, smoothies, specialty drinks)
- Food add-ons (pastries, snacks, light meals)
- Merchandise and branded items

## Key Components

- **Target market**: Young adults, students, health-conscious consumers
- **Value proposition**: Quality ingredients, customizable drinks, trendy atmosphere
- **Pricing strategy**: Premium pricing ($4-$8 per drink) for perceived quality
- **Location strategy**: High foot-traffic areas (malls, colleges, busy streets)
- **Operational model**: Quick-service format with 2-4 staff members

**Scalability**: Franchise model allows rapid expansion with lower capital requirements than company-owned stores while maintaining brand consistency.`,
    timestamp: Date.now() - 420000,
  },
  {
    id: 'msg-5',
    role: 'user',
    content: 'tell me about legal documentation process',
    timestamp: Date.now() - 360000,
  },
  {
    id: 'msg-6',
    role: 'assistant',
    content: `# Legal Documentation Process for Boba Shop Franchise

## Key Documents Required

- **Franchise Disclosure Document (FDD)**: Must be provided 14 days before signing
- **Franchise Agreement**: Master contract outlining terms, fees, territory rights
- **Business registration**: LLC/Corporation formation documents
- **Operating licenses**: Food service permit, business license, health permits
- **Lease agreements**: Commercial space rental contracts
- **Insurance policies**: General liability, workers comp, property coverage
- **Employment contracts**: Staff hiring documentation

## Legal Steps

1. Review FDD with franchise attorney
2. Secure financing/investor agreements
3. File business entity formation
4. Obtain required permits/licenses
5. Execute franchise agreement
6. Complete real estate documentation

Professional legal review is essential before signing any franchise agreements.`,
    timestamp: Date.now() - 300000,
  },
  {
    id: 'msg-7',
    role: 'user',
    content: 'tell me about location and marketing strategy',
    timestamp: Date.now() - 240000,
  },
  {
    id: 'msg-8',
    role: 'assistant',
    content: `# Location & Marketing Strategy

## Location Strategy

- **High-traffic areas**: Shopping malls, college campuses, downtown districts
- **Demographics**: Target areas with 18-35 age group, disposable income
- **Visibility**: Ground-floor spaces with street visibility and foot traffic
- **Proximity**: Near schools, offices, entertainment venues
- **Accessibility**: Easy parking, public transit access

## Marketing Strategy

- **Social media focus**: Instagram, TikTok for visual appeal of colorful drinks
- **Grand opening**: Free samples, discounts, influencer partnerships
- **Loyalty programs**: Digital punch cards, mobile app rewards
- **Local partnerships**: College events, food delivery apps
- **Seasonal promotions**: Limited-time flavors, holiday specials
- **Community engagement**: Local festivals, sponsorships

Digital presence and visual marketing are crucial since boba drinks are highly "Instagrammable" and appeal to social media-savvy demographics.`,
    timestamp: Date.now() - 180000,
  },
];

const DEMO_INDEX: ConversationIndexType = {
  sections: [
    {
      id: 'section-1',
      title: 'Business Model Development',
      startMessageId: 'msg-4',
      endMessageId: 'msg-4',
    },
    {
      id: 'section-2',
      title: 'Legal Documentation Process',
      startMessageId: 'msg-6',
      endMessageId: 'msg-6',
    },
    {
      id: 'section-3',
      title: 'Location and Marketing',
      startMessageId: 'msg-8',
      endMessageId: 'msg-8',
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
              <span className="chat-title">Franchising a Boba Shop</span>
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
