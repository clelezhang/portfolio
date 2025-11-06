'use client';

import { useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import WorkSection from './components/WorkSection';
import Footer from './components/Footer';

export default function Home() {
  useEffect(() => {
    // Handle hash navigation when page loads
    const hash = window.location.hash;
    if (hash) {
      const sectionId = hash.replace('#', '');
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }, 100);
    }
  }, []);

  return (
    <div className="min-h-screen bg-lightgray font-sans">
      <Header />
      <Hero />
      <WorkSection />
      <Footer />
    </div>
  );
}
