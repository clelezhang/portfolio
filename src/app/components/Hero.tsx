'use client';

import CardStack from './CardStack';
import Envelope from './Envelope';
import Image from 'next/image';
import { useState } from 'react';

interface DragState {
  isDragging: boolean;
  draggedCardId: string | null;
  isOverDropZone: boolean;
}

export default function Hero() {
  const [activeWord, setActiveWord] = useState('make');
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  
  // Drag state management
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedCardId: null,
    isOverDropZone: false,
  });

  // Drag handlers
  const handleDragStart = (cardId: string) => {
    setDragState({
      isDragging: true,
      draggedCardId: cardId,
      isOverDropZone: false,
    });
  };

  const handleDragEnd = (cardId: string, droppedOnEnvelope: boolean) => {
    if (droppedOnEnvelope) {
      // Handle the drop - this will be implemented in Phase 2
      console.log(`Card ${cardId} dropped on envelope!`);
    }
    
    setDragState({
      isDragging: false,
      draggedCardId: null,
      isOverDropZone: false,
    });
  };

  const handleDropZoneEnter = () => {
    setDragState(prev => ({ ...prev, isOverDropZone: true }));
  };

  const handleDropZoneLeave = () => {
    setDragState(prev => ({ ...prev, isOverDropZone: false }));
  };

  const handleCardClick = (cardId: string) => {
    let newWord = 'make';
    
    // Apps, house, apple = what i like
    if (['apps', 'house', 'apple'].includes(cardId)) {
      newWord = 'like';
    }
    // Cyanotype, journal, charcuterie = what i make
    else if (['cyanotype', 'journal', 'charcuterie'].includes(cardId)) {
      newWord = 'make';
    }
    // Family, lilypad, friend = what i love
    else if (['family', 'lilypad', 'friend'].includes(cardId)) {
      newWord = 'love';
    }

    if (newWord !== activeWord) {
      setIsAnimating(true);
      setTimeout(() => {
        setActiveWord(newWord);
        setAnimationKey(prev => prev + 1);
        setTimeout(() => setIsAnimating(false), newWord.length * 30 + 200);
      }, 150);
    }
  };

  // Get preview message for dragged card
  const getPreviewMessage = (cardId: string) => {
    const messages: { [key: string]: string } = {
      apps: "Tell me about the software you've built!",
      house: "I'd love to hear about designing for someone special",
      apple: "What's the story behind this visual pun?",
      cyanotype: "How did you get into cyanotype photography?",
      journal: "This reflective journal sounds fascinating!",
      charcuterie: "Making food for friends is so thoughtful",
      family: "Family is everything! Tell me about yours",
      lilypad: "What's special about your mother's hometown?",
      friend: "Your friendships look so meaningful"
    };
    return messages[cardId] || "Tell me more about this!";
  };

  return (
    <section className="pt-64 pb-16">
      <div className="max-w-6xl mx-auto">
        {/* Intro text */}
        <div className="max-w-[600px] mx-auto text-start mb-16">
          <div className="text-base leading-relaxed font-detail" style={{ color: 'var(--gray-900)' }}>
            <p>hello there! I&apos;m lele.</p>
            <p className="mt-3">I&apos;m a designer in meandering pursuit of aesthetics and function. I hope to create a 
            world of seeing, learning, thinking, building, and loving.</p>
          </div>
        </div>
        
        {/* Section title */}
        <div className="flex justify-center">
          <div className="font-detail text-base flex items-center" style={{ color: 'var(--accentgray)' }}>
            <span>what i •&nbsp;</span>
            <span 
              key={animationKey}
              className="relative inline-block text-left"
              style={{ 
                minWidth: '3rem'
              }}
            >
              {activeWord.split('').map((letter, index) => (
                <span
                  key={`${animationKey}-${index}`}
                  className="inline-block"
                  style={{
                    opacity: 0,
                    filter: 'blur(1px)',
                    animation: `fadeInLetter 0.2s ease-out forwards`,
                    animationDelay: `${index * 0.03}s`
                  }}
                >
                  {letter}
                </span>
              ))}
            </span>
          </div>
        </div>
        

      </div>
      
      {/* Full-width card stack and envelope container with gradient background */}
      <div 
        className="w-full"
        style={{
          background: 'linear-gradient(rgba(154, 156, 184, 0) 0%,  #9A9CB8 55%, #85768C 80%, #62718C 92%, #4C5E7C 100%)'
        }}
      >
        <div className="max-w-6xl mx-auto relative">
          {/* Card stack */}
          <div className="relative z-50">
            <CardStack 
              onCardClick={handleCardClick}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
          </div>
          
          {/* Preview message */}
          {dragState.isDragging && dragState.isOverDropZone && dragState.draggedCardId && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none">
              <div 
                className="px-4 py-2 rounded-full text-sm font-detail text-white/90 backdrop-blur-sm"
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  animation: 'fadeInScale 0.3s ease-out'
                }}
              >
                "{getPreviewMessage(dragState.draggedCardId)}"
              </div>
            </div>
          )}
          
          {/* Envelope container */}
          <div className="pb-28 relative z-10">
            {/* Drop zone overlay */}
            {dragState.isDragging && (
              <div className="absolute flex justify-center items-center inset-0 pointer-events-auto z-20">
                <div 
                  className="relative w-full max-w-[585px] h-[360px] mx-auto"
                  onMouseEnter={handleDropZoneEnter}
                  onMouseLeave={handleDropZoneLeave}
                  style={{
                    borderRadius: '24px',
                    backdropFilter: 'blur(2px)',
                    WebkitBackdropFilter: 'blur(2px)',
                    animation: 'fadeIn 0.3s ease-out'
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
                      fill="rgba(255, 255, 255, 0.3)"
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
                </div>
              </div>
            )}
            
            <Envelope />
          </div>
        </div>
      </div>
          </section>
  );
}