'use client';

import InteractivePortfolio from './InteractivePortfolio';
import { useState } from 'react';


export default function Hero() {
  const [activeWord, setActiveWord] = useState('make');
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
      setTimeout(() => {
        setActiveWord(newWord);
        setAnimationKey(prev => prev + 1);
      }, 150);
    }
  };


  return (
    <section className="pt-54 sm:pt-64">
      <div className="max-w-6xl px-4  mx-auto">
        {/* Intro text */}
        <div className="max-w-[600px] mx-auto text-start mb-16">
          <div className="text-base leading-relaxed font-detail text-gray-900">
            <p>hello there! I&apos;m lele.</p>
            <p className="mt-3">I&apos;m a designer in pursuit of aesthetics and function. I hope to create a 
            world of seeing, learning, thinking, building, and loving.</p>
          </div>
        </div>
        
        {/* Section title */}
        <div className="flex justify-center">
          <div className="font-detail text-base flex items-center text-accentgray">
            <span>what i •&nbsp;</span>
            <span 
              key={animationKey}
              className="relative inline-block text-left min-w-12"
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
        className="w-full px-4 relative"
        style={{
          background: 'linear-gradient(rgba(154, 156, 184, 0) 0%,rgba(154, 156, 184, 0.85) 75%, rgba(98, 113, 140, 0.9) 98%, #4C5E7C 100%)'
        }}
      >
        {/* Blur overlay */}
        <div className="absolute inset-0 backdrop-blur-md pointer-events-none"></div>
        <div className="max-w-6xl mx-auto relative">
          <InteractivePortfolio onCardClick={handleCardClick} />
        </div>
      </div>
          </section>
  );
}