import CardStack from './CardStack';
import Image from 'next/image';

export default function Hero() {
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
        <div className="text-center">
          <div className="font-detail text-base" style={{ color: 'var(--accentgrey)' }}>
            what i • make
          </div>
        </div>
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
          <CardStack className="mb-16" />
          
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