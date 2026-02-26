'use client';

import { useState, useRef, useEffect, useMemo, useCallback, memo, useReducer } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import TwitterIcon from './icons/TwitterIcon';
import EnvelopeIcon from './icons/EnvelopeIcon';
import { ArrowUpIcon } from '@heroicons/react/24/outline';
import { useChat } from '../hooks/useChat';
import { useMobileDetection } from '../hooks/useMobileDetection';
import { 
  ANIMATION_CONSTANTS, 
  CARD_SCATTERED_POSITIONS 
} from '../lib/cardMessages';
import { getCardPreviewMessage } from '../lib/prompts';

interface CardData {
  id: string;
  title: string;
  image: string;
}

const cardData: CardData[] = [
  {
    id: 'apps',
    title: 'software made with care',
    image: '/card-images/apps.webp',
  },
  {
    id: 'house',
    title: 'designing for someone you love',
    image: '/card-images/house.webp',
  },
  {
    id: 'apple',
    title: 'puns made visual',
    image: '/card-images/apple1.webp',
  },
  {
    id: 'cyanotype',
    title: 'cyanotypes',
    image: '/card-images/cyanotype1.webp',
  },
  {
    id: 'journal',
    title: 'the journal that reflects with you',
    image: '/card-images/journal.webp',
  },
  {
    id: 'charcuterie',
    title: 'charcuterie for my friends',
    image: '/card-images/charcuterie1.webp',
  },
  {
    id: 'family',
    title: 'my family :)',
    image: '/card-images/family1.webp',
  },
  {
    id: 'lilypad',
    title: "my mother's hometown",
    image: '/card-images/lilypad1.webp',
  },
  {
    id: 'friend',
    title: 'my friends',
    image: '/card-images/friend1.webp',
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

// Consolidated state interface
interface PortfolioState {
  // Card state
  tappedCard: string | null;
  pickedCardsOrder: string[];
  cardRotations: Record<string, number>;
  cardTransformOrigins: Record<string, string>;
  hiddenCards: Set<string>;
  reappearingCards: Set<string>;
  
  // UI state
  viewportWidth: number;
  newMessage: string;
  isInputHovered: boolean;
  
  // Drag state
  dragState: DragState;
}

// Action types
type PortfolioAction =
  | { type: 'SET_TAPPED_CARD'; cardId: string | null }
  | { type: 'UPDATE_PICKED_ORDER'; cardId: string }
  | { type: 'SET_CARD_ROTATION'; cardId: string; rotation: number }
  | { type: 'SET_CARD_TRANSFORM_ORIGIN'; cardId: string; origin: string }
  | { type: 'HIDE_CARD'; cardId: string }
  | { type: 'SHOW_CARD'; cardId: string }
  | { type: 'SET_REAPPEARING_CARD'; cardId: string; isReappearing: boolean }
  | { type: 'SET_VIEWPORT_WIDTH'; width: number }
  | { type: 'SET_NEW_MESSAGE'; message: string }
  | { type: 'SET_INPUT_HOVERED'; isHovered: boolean }
  | { type: 'UPDATE_DRAG_STATE'; updates: Partial<DragState> }
  | { type: 'RESET_DRAG_STATE' };

// Reducer function
function portfolioReducer(state: PortfolioState, action: PortfolioAction): PortfolioState {
  switch (action.type) {
    case 'SET_TAPPED_CARD':
      return { ...state, tappedCard: action.cardId };
    
    case 'UPDATE_PICKED_ORDER': {
      const filtered = state.pickedCardsOrder.filter(id => id !== action.cardId);
      return { ...state, pickedCardsOrder: [...filtered, action.cardId] };
    }
    
    case 'SET_CARD_ROTATION':
      return {
        ...state,
        cardRotations: { ...state.cardRotations, [action.cardId]: action.rotation }
      };
    
    case 'SET_CARD_TRANSFORM_ORIGIN':
      return {
        ...state,
        cardTransformOrigins: { ...state.cardTransformOrigins, [action.cardId]: action.origin }
      };
    
    case 'HIDE_CARD': {
      const newHiddenCards = new Set(state.hiddenCards);
      newHiddenCards.add(action.cardId);
      return { ...state, hiddenCards: newHiddenCards };
    }
    
    case 'SHOW_CARD': {
      const newHiddenCards = new Set(state.hiddenCards);
      newHiddenCards.delete(action.cardId);
      return { ...state, hiddenCards: newHiddenCards };
    }
    
    case 'SET_REAPPEARING_CARD': {
      const newReappearingCards = new Set(state.reappearingCards);
      if (action.isReappearing) {
        newReappearingCards.add(action.cardId);
      } else {
        newReappearingCards.delete(action.cardId);
      }
      return { ...state, reappearingCards: newReappearingCards };
    }
    
    case 'SET_VIEWPORT_WIDTH':
      return { ...state, viewportWidth: action.width };
    
    case 'SET_NEW_MESSAGE':
      return { ...state, newMessage: action.message };
    
    case 'SET_INPUT_HOVERED':
      return { ...state, isInputHovered: action.isHovered };
    
    case 'UPDATE_DRAG_STATE':
      return { ...state, dragState: { ...state.dragState, ...action.updates } };
    
    case 'RESET_DRAG_STATE':
      return {
        ...state,
        dragState: {
          isDragging: false,
          draggedCardId: null,
          isPastSnapPoint: false,
          isOverDropZone: false,
          tapRotation: 0,
        }
      };
    
    default:
      return state;
  }
}

// Memoized message component to prevent unnecessary re-renders
const ChatMessage = memo(({ message, isLastInGroup, showTyping }: {
  message: Message;
  isLastInGroup: boolean;
  showTyping?: boolean;
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>(0);
  const showDots = showTyping && !message.text;

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
          className="card-image-decoration"
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
        className="message-bubble"
        style={{
          height: (showTyping && !message.text) ? 'auto' : (height || 'auto')
        }}
      >
        <div 
          ref={contentRef}
          className={`message-content ${
            message.sender === 'user' 
              ? 'message-content--user' 
              : 'message-content--assistant'
          }`}
        >
          <p className="font-detail text-sm leading-tight whitespace-pre-wrap">
            {showDots ? (
              <span className="inline-flex items-center gap-[5px] py-[2px]">
                {[0, 1, 2].map(i => (
                  <span key={i} className="typing-dot" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </span>
            ) : message.text}
          </p>
        </div>
      </div>
    </div>
  </div>
  );
});

ChatMessage.displayName = 'ChatMessage';



export default function InteractivePortfolio({ onCardClick }: InteractivePortfolioProps) {
  // Detect if user is on mobile device
  const isMobile = useMobileDetection();
  
  // State for initial page load animation
  const [hasLoadedCards, setHasLoadedCards] = useState(false);
  
  // Consolidated state with useReducer
  const [state, dispatch] = useReducer(portfolioReducer, {
    // Card state
    tappedCard: null,
    pickedCardsOrder: [],
    cardRotations: {},
    cardTransformOrigins: {},
    hiddenCards: new Set<string>(),
    reappearingCards: new Set<string>(),
    
    // UI state
    viewportWidth: 1200,
    newMessage: '',
    isInputHovered: false,
    
    // Drag state
    dragState: {
      isDragging: false,
      draggedCardId: null,
      isPastSnapPoint: false,
      isOverDropZone: false,
      tapRotation: 0,
    },
  });
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize chat with sample messages
  const initialMessages: Message[] = [
    {
      id: '1',
      text: "hi! what's up?",
      sender: 'assistant',
      timestamp: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
    }
  ];

  // Use the chat hook
  const { messages, isLoading, error, sendMessage, addAssistantMessage, clearError } = useChat(initialMessages);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Get envelope bounds for snap point calculation
  const getEnvelopeBounds = () => {
    const envelopeTop = ANIMATION_CONSTANTS.CARD_CONTAINER_HEIGHT; // Envelope starts right after cards
    const snapPointTop = envelopeTop - ANIMATION_CONSTANTS.SNAP_POINT_PADDING;
    
    return {
      snapPointTop,
      envelopeTop,
    };
  };

  // Check if a point is past the snap point
  const isPastSnapPoint = useCallback((y: number) => {
    const { snapPointTop } = getEnvelopeBounds();
    return y > snapPointTop;
  }, []);

  // Check if a point is within the actual envelope body geometry
  const isInEnvelopeBody = useCallback((x: number, y: number) => {
    const { envelopeTop } = getEnvelopeBounds();
    
    // Must be below envelope top
    if (y <= envelopeTop) return false;
    
    // Get envelope container bounds (600px max-width, centered)
    const envelopeWidth = Math.min(ANIMATION_CONSTANTS.ENVELOPE_MAX_WIDTH, state.viewportWidth);
    const envelopeLeft = (state.viewportWidth - envelopeWidth) / 2;
    const envelopeRight = envelopeLeft + envelopeWidth;
    
    // Check if within envelope horizontal bounds
    if (x < envelopeLeft || x > envelopeRight) return false;
    
    // Check if within envelope body height
    const envelopeBodyHeight = ANIMATION_CONSTANTS.ENVELOPE_BODY_HEIGHT;
    const envelopeBottom = envelopeTop + envelopeBodyHeight;
    if (y > envelopeBottom) return false;
    
    return true;
  }, [state.viewportWidth]);

  // Start the fade out and reappear sequence for a card
  const startCardFadeOutSequence = (cardId: string) => {
    // Start fade out immediately
    dispatch({
      type: 'UPDATE_DRAG_STATE',
      updates: {
        isFadingOut: true,
        draggedCardId: cardId
      }
    });
    
    // After fade out completes, trigger message and reset state
    setTimeout(() => {
      const contextualMessage = getCardPreviewMessage(cardId);
      const cardData_item = cardData.find(card => card.id === cardId);
      const cardImage = cardData_item?.image;
      handleSendMessage(contextualMessage, cardImage, cardId);
      
      // Hide the card permanently
      dispatch({ type: 'HIDE_CARD', cardId });
      
      dispatch({ type: 'RESET_DRAG_STATE' });
      
      // After a delay, make the card reappear with animation
      setTimeout(() => {
        dispatch({ type: 'SHOW_CARD', cardId });
        dispatch({ type: 'SET_REAPPEARING_CARD', cardId, isReappearing: true });
        
        // After the initial bounce, scale back to normal
        setTimeout(() => {
          // This will trigger the scale to go back to 1 from 1.05
          dispatch({ type: 'SET_REAPPEARING_CARD', cardId, isReappearing: false });
        }, ANIMATION_CONSTANTS.BOUNCE_DURATION); // Duration for fade-in + bounce animation
      }, ANIMATION_CONSTANTS.REAPPEAR_DELAY); // Wait before reappearing
    }, ANIMATION_CONSTANTS.FADE_OUT_DURATION); // Fade out duration
  };

  // Pull card into drop zone with smooth animation
  const pullCardIntoDropZone = (cardId: string) => {
    // Calculate target position relative to card container center
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const targetX = 0; // Center horizontally relative to card container
    const targetY = 450; // Fixed distance down from card container (relative to envelope position)
    
    // Set state to indicate we're pulling the card
    dispatch({
      type: 'UPDATE_DRAG_STATE',
      updates: {
        isPullingToDropZone: true,
        pullTargetX: targetX,
        pullTargetY: targetY
      }
    });
    
    // After pull animation, start the fade out sequence
    setTimeout(() => {
      dispatch({
        type: 'UPDATE_DRAG_STATE',
        updates: { isPullingToDropZone: false }
      });
      startCardFadeOutSequence(cardId);
    }, ANIMATION_CONSTANTS.PULL_ANIMATION_DURATION); // Match pull animation duration
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
      dispatch({ type: 'SET_VIEWPORT_WIDTH', width: window.innerWidth });
    };
    
    // Set initial width
    updateViewportWidth();
    
    // Add resize listener
    window.addEventListener('resize', updateViewportWidth);
    
    return () => {
      window.removeEventListener('resize', updateViewportWidth);
    };
  }, []);

  // Trigger card fade-in animation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasLoadedCards(true);
    }); 
    
    return () => clearTimeout(timer);
  }, []);

  // Handle card interaction to bring to front
  const handleCardInteraction = (cardId: string) => {
    dispatch({ type: 'UPDATE_PICKED_ORDER', cardId });
    
    // Call the parent's onCardClick handler
    onCardClick?.(cardId);
  };

  // Drag handlers
  const handleDragStart = (cardId: string, tapRotation: number) => {
    dispatch({
      type: 'UPDATE_DRAG_STATE',
      updates: {
        isDragging: true,
        draggedCardId: cardId,
        isPastSnapPoint: false,
        isOverDropZone: false,
        tapRotation: tapRotation,
      }
    });
  };

  const handleDragEnd = (cardId: string, droppedOnEnvelope: boolean) => {
    if (droppedOnEnvelope) {
      // Card dropped directly in envelope - start fade out animation immediately
      startCardFadeOutSequence(cardId);
      return; // Don't reset drag state yet, let the animation handle it
    } else if (state.dragState.isPastSnapPoint && !droppedOnEnvelope) {
      // Card is in snap zone but not drop zone - pull it into the drop zone
      pullCardIntoDropZone(cardId);
      return; // Don't reset drag state yet, let the animation handle it
    }
    
    dispatch({ type: 'RESET_DRAG_STATE' });
  };



  // Throttled drag handler for better performance
  const dragThrottleRef = useRef<NodeJS.Timeout | null>(null);
  const handleDrag = useCallback((_cardId: string, info: { point: { x: number; y: number } }) => {
    // Clear previous throttle
    if (dragThrottleRef.current) {
      clearTimeout(dragThrottleRef.current);
    }
    
    // Throttle drag calculations for better performance
    dragThrottleRef.current = setTimeout(() => {
      const cardCenterX = info.point.x;
      const cardCenterY = info.point.y;
      
      const pastSnapPoint = isPastSnapPoint(cardCenterY);
      const inEnvelopeBody = isInEnvelopeBody(cardCenterX, cardCenterY);
      
      // Only update state if values actually changed to prevent unnecessary re-renders
      if (state.dragState.isPastSnapPoint !== pastSnapPoint || state.dragState.isOverDropZone !== inEnvelopeBody) {
        dispatch({
          type: 'UPDATE_DRAG_STATE',
          updates: {
            isPastSnapPoint: pastSnapPoint,
            isOverDropZone: inEnvelopeBody
          }
        });
      }
    }, ANIMATION_CONSTANTS.DRAG_THROTTLE_MS); // ~60fps throttling
  }, [isInEnvelopeBody, isPastSnapPoint, state.dragState.isOverDropZone, state.dragState.isPastSnapPoint]);



  const handleSendMessage = useCallback(async (messageText?: string, cardImage?: string, cardId?: string) => {
    const text = messageText || state.newMessage.trim();
    if (text === '') return;

    // Clear error if any
    if (error) {
      clearError();
    }

    // Clear input immediately if not from card interaction
    if (!messageText) {
      dispatch({ type: 'SET_NEW_MESSAGE', message: '' });
      
      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = '20px';
      }
    }

    // Send message using the chat hook
    await sendMessage(text, cardImage, cardId);
  }, [state.newMessage, error, clearError, sendMessage]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };



  // Get static position for each card
  const getCardPosition = (index: number, cardId: string) => {
    const position = CARD_SCATTERED_POSITIONS[index];
    
    // Determine z-index based on picked order
    const pickedIndex = state.pickedCardsOrder.indexOf(cardId);
    
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
      <motion.div 
        ref={containerRef}
        className="portfolio-cards-container"
        role="region"
        aria-label="Interactive portfolio cards"
        initial={{
          opacity: 0,
          filter: "blur(8px)"
        }}
        animate={hasLoadedCards ? {
          opacity: 1,
          filter: "blur(0px)",
          transition: {
            duration: 0.5,
            ease: "easeOut",
            scale: {
              type: "spring",
              stiffness: 200,
              damping: 25,
              mass: 1.2
            }
          }
        } : {
          opacity: 0,
          filter: "blur(8px)",
        }}
      >
        {cardData.map((card, index) => {
          const position = getCardPosition(index, card.id);
          const isTapped = state.tappedCard === card.id;
          const isDraggingThis = state.dragState.isDragging && state.dragState.draggedCardId === card.id;
          const isPullingThis = state.dragState.isPullingToDropZone && state.dragState.draggedCardId === card.id;
          const isFadingOutThis = state.dragState.isFadingOut && state.dragState.draggedCardId === card.id;
          const isHidden = state.hiddenCards.has(card.id);
          const isReappearing = state.reappearingCards.has(card.id);
          // Use stored rotation if it exists, otherwise use base rotation
          const currentRotation = state.cardRotations[card.id] ?? position.rotate;
          
          // Don't render hidden cards
          if (isHidden) {
            return null;
          }
          
          return (
            <motion.div
              key={card.id}
              data-card-id={card.id}
              className="draggable-card"
              style={{
                zIndex: position.zIndex,
                transformOrigin: state.cardTransformOrigins[card.id] || 'center center',
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
                x: state.dragState.pullTargetX,
                y: state.dragState.pullTargetY,
                rotate: currentRotation,
                scale: isDraggingThis && state.dragState.isPastSnapPoint ? 0.7 : (isTapped ? 1.08 : 1),
                opacity: 0
              } : isPullingThis ? {
                x: state.dragState.pullTargetX,
                y: state.dragState.pullTargetY,
                rotate: currentRotation,
                scale: isDraggingThis && state.dragState.isPastSnapPoint ? 0.7 : (isTapped ? 1.08 : 1),
                opacity: 1
              } : {
                rotate: currentRotation,
                scale: isDraggingThis && state.dragState.isPastSnapPoint ? 0.7 : (isTapped ? 1.08 : 1)
              }}
              drag={!isPullingThis && !isMobile}
              dragMomentum={false}
              dragElastic={0.1}
              onTapStart={(event, info) => {
                const tapRotation = position.rotate + (Math.random() - 0.5) * 8;
                dispatch({ type: 'SET_TAPPED_CARD', cardId: card.id });
                handleCardInteraction(card.id);
                // Store the rotation immediately for this card
                dispatch({ type: 'SET_CARD_ROTATION', cardId: card.id, rotation: tapRotation });
                dispatch({ type: 'UPDATE_DRAG_STATE', updates: { tapRotation } });
                
                // Calculate transform origin based on cursor position relative to card
                const cardElement = event.target as HTMLElement;
                const cardRect = cardElement.getBoundingClientRect();
                const originX = ((info.point.x - cardRect.left) / cardRect.width) * 100;
                const originY = ((info.point.y - cardRect.top) / cardRect.height) * 100;
                dispatch({ 
                  type: 'SET_CARD_TRANSFORM_ORIGIN', 
                  cardId: card.id, 
                  origin: `${Math.max(0, Math.min(100, originX))}% ${Math.max(0, Math.min(100, originY))}%` 
                });
              }}
              onTap={() => {
                // Handle pure clicks (no drag)
                dispatch({ type: 'SET_TAPPED_CARD', cardId: null });
              }}
              onDragStart={() => {
                dispatch({ type: 'SET_TAPPED_CARD', cardId: card.id });
                handleDragStart(card.id, state.dragState.tapRotation);
              }}
              onDrag={(event, info) => {
                handleDrag(card.id, info);
              }}
              onDragEnd={(_event, info) => {
                dispatch({ type: 'SET_TAPPED_CARD', cardId: null });
                // Check if dropped in actual envelope body geometry
                const droppedInEnvelope = isInEnvelopeBody(info.point.x, info.point.y);
                handleDragEnd(card.id, droppedInEnvelope);
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
                className={`card-container ${
                  isTapped ? 'card-container--tapped' : ''
                }`}
              >
                {/* Image area - fills available space */}
                <div className="card-image-area"
                >
                  {/* Inner border overlay */}
                  <div 
                    className="card-image-border"
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
                  <h3 className="font-detail text-xs font-medium leading-tight text-start card-title-text">
                      {card.title}
                    </h3>
                  </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>


      {/* Envelope section */}
      <div className="pb-28 relative z-[1]">

        {/* Drop zone overlay - shows when card is past snap point */}
        {state.dragState.isDragging && state.dragState.isPastSnapPoint && (
          <div className="absolute flex justify-center items-center inset-0 pointer-events-auto z-[4]">
            <div
              className="envelope-outer-container portfolio-chat"
              style={{
                animation: 'fadeIn 0.5s ease-out',
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)'
              }}
            >
              {/* Animated SVG Border */}
              <svg
                className="envelope-svg-background"
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
                  className="envelope-dash-animation"
                />
              </svg>
              
              {/* Preview message */}
              {state.dragState.draggedCardId && (
                <div 
                  className="envelope-preview-text"
                  style={{
                    textShadow: '0 0px 8px white, 0 0px 24px white'
                  }}
                >
                  {getCardPreviewMessage(state.dragState.draggedCardId!)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Envelope */}
        <div id="talk-to-me" className="flex justify-center items-center">
          <div className="relative w-full max-w-[600px] mx-auto">
            {/* Top Flap */}
            <div className="envelope-top-flap"
             >
            {/* Header */}
              <h2 className="font-mono text-md tracking-wider envelope-header-text">
                TALK <span className="italic">2</span> ME
              </h2>
             </div>
            
            {/* Main Envelope Body */}
            <div
              className="envelope-main-body portfolio-chat"
            >
            {/* Left Panel */}
                 <div className="envelope-left-panel" />
              
              {/* Right Panel */}
              <div className="envelope-right-panel" />
              
              {/* Bottom Panel */}
              <div className="envelope-bottom-panel" />


                    {/* Chat Messages Container */}
            <div className="flex-1 relative z-[2] overflow-hidden rounded-b-[32px]">
              <div className="space-y-1 h-full overflow-y-auto p-4 pb-20 envelope-scrollbar" >
              {messages.map((message, index) => {
                const nextMessage = messages[index + 1];
                const isLastInGroup = !nextMessage || nextMessage.sender !== message.sender;
                const isLastMessage = index === messages.length - 1;

                return (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isLastInGroup={isLastInGroup}
                    showTyping={isLoading && isLastMessage && message.sender === 'assistant'}
                  />
                );
              })}

              {error && (
                <div className="flex items-center justify-center mb-3">
                  <div 
                    className="px-4 py-2 text-xs bg-red-900 text-red-50 rounded-full flex items-center space-x-2 cursor-pointer hover:bg-red-800 transition-colors lowercase"
                    onClick={clearError}
                  >
                    <span>{error}</span> 
                    <span className="text-xs opacity-50">tap to dismiss</span>
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
                {/* Twitter button - hidden on mobile */}
               {!isMobile && (
                 <a
                   href="https://x.com/CherrilynnZ"
                   target="_blank"
                   rel="noopener noreferrer" 
                   className="w-[42px] h-[42px] bg-gray-400 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-[10px] hover:bg-gray-500"
                   style={{
                     backdropFilter: 'blur(10px)'
                   }}
                 >
                   {twitterIcon}
                 </a>
               )}

                  {/* Email button - hidden on mobile */}
                {!isMobile && (
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText('clzhang@berkeley.edu');
                      addAssistantMessage('my email (clzhang@berkeley.edu) is copied to ur clipboard now!');
                    }}
                    className="w-[42px] h-[42px] bg-gray-400 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-[10px] hover:bg-gray-500"
                    style={{
                      backdropFilter: 'blur(10px)'
                    }}
                    title="Copy email address"
                  >
                   {envelopeIcon}
                 </button>
               )}

              {/* Input field container */}
              <div className="flex-1 relative">
                <div className="envelope-input-area"
                  onClick={() => {
                    if (inputRef.current) {
                      inputRef.current.focus();
                    }
                  }}
                  onMouseEnter={() => dispatch({ type: 'SET_INPUT_HOVERED', isHovered: true })}
                  onMouseLeave={() => dispatch({ type: 'SET_INPUT_HOVERED', isHovered: false })}
                >
                  {/* Animated placeholder */}
                  {!state.newMessage && (
                    <div className="input-placeholder">
                      <div className="relative">
                        {/* Original text with wave fade-out */}
                        <div className="whitespace-nowrap">
                          {"Chat with me!".split("").map((char, index) => (
                            <span
                              key={index}
                              className={`placeholder-char-out ${
                                state.isInputHovered ? 'placeholder-char-out--hidden' : ''
                              }`}
                              style={{
                                transitionDelay: state.isInputHovered ? `${index * 10}ms` : '0ms'
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
                              className={`placeholder-char-in ${
                                state.isInputHovered ? 'placeholder-char-in--visible' : ''
                              }`}
                              style={{
                                transitionDelay: state.isInputHovered ? `${100 + (index * 10)}ms` : '0ms'
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
                    value={state.newMessage}
                    onChange={(e) => {
                      dispatch({ type: 'SET_NEW_MESSAGE', message: e.target.value });
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
                    className="chat-textarea"
                    rows={1}
                  />
                  
                  {/* Send button container */}
                  <div className="h-5 overflow-visible flex items-center">
                    <button
                      onClick={() => handleSendMessage()}
                      className={`w-8 h-8 bg-white/20 rounded-full flex items-center justify-center transition-all hover:bg-white/30 ${
                        state.newMessage.trim() && !isLoading ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
                      }`}
                      disabled={!state.newMessage.trim() || isLoading}
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