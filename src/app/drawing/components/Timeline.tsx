'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { stages } from '../stages';
import StageCard from './StageCard';
import ProgressBar from './ProgressBar';

export default function Timeline() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollToIndex = useCallback((index: number) => {
    const container = scrollRef.current;
    if (!container) return;
    const cards = container.querySelectorAll('.stage-card');
    const card = cards[index] as HTMLElement;
    if (!card) return;
    const containerRect = container.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const scrollLeft = card.offsetLeft - (containerRect.width - cardRect.width) / 2;
    container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    setActiveIndex(index);
  }, []);

  const handlePrev = useCallback(() => {
    scrollToIndex(Math.max(0, activeIndex - 1));
  }, [activeIndex, scrollToIndex]);

  const handleNext = useCallback(() => {
    scrollToIndex(Math.min(stages.length - 1, activeIndex + 1));
  }, [activeIndex, scrollToIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext]);

  // Update active index on scroll
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const handleScroll = () => {
      const cards = container.querySelectorAll('.stage-card');
      const containerCenter = container.scrollLeft + container.clientWidth / 2;
      let closestIndex = 0;
      let closestDistance = Infinity;
      cards.forEach((card, i) => {
        const el = card as HTMLElement;
        const cardCenter = el.offsetLeft + el.clientWidth / 2;
        const distance = Math.abs(containerCenter - cardCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = i;
        }
      });
      setActiveIndex(closestIndex);
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const currentStage = stages[activeIndex];

  return (
    <div className="timeline">
      {/* Top: Title + Description */}
      <div className="timeline-header">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStage.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <h2 className="timeline-title">{currentStage.title}</h2>
            <p className="timeline-description">{currentStage.description}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Middle: Carousel */}
      <div className="timeline-carousel" ref={scrollRef}>
        {stages.map((stage, i) => (
          <StageCard
            key={stage.id}
            stage={stage}
            isActive={i === activeIndex}
            isNeighbor={Math.abs(i - activeIndex) === 1}
            onClick={() => scrollToIndex(i)}
          />
        ))}
      </div>

      {/* Bottom: Navigation */}
      <ProgressBar
        total={stages.length}
        current={activeIndex}
        onNavigate={scrollToIndex}
        onPrev={handlePrev}
        onNext={handleNext}
      />
    </div>
  );
}
