'use client';

import { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import TwitterIcon from './icons/TwitterIcon';
import EnvelopeIcon from './icons/EnvelopeIcon';
import { ArrowUpIcon } from '@heroicons/react/24/outline';
import { useChat } from '../hooks/useChat';

interface CardData {
  id: string;
  title: string;
  image: string;
}

const cardData: CardData[] = [
  {
    id: 'apps',
    title: 'software made with care',
    image: '/card-images/apps.jpg',
  },
  {
    id: 'house',
    title: 'designing for someone you love',
    image: '/card-images/house.jpg',
  },
  {
    id: 'apple',
    title: 'puns made visual',
    image: '/card-images/apple.jpg',
  },
  {
    id: 'cyanotype',
    title: 'cyanotypes',
    image: '/card-images/cyanotype.jpg',
  },
  {
    id: 'journal',
    title: 'the journal that reflects with you',
    image: '/card-images/journal.jpg',
  },
  {
    id: 'charcuterie',
    title: 'charcuterie for my friends',
    image: '/card-images/charcuterie.jpg',
  },
  {
    id: 'family',
    title: 'my family :)',
    image: '/card-images/family.jpg',
  },
  {
    id: 'lilypad',
    title: "my mother's hometown",
    image: '/card-images/lilypad.jpg',
  },
  {
    id: 'friend',
    title: 'my friends',
    image: '/card-images/friend.jpg',
  }
];

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  cardImage?: string; // Optional card image for messages sent from card drops
}

interface DragState {
  isDragging: boolean;
  draggedCardId: string | null;
  isPastSnapPoint: boolean;
  isOverDropZone: boolean; // In envelope body area
  tapRotation: number; // Stores the rotation applied on tap
  isPullingToDropZone?: boolean; // When card is being pulled into drop zone
  pullTargetX?: number; // Target X position for pull animation
  pullTargetY?: number; // Target Y position for pull animation
  isFadingOut?: boolean; // When card is fading out after reaching drop zone
}

interface InteractivePortfolioProps {
  onCardClick?: (cardId: string) => void;
}

// Memoized message component to prevent unnecessary re-renders
const ChatMessage = memo(({ message, isLastInGroup, index }: { 
  message: Message; 
  isLastInGroup: boolean;
  index: number;
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>(0);

  useEffect(() => {
    if (!contentRef.current) return;

    const observer = new ResizeObserver(() => {
      if (contentRef.current) {
        const newHeight = contentRef.current.scrollHeight;
        setHeight(newHeight);
      }
    });

    observer.observe(contentRef.current);
    
    // Set initial height
    setHeight(contentRef.current.scrollHeight);

    return () => observer.disconnect();
  }, [message.text]); // Re-observe when message text changes

  return (
  <div 
    key={message.id} 
    className={`flex items-end ${message.sender === 'user' ? 'justify-end' : 'justify-start'} ${isLastInGroup ? 'mb-3' : 'mb-1'} ${message.cardImage ? 'mt-9' : ''}`}
  >
    {/* Avatar for incoming messages - only show on last message in group */}
    {message.sender === 'assistant' && (
      <div className={`w-[42px] h-[42px] rounded-full overflow-hidden flex-shrink-0 mr-2 ${!isLastInGroup ? 'opacity-0' : ''}`}>
        <Image
          src="/profile.jpg"
          alt="Profile"
          width={42}
          height={42}
          className="w-full h-full object-cover"
        />
      </div>
    )}
    
    {/* Message bubble with thumbnail */}
    <div className="relative">
      {/* Card image thumbnail - positioned outside bubble */}
      {message.cardImage && (
        <div 
          className="absolute -top-10 -right-0 z-10"
          style={{
            transform: `rotate(${((parseInt(message.id) % 1000) / 1000 - 0.5) * 20}deg)`
          }}
        >
          <div className="w-12 h-12 rounded-md overflow-hidden border-3 border-white shadow-sm bg-white mr-2">
            <Image
              src={message.cardImage}
              alt="Card image"
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}
      
      {/* Message bubble with animated height */}
      <div 
        className="max-w-xs overflow-hidden transition-all duration-75 ease-linear"
        style={{
          height: height || 'auto',
          borderRadius: '24px'
        }}
      >
        <div 
          ref={contentRef}
          className="px-4 py-3 break-words"
          style={{
            background: message.sender === 'user' 
              ? 'rgba(47, 53, 87, 0.9)' 
              : 'rgba(255, 255, 255, 0.95)',
            color: message.sender === 'user' 
              ? 'rgba(255, 255, 255, 0.95)' 
              : 'var(--gray-900)',
            borderRadius: '24px'
          }}
        >
          <p 
            className="font-detail text-sm leading-tight whitespace-pre-wrap"
          >
             {message.text}
           </p>
        </div>
      </div>
    </div>
  </div>
  );
});

ChatMessage.displayName = 'ChatMessage';



export default function InteractivePortfolio({ onCardClick }: InteractivePortfolioProps) {
  // Card state
  const [tappedCard, setTappedCard] = useState<string | null>(null);
  const [pickedCardsOrder, setPickedCardsOrder] = useState<string[]>([]);
  const [cardRotations, setCardRotations] = useState<{ [cardId: string]: number }>({});
  const [cardTransformOrigins, setCardTransformOrigins] = useState<{ [cardId: string]: string }>({});
  const [hiddenCards, setHiddenCards] = useState<Set<string>>(new Set());
  const [reappearingCards, setReappearingCards] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Window size state for consistent SSR/client rendering
  const [viewportWidth, setViewportWidth] = useState(1200);

  // Initialize chat with sample messages
  const initialMessages: Message[] = [
    {
      id: '1',
      text: "hi!! nice to e-meet you :) ",
      sender: 'assistant',
      timestamp: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
    }
  ];

  // Use the chat hook
  const { messages, isLoading, error, sendMessage, addAssistantMessage, clearError } = useChat(initialMessages);
  
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isInputHovered, setIsInputHovered] = useState(false);

  // Drag state management
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedCardId: null,
    isPastSnapPoint: false,
    isOverDropZone: false,
    tapRotation: 0,
  });

  // Snap point configuration
  const SNAP_POINT_PADDING = 128; // Vertical padding around envelope

  // Get envelope bounds for snap point calculation
  const getEnvelopeBounds = () => {
    const cardContainerHeight = 850; // Height of card section
    const envelopeTop = cardContainerHeight; // Envelope starts right after cards
    const snapPointTop = envelopeTop - SNAP_POINT_PADDING;
    
    return {
      snapPointTop,
      envelopeTop,
    };
  };

  // Check if a point is past the snap point
  const isPastSnapPoint = (y: number) => {
    const { snapPointTop } = getEnvelopeBounds();
    return y > snapPointTop;
  };

  // Check if a point is within the actual envelope body geometry
  const isInEnvelopeBody = (x: number, y: number) => {
    const { envelopeTop } = getEnvelopeBounds();
    
    // Must be below envelope top
    if (y <= envelopeTop) return false;
    
    // Get envelope container bounds (600px max-width, centered)
    const envelopeMaxWidth = 600;
    const envelopeWidth = Math.min(envelopeMaxWidth, viewportWidth);
    const envelopeLeft = (viewportWidth - envelopeWidth) / 2;
    const envelopeRight = envelopeLeft + envelopeWidth;
    
    // Check if within envelope horizontal bounds
    if (x < envelopeLeft || x > envelopeRight) return false;
    
    // Check if within envelope body height (375px)
    const envelopeBodyHeight = 375;
    const envelopeBottom = envelopeTop + envelopeBodyHeight;
    if (y > envelopeBottom) return false;
    
    return true;
  };

  // Start the fade out and reappear sequence for a card
  const startCardFadeOutSequence = (cardId: string) => {
    // Start fade out immediately
    setDragState(prev => ({
      ...prev,
      isFadingOut: true,
      draggedCardId: cardId
    }));
    
    // After fade out completes, trigger message and reset state
    setTimeout(() => {
      const contextualMessage = getPreviewMessage(cardId);
      const cardData_item = cardData.find(card => card.id === cardId);
      const cardImage = cardData_item?.image;
      handleSendMessage(contextualMessage, cardImage, cardId);
      
      // Hide the card permanently
      setHiddenCards(prev => new Set(prev).add(cardId));
      
      setDragState({
        isDragging: false,
        draggedCardId: null,
        isPastSnapPoint: false,
        isOverDropZone: false,
        tapRotation: 0,
        isPullingToDropZone: false,
        pullTargetX: undefined,
        pullTargetY: undefined,
        isFadingOut: false
      });
      
      // After a delay, make the card reappear with animation
      setTimeout(() => {
        setHiddenCards(prev => {
          const newSet = new Set(prev);
          newSet.delete(cardId);
          return newSet;
        });
        setReappearingCards(prev => new Set(prev).add(cardId));
        
        // After the initial bounce, scale back to normal
        setTimeout(() => {
          // This will trigger the scale to go back to 1 from 1.05
          setReappearingCards(prev => {
            const newSet = new Set(prev);
            newSet.delete(cardId);
            return newSet;
          });
        }, 200); // Duration for fade-in + bounce animation
      }, 100); // Wait before reappearing
    }, 600); // Fade out duration
  };

  // Pull card into drop zone with smooth animation
  const pullCardIntoDropZone = (cardId: string) => {
    // Calculate target position relative to card container center
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const targetX = 0; // Center horizontally relative to card container
    const targetY = 450; // Fixed distance down from card container (relative to envelope position)
    
    // Set state to indicate we're pulling the card
    setDragState(prev => ({
      ...prev,
      isPullingToDropZone: true,
      pullTargetX: targetX,
      pullTargetY: targetY
    }));
    
    // After pull animation, start the fade out sequence
    setTimeout(() => {
      setDragState(prev => ({
        ...prev,
        isPullingToDropZone: false
      }));
      startCardFadeOutSequence(cardId);
    }, 600); // Match pull animation duration
  };

  // Memoize icons to prevent rerendering
  const twitterIcon = useMemo(() => <TwitterIcon className="text-white" size={20} />, []);
  const envelopeIcon = useMemo(() => <EnvelopeIcon className="w-5 h-5 text-white" />, []);
  const arrowIcon = useMemo(() => <ArrowUpIcon className="w-3.5 h-3.5 text-white" strokeWidth={3} />, []);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      const messagesContainer = messagesEndRef.current.parentElement;
      if (messagesContainer) {
        // Use requestAnimationFrame for smoother scrolling
        requestAnimationFrame(() => {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });
      }
    }
  }, []);

  useEffect(() => {
    // Use RAF for better performance than setTimeout
    const rafId = requestAnimationFrame(scrollToBottom);
    return () => cancelAnimationFrame(rafId);
  }, [messages, scrollToBottom]);

  // Update viewport width after hydration to prevent SSR mismatch
  useEffect(() => {
    const updateViewportWidth = () => {
      setViewportWidth(window.innerWidth);
    };
    
    // Set initial width
    updateViewportWidth();
    
    // Add resize listener
    window.addEventListener('resize', updateViewportWidth);
    
    return () => {
      window.removeEventListener('resize', updateViewportWidth);
    };
  }, []);

  // Handle card interaction to bring to front
  const handleCardInteraction = (cardId: string) => {
    setPickedCardsOrder(prev => {
      const filtered = prev.filter(id => id !== cardId);
      return [...filtered, cardId];
    });
    
    // Call the parent's onCardClick handler
    onCardClick?.(cardId);
  };

  // Drag handlers
  const handleDragStart = (cardId: string, tapRotation: number) => {
    setDragState({
      isDragging: true,
      draggedCardId: cardId,
      isPastSnapPoint: false,
      isOverDropZone: false,
      tapRotation: tapRotation,
    });
  };

  const handleDragEnd = (cardId: string, droppedOnEnvelope: boolean, _dragInfo: { point: { x: number; y: number } }) => {
    if (droppedOnEnvelope) {
      // Card dropped directly in envelope - start fade out animation immediately
      startCardFadeOutSequence(cardId);
      return; // Don't reset drag state yet, let the animation handle it
    } else if (dragState.isPastSnapPoint && !droppedOnEnvelope) {
      // Card is in snap zone but not drop zone - pull it into the drop zone
      pullCardIntoDropZone(cardId);
      return; // Don't reset drag state yet, let the animation handle it
    }
    
    setDragState({
      isDragging: false,
      draggedCardId: null,
      isPastSnapPoint: false,
      isOverDropZone: false,
      tapRotation: 0,
    });
  };



  // Throttled drag handler for better performance
  const dragThrottleRef = useRef<NodeJS.Timeout | null>(null);
  const handleDrag = useCallback((_cardId: string, info: { point: { x: number; y: number } }) => {
    // Clear previous throttle
    if (dragThrottleRef.current) {
      clearTimeout(dragThrottleRef.current);
    }
    
    // Throttle drag calculations to every 16ms (~60fps)
    dragThrottleRef.current = setTimeout(() => {
      const cardCenterX = info.point.x;
      const cardCenterY = info.point.y;
      
      const pastSnapPoint = isPastSnapPoint(cardCenterY);
      const inEnvelopeBody = isInEnvelopeBody(cardCenterX, cardCenterY);
      
      // Only update state if values actually changed to prevent unnecessary re-renders
      setDragState(prev => {
        if (prev.isPastSnapPoint === pastSnapPoint && prev.isOverDropZone === inEnvelopeBody) {
          return prev;
        }
        return {
          ...prev,
          isPastSnapPoint: pastSnapPoint,
          isOverDropZone: inEnvelopeBody
        };
      });
    }, 16); // ~60fps throttling
  }, [viewportWidth]);

  // Get preview message for dragged card
  const getPreviewMessage = (cardId: string) => {
    const messages: { [key: string]: string } = {
      apps: "what problems excite you?",
      house: "what does designing for someone you love mean to you?",
      apple: "why does ‘everyday art’ get you excited?",
      cyanotype: "how does art inform your work?",
      journal: "how can we design for present-ness?",
      charcuterie: "is love inherent to creation?",
      family: "what do you care about?",
      lilypad: "how does love shape you?",
      friend: "who is someone you love?"
    };
    return messages[cardId] || "Tell me more about this!";
  };

  const handleSendMessage = useCallback(async (messageText?: string, cardImage?: string, cardId?: string) => {
    const text = messageText || newMessage.trim();
    if (text === '') return;

    // Clear error if any
    if (error) {
      clearError();
    }

    // Send message using the chat hook
    await sendMessage(text, cardImage, cardId);
    
    // Clear input if not from card interaction
    if (!messageText) {
      setNewMessage('');
      
      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = '20px';
      }
    }
  }, [newMessage, error, clearError, sendMessage]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Predefined scattered positions for each card (like polaroid photos) - spread across 1280px
  const getScatteredPositions = () => {
    const basePositions = [
      { x: -450, y: 30, rotate: 12, z: 1 },  // apps - far left
      { x: -350, y: -10, rotate: 4, z: 2 },     // house - top center
      { x: -250, y: 50, rotate: -25, z: 3 },    // apple - right
      { x: -175, y: -60, rotate: -15, z: 4 },   // cyanotype - left
      { x: -20, y: -10, rotate: -3, z: 9 },     // journal - center left
      { x: 175, y: -50, rotate: 8, z: 6 },      // charcuterie - center right
      { x: 245, y: 20, rotate: 5, z: 8 },   // family - upper far left
      { x: 360, y: 60, rotate: 16, z: 7 },     // lilypad - far right
      { x: 475, y: -30, rotate: -5, z: 5 }    // friend - upper right
    ];

    return basePositions;
  };

  // Get static position for each card
  const getCardPosition = (index: number, cardId: string) => {
    const positions = getScatteredPositions();
    const position = positions[index];
    
    // Determine z-index based on picked order
    const pickedIndex = pickedCardsOrder.indexOf(cardId);
    
    // Base z-index preserves original card ordering from the scattered positions
    let zIndex = position.z; 
    if (pickedIndex !== -1) {
      // Recently picked cards get higher z-index, maintaining pick order
      zIndex = 10 + pickedIndex;
    }
    
    return {
      x: position.x,
      y: position.y,
      rotate: position.rotate,
      scale: 1,
      zIndex: zIndex,
    };
  };

  return (
    <div className="w-full">
      {/* Card stack section */}
      <div 
        ref={containerRef}
        className="relative w-full h-[332px] flex items-center justify-center z-[10]"
        style={{ perspective: '1000px' }}
        role="region"
        aria-label="Interactive portfolio cards"
      >
        {cardData.map((card, index) => {
          const position = getCardPosition(index, card.id);
          const isTapped = tappedCard === card.id;
          const isDraggingThis = dragState.isDragging && dragState.draggedCardId === card.id;
          const isPullingThis = dragState.isPullingToDropZone && dragState.draggedCardId === card.id;
          const isFadingOutThis = dragState.isFadingOut && dragState.draggedCardId === card.id;
          const isHidden = hiddenCards.has(card.id);
          const isReappearing = reappearingCards.has(card.id);
          // Use stored rotation if it exists, otherwise use base rotation
          const currentRotation = cardRotations[card.id] ?? position.rotate;
          
          // Don't render hidden cards
          if (isHidden) {
            return null;
          }
          
          return (
            <motion.div
              key={card.id}
              data-card-id={card.id}
              className="absolute cursor-grab active:cursor-grabbing focus:outline-none rounded-2xl"
              style={{
                zIndex: position.zIndex,
                transformOrigin: cardTransformOrigins[card.id] || 'center center',
              } as React.CSSProperties}
              initial={isReappearing ? {
                x: position.x,
                y: position.y,
                rotate: position.rotate,
                scale: 0.8,
                opacity: 0
              } : {
                x: position.x,
                y: position.y,
                rotate: position.rotate,
                scale: 1,
              }}
              animate={isReappearing ? {
                x: position.x,
                y: position.y,
                rotate: currentRotation,
                scale: 1.05,
                opacity: 1,
                transition: {
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                  duration: 0.6
                }
              } : isFadingOutThis ? {
                x: dragState.pullTargetX,
                y: dragState.pullTargetY,
                rotate: currentRotation,
                scale: isDraggingThis && dragState.isPastSnapPoint ? 0.7 : (isTapped ? 1.08 : 1),
                opacity: 0
              } : isPullingThis ? {
                x: dragState.pullTargetX,
                y: dragState.pullTargetY,
                rotate: currentRotation,
                scale: isDraggingThis && dragState.isPastSnapPoint ? 0.7 : (isTapped ? 1.08 : 1),
                opacity: 1
              } : {
                rotate: currentRotation,
                scale: isDraggingThis && dragState.isPastSnapPoint ? 0.7 : (isTapped ? 1.08 : 1),
                opacity: 1
              }}
              drag={!isPullingThis}
              dragMomentum={false}
              dragElastic={0.1}
              onTapStart={(event, info) => {
                const tapRotation = position.rotate + (Math.random() - 0.5) * 8;
                setTappedCard(card.id);
                handleCardInteraction(card.id);
                // Store the rotation immediately for this card
                setCardRotations(prev => ({ ...prev, [card.id]: tapRotation }));
                setDragState(prev => ({ ...prev, tapRotation }));
                
                // Calculate transform origin based on cursor position relative to card
                const cardElement = event.target as HTMLElement;
                const cardRect = cardElement.getBoundingClientRect();
                const originX = ((info.point.x - cardRect.left) / cardRect.width) * 100;
                const originY = ((info.point.y - cardRect.top) / cardRect.height) * 100;
                setCardTransformOrigins(prev => ({ 
                  ...prev, 
                  [card.id]: `${Math.max(0, Math.min(100, originX))}% ${Math.max(0, Math.min(100, originY))}%` 
                }));
              }}
              onTap={() => {
                // Handle pure clicks (no drag)
                setTappedCard(null);
              }}
              onDragStart={() => {
                setTappedCard(card.id);
                handleDragStart(card.id, dragState.tapRotation);
              }}
              onDrag={(event, info) => {
                handleDrag(card.id, info);
              }}
              onDragEnd={(_event, info) => {
                setTappedCard(null);
                // Check if dropped in actual envelope body geometry
                const droppedInEnvelope = isInEnvelopeBody(info.point.x, info.point.y);
                handleDragEnd(card.id, droppedInEnvelope, info);
              }}
              // No automatic animation back to position - cards stay where placed
              transition={{
                type: 'spring',
                stiffness: 500,
                damping: 25,
                mass: 0.8,
                restDelta: 0.001,
              }}

              tabIndex={0}
              role="button"
              aria-label={`Click or drag ${card.title}`}
            >
              <div 
                className="bg-white border overflow-hidden p-2 w-60 flex flex-col items-center"
                style={{ 
                  borderRadius: '24px 24px 24px 24px',
                  borderColor: 'var(--gray-100)',
                  boxShadow: isTapped 
                    ? '0 4px 16px 0 rgba(47, 53, 87, 0.15), 0 4px 8px 0 rgba(47, 53, 87, 0.05)'
                    : '0 4px 12px 0 rgba(47, 53, 87, 0.10), 0 1px 2px 0 rgba(47, 53, 87, 0.05)',
                }}
              >
                {/* Image area - fills available space */}
                <div 
                  className="flex-shrink-0 relative overflow-hidden w-full aspect-square items-center"
                  style={{
                    borderRadius: '16px 16px 2px 2px',
                  }}
                >
                  {/* Inner border overlay */}
                  <div 
                    className="absolute inset-0 border pointer-events-none z-10"
                    style={{
                        borderRadius: '16px 16px 2px 2px',
                        borderColor: 'var(--gray-50)',
                    }}
                  />
                <Image
                      src={card.image}
                      alt={card.title}
                      fill
                      className="flex object-cover pointer-events-none"
                      sizes="(max-width: 768px) 100vw, 240px"
                      priority={card.id === 'journal' || card.id === 'apple'}
                    />
                </div>
                
                {/* Text area - flexible height */}
                <div className="flex-1 flex flex-col pt-2 pb-3 w-full">
                  <h3 className="font-detail text-sm font-medium leading-tight text-start" style={{ color: 'var(--gray-900)' }}>
                      {card.title}
                    </h3>
                  </div>
              </div>
            </motion.div>
          );
        })}
      </div>


      {/* Envelope section */}
      <div className="pb-28 relative z-[1]">

        {/* Drop zone overlay - shows when card is past snap point */}
        {dragState.isDragging && dragState.isPastSnapPoint && (
          <div className="absolute flex justify-center items-center inset-0 pointer-events-auto z-[4]">
            <div 
              className="relative w-full max-w-[585px] h-[360px] mx-auto flex items-center justify-center"
              style={{
                borderRadius: '24px',
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)',
                animation: 'fadeIn 0.5s ease-out'
              }}
            >
              {/* Animated SVG Border */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ 
                  borderRadius: '24px',
                  filter: 'blur(1px)'
                }}
              >
                <rect
                  x="2"
                  y="2"
                  width="calc(100% - 4px)"
                  height="calc(100% - 4px)"
                  rx="22"
                  ry="22"
                  fill="rgba(255, 255, 255, 0.5)"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeDasharray="3 9"
                  strokeLinecap="round"
                  className="animated-dash"
                  style={{
                    animation: 'dashMove 2s linear infinite',
                  }}
                />
              </svg>
              
              {/* Preview message */}
              {dragState.draggedCardId && (
                <div 
                  className="text-base font-detail z-10"
                  style={{
                    color: 'var(--gray-900)',
                    animation: 'fadeInScale 0.3s ease-out',
                    textShadow: '0 0px 8px white, 0 0px 24px white'
                  }}
                >
                  {getPreviewMessage(dragState.draggedCardId)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Envelope */}
        <div className="flex justify-center items-center">
          <div className="relative w-full max-w-[600px] mx-auto">
            {/* Top Flap */}
            <div 
               className="left-0 right-0 h-[112px] rounded-t-[128px] flex items-center justify-center"
               style={{
                 background: 'rgba(255, 255, 255, 0.2)',
                 boxShadow: `
                   inset 1px 1px 2px rgba(255, 255, 255, 0.15),
                   inset 0 -4px 4px rgba(255, 255, 255, 0.25),
                   inset 0 -12px 24px rgba(255, 255, 255, 0.30),
                   0 4px 16px rgba(47, 53, 87, 0.12)
                 `,
                 backdropFilter: 'blur(2px)'
               }}
             >
            {/* Header */}
              <h2 className="font-mono text-lg tracking-wider mt-10" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                TALK <span className="italic">2</span> ME
              </h2>
             </div>
            
            {/* Main Envelope Body */}
            <div 
              className="relative rounded-b-[32px] h-[375px] flex flex-col"
              style={{
                background: 'rgba(255, 255, 255, 0.36)',
                boxShadow: `
                  0 4px 16px rgba(47, 53, 87, 0.08),
                  0 4px 4px rgba(47, 53, 87, 0.04)
                `
              }}
            >
            {/* Left Panel */}
                 <div 
                   className="absolute top-0 left-0 w-[112px] bottom-0 z-0"
                   style={{
                     borderRadius: '0px 64px 64px 32px',
                     background: 'rgba(255, 255, 255, 0.04)',
                     boxShadow: `
                       inset 1px 48px 24px rgba(255, 255, 255, 0.05),
                       inset 0 4px 4px rgba(255, 255, 255, 0.1),
                       0 4px 25px rgba(47, 53, 87, 0.06)
                     `
                   }}
               />
              
              {/* Right Panel */}
              <div 
                className="absolute top-0 right-0 w-[112px] bottom-0 z-0"
                style={{
                  borderRadius: '64px 0px 32px 64px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  boxShadow: `
                    inset 1px 48px 24px rgba(255, 255, 255, 0.05),
                    inset 0 4px 4px rgba(255, 255, 255, 0.1),
                    0 4px 25px rgba(47, 53, 87, 0.06)
                  `
                }}
              />
              
              {/* Bottom Panel */}
              <div 
                className="absolute bottom-0 left-0 right-0 h-[312px] rounded-t-[128px] rounded-b-[32px] z-0"
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  boxShadow: `
                    inset 1px 48px 24px 8px rgba(255, 255, 255, 0.15),
                    inset 0 4px 4px rgba(255, 255, 255, 0.1),
                  `
                }}
              />


                    {/* Chat Messages Container */}
            <div className="flex-1 relative z-[2] overflow-hidden rounded-b-[32px]">
              <div className="space-y-1 h-full overflow-y-auto p-4 pb-20 envelope-scrollbar" >
              {messages.map((message, index) => {
                const nextMessage = messages[index + 1];
                const isLastInGroup = !nextMessage || nextMessage.sender !== message.sender;
                
                return (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isLastInGroup={isLastInGroup}
                    index={index}
                  />
                );
              })}
              


              {error && (
                <div className="flex items-center justify-center mb-3">
                  <div 
                    className="px-4 py-2 text-sm bg-red-50 text-red-600 rounded-full flex items-center space-x-2 cursor-pointer hover:bg-red-100 transition-colors"
                    onClick={clearError}
                  >
                    <span>⚠️ {error}</span>
                    <span className="text-xs opacity-70">tap to dismiss</span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area */}
            <div 
              className="absolute bottom-0 left-0 right-0 flex items-end space-x-2 z-[3] pb-4 px-4"
            >
                {/* Twitter button */}
               <a
                 href="https://x.com/CherrilynnZ"
                 target="_blank"
                 rel="noopener noreferrer" 
                 className="w-[42px] h-[42px] bg-gray-400 rounded-full flex items-center justify-center transition-all hover:bg-gray-500"
                 style={{
                   backdropFilter: 'blur(10px)'
                 }}
               >
                 {twitterIcon}
               </a>

                  {/* Email button */}
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText('clzhang@berkeley.edu');
                    addAssistantMessage('my email (clzhang@berkeley.edu) is copied to ur clipboard now!');
                  }}
                  className="w-[42px] h-[42px] bg-gray-400 rounded-full flex items-center justify-center transition-all hover:bg-gray-500"
                  style={{
                    backdropFilter: 'blur(10px)'
                  }}
                  title="Copy email address"
                >
                 {envelopeIcon}
               </button>

              {/* Input field container */}
              <div className="flex-1 relative">
                <div 
                  className="flex items-end pl-4 pr-[6px] py-3 cursor-text relative"
                  style={{
                    background: 'var(--gray-400)',
                    borderRadius: '24px',
                    backdropFilter: 'blur(10px)'
                  }}
                  onClick={() => {
                    if (inputRef.current) {
                      inputRef.current.focus();
                    }
                  }}
                  onMouseEnter={() => setIsInputHovered(true)}
                  onMouseLeave={() => setIsInputHovered(false)}
                >
                  {/* Animated placeholder */}
                  {!newMessage && (
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none font-detail text-sm leading-tight">
                      <div 
                        className="relative"
                        style={{
                          color: 'rgba(255, 255, 255, 0.7)',
                        }}
                      >
                        {/* Original text with wave fade-out */}
                        <div className="whitespace-nowrap">
                          {"Chat with me!".split("").map((char, index) => (
                            <span
                              key={index}
                              className="transition-all ease-out"
                              style={{
                                opacity: isInputHovered ? 0 : 1,
                                filter: isInputHovered ? 'blur(2px)' : 'blur(0px)',
                                transitionDelay: isInputHovered ? `${index * 10}ms` : '0ms',
                                transitionDuration: '75ms'
                              }}
                            >
                              {char === " " ? "\u00A0" : char}
                            </span>
                          ))}
                        </div>
                        
                        {/* Hover text with wave animation */}
                        <div 
                          className="absolute top-0 left-0 whitespace-nowrap"
                        >
                          {"lele will see ur messages!".split("").map((char, index) => (
                            <span
                              key={index}
                              className="transition-all ease-out"
                              style={{
                                opacity: isInputHovered ? 1 : 0,
                                filter: isInputHovered ? 'blur(0px)' : 'blur(2px)',
                                transitionDelay: isInputHovered ? `${100 + (index * 10)}ms` : '0ms',
                                transitionDuration: '75ms'
                              }}
                            >
                              {char === " " ? "\u00A0" : char}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <textarea
                    ref={inputRef}
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      // Auto-resize textarea only when content requires multiple lines
                      const target = e.target;
                      target.style.height = '20px'; // Reset to min height
                      const scrollHeight = target.scrollHeight;
                      
                      // Only expand if content doesn't fit in single line
                      if (scrollHeight > 20) {
                        target.style.height = Math.min(scrollHeight, 80) + 'px';
                      }
                    }}
                    onKeyDown={handleKeyPress}
                    placeholder=""
                    className="flex-1 font-detail text-sm leading-tight resize-none focus:outline-none bg-transparent"
                    style={{
                      color: 'rgba(255, 255, 255)',
                      minHeight: '20px',
                      maxHeight: '80px'
                    }}
                    rows={1}
                  />
                  
                  {/* Send button container */}
                  <div className="h-5 overflow-visible flex items-center">
                    <button
                      onClick={() => handleSendMessage()}
                      className={`w-8 h-8 bg-white/20 rounded-full flex items-center justify-center transition-all hover:bg-white/30 ${
                        newMessage.trim() && !isLoading ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
                      }`}
                      disabled={!newMessage.trim() || isLoading}
                    >
                      {arrowIcon}
                    </button>
                  </div>
                </div>
              </div>

            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}