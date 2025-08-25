'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

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
    title: 'my mother’s home town',
    image: '/card-images/lilypad.jpg',
  },
  {
    id: 'friend',
    title: 'my friends',
    image: '/card-images/friend.jpg',
  }
];

interface CardStackProps {
  className?: string;
  onCardClick?: (cardId: string) => void;
  onDragStart?: (cardId: string) => void;
  onDragEnd?: (cardId: string, droppedOnEnvelope: boolean) => void;
}

export default function CardStack({ className = '', onCardClick, onDragStart, onDragEnd }: CardStackProps) {
  const [tappedCard, setTappedCard] = useState<string | null>(null);
  const [pickedCardsOrder, setPickedCardsOrder] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle card interaction to bring to front
  const handleCardInteraction = (cardId: string) => {
    setPickedCardsOrder(prev => {
      const filtered = prev.filter(id => id !== cardId);
      return [...filtered, cardId];
    });
    
    // Call the parent's onCardClick handler
    onCardClick?.(cardId);
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
    
    let zIndex = position.z;
    if (pickedIndex !== -1) {
      // Cards that have been picked get higher z-index based on order
      // More recently picked cards get higher z-index
      zIndex = 50 + pickedIndex + 1;
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
    <div 
      ref={containerRef}
      className={`relative w-full h-[332px] flex items-center justify-center ${className}`}
      style={{ perspective: '1000px' }}
      role="region"
      aria-label="Interactive portfolio cards"
    >
                          {cardData.map((card, index) => {
           const position = getCardPosition(index, card.id);
           const isTapped = tappedCard === card.id;
           
           return (
             <motion.div
               key={card.id}
               className="absolute cursor-grab active:cursor-grabbing focus:outline-none rounded-2xl"
               style={{
                 zIndex: position.zIndex,
               } as React.CSSProperties}
               initial={{
                 x: position.x,
                 y: position.y,
                 rotate: position.rotate,
                 scale: 1,
               }}
               drag
               dragMomentum={false}
               dragElastic={0.1}
               onTapStart={() => {
                 setTappedCard(card.id);
                 handleCardInteraction(card.id);
               }}
               onTap={() => {
                 // Handle pure clicks (no drag)
                 setTappedCard(null);
               }}
                             onDragStart={() => {
                setTappedCard(card.id);
                onDragStart?.(card.id);
              }}
              onDragEnd={(_event, info) => {
                setTappedCard(null);
                // Simple drop zone detection - check if dragged near envelope area
                const dropZoneY = window.innerHeight * 0.6; // Approximate envelope position
                const droppedOnEnvelope = info.point.y > dropZoneY;
                onDragEnd?.(card.id, droppedOnEnvelope);
              }}
               animate={{
                 x: position.x,
                 y: position.y,
                 rotate: position.rotate,
                 scale: 1,
               }}
               transition={{
                 type: 'spring',
                 stiffness: 500,
                 damping: 25,
               }}
               whileTap={{ 
                 scale: 1.08,
                 rotate: position.rotate + (Math.random() - 0.5) * 8,
                 transition: { duration: 0.1 }
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
                    ? '0 4px 48px 0 rgba(47, 53, 87, 0.15), 0 4px 8px 0 rgba(47, 53, 87, 0.05)'
                    : '0 4px 32px 0 rgba(47, 53, 87, 0.10), 0 1px 2px 0 rgba(47, 53, 87, 0.05)',
                  willChange: 'transform', // Hint browser to optimize for animations
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
  );
}
