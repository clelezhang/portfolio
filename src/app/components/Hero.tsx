'use client';

import CardStack from './CardStack';
import Image from 'next/image';
import { useState } from 'react';

export default function Hero() {
  const [activeWord, setActiveWord] = useState('make');
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

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

  return (
    <section className="pt-64 pb-16">
      <div className="max-w-6xl mx-auto">
        {/* Intro text */}
        <div className="max-w-[600px] mx-auto text-start mb-16">
          <div className="text-base leading-relaxed font-detail" style={{ color: 'var(--grey-900)' }}>
            <p>hello there! I&apos;m lele.</p>
            <p className="mt-3">I&apos;m a designer in meandering pursuit of aesthetics and function. I hope to create a 
            world of seeing, learning, thinking, building, and loving.</p>
          </div>
        </div>
        
        {/* Section title */}
        <div className="flex justify-center">
          <div className="font-detail text-base flex items-center" style={{ color: 'var(--accentgrey)' }}>
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
        
        <style jsx>{`
          @keyframes fadeInLetter {
            0% {
              opacity: 0;
              filter: blur(1px);
            }
            100% {
              opacity: 1;
              filter: blur(0px);
            }
          }
        `}</style>
      </div>
      
      {/* Full-width card stack and envelope container with gradient background */}
      <div 
        className="w-full"
        style={{
          background: 'linear-gradient(rgba(154, 156, 184, 0) 0%,  #9A9CB8 41%, #85768C 80%, #62718C 92%, #4C5E7C 100%)'
        }}
      >
        <div className="max-w-6xl mx-auto">
          {/* Card stack */}
          <CardStack className="mb-16" onCardClick={handleCardClick} />
          
          {/* Empty section for envelope container */}
          <div className="mt-16">
            <div className="h-96 flex items-center justify-center">
              {/* Envelope container will go here */}
            </div>
          </div>
        </div>
      </div>
          </section>
  );
}