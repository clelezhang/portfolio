import CardStack from './CardStack';
import Image from 'next/image';

export default function Hero() {
  return (
    <section className="px-4 pt-64 pb-16">
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
        
        {/* Card stack */}
        <CardStack className="mb-16" />
        
        {/* Practice Card - You can modify this! */}

      </div>
    </section>
  );
}