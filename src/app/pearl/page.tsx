'use client';

import React, { useEffect } from 'react';
import Header from '@/app/components/Header';
import HeroDemo from './components/HeroDemo';
import JournalWithReflectionDemo from './components/JournalWithReflectionDemo';
import WeeklyReflectionDemo from './components/WeeklyReflectionDemo';
import EmotionVisualizationDemo from './components/EmotionVisualizationDemo';
import PearlDemoSection from './components/PearlDemoSection';
import { SideNav } from './components/SideNav';
import './pearl.css';

export default function PearlCaseStudy() {
  // Fix html/body overflow to enable sticky positioning
  useEffect(() => {
    // Add a style tag to override all overflow rules
    const style = document.createElement('style');
    style.id = 'pearl-sticky-fix';
    style.textContent = `
      html, body {
        overflow-x: hidden !important;
        overflow-y: visible !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      const existingStyle = document.getElementById('pearl-sticky-fix');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  return (
    <div className="pearl-case-study min-h-screen">
      <Header />
      
      {/* Hero - Journal Entry Window - Full Width Background */}
      <section className="pearl-hero-section">
        <PearlDemoSection fullWidth>
          <HeroDemo />
        </PearlDemoSection>
      </section>

      {/* Main content with sticky sidebar */}
      <div className="pearl-content-with-sidebar">
        <SideNav />
        
        <div className="pearl-main-column">
          {/* The Problem */}
        <section className="pearl-section" data-section="problem">
          <div className="pearl-content">
            <div className="pearl-text-container">
              <h2 className="pearl-h2">the problem</h2>
              <p className="pearl-p">
                Rates of anxiety and depression among young people have doubled in the last decade. One in five adolescents experience mental health concerns, most without access to support.
              </p>
              <p className="pearl-p">
                Therapy is expensive, inaccessible, and once a week at best. There are many lower cost, more accessible resources, like meditation and journaling, but they require self-initiative and don&apos;t provide feedback. Many people don&apos;t know about mental health, don&apos;t know the questions to ask themselves, and don&apos;t have access to therapy. A journal won&apos;t teach you how to process emotions or notice patterns.
              </p>
              <div className="pearl-quote">
                Can we use recent technological innovations (LLMs) to help people process their emotions and understand themselves easily and intuitively? How?
              </div>
            </div>
          </div>
        </section>

        {/* Outcome */}
        <section className="pearl-section" data-section="outcome">
          <div className="pearl-content">
            <div className="pearl-text-container">
              <h2 className="pearl-h2">outcome</h2>
              <p className="pearl-p-large">
                Over four months, we designed and shipped a journaling tool with AI-powered reflection features and emotion tracking, growing to <span className="pearl-p-emphasis">2K users</span>.
              </p>
            </div>
          </div>
        </section>

        {/* Inline Reflection */}
        <section className="pearl-section" data-section="inline-reflection">
          <div className="pearl-content">
            <PearlDemoSection>
              <JournalWithReflectionDemo />
            </PearlDemoSection>
            <div className="pearl-text-container">
              <h2 className="pearl-h2">inline reflection</h2>
              <p className="pearl-p">
                People don&apos;t look back on journal entries, but they want to. I conducted 38 semi-structured interviews, and surveyed 84 individuals and found that <span className="pearl-p-emphasis">92% of people don&apos;t look back on journal entries, but 82% would like to.</span>
              </p>
              <p className="pearl-p">
                Inline reflection brings reflections into the core journaling experience. We noticed early AI adopters using AI tools like NotebookLM and ChatGPT voice mode to analyze their journal entries or just talk about their days. With inline reflection, we bring the utility of intelligent, personalized feedback to the average user in a more familiar journaling interface.
              </p>
            </div>
          </div>
        </section>

        {/* Weekly Reflection */}
        <section className="pearl-section" data-section="weekly-reflection">
          <div className="pearl-content">
            <div className="pearl-text-container">
              <h2 className="pearl-h2">weekly reflection</h2>
              <p className="pearl-p">
                Your journal reflects on itself, helping you see the bigger picture when you wouldn&apos;t otherwise. Pearl synthesizes your week: recurring themes, emotional patterns, shifts over time.
              </p>
            </div>
            
            <PearlDemoSection>
              <WeeklyReflectionDemo />
            </PearlDemoSection>
            
            <div className="pearl-text-container" style={{ marginTop: '3rem' }}>
              <h3 className="pearl-h3">things you said you&apos;d do</h3>
              <p className="pearl-p">
                In user interviews, users mentioned losing track of small commitments they made to themselves while stream of consciousness journaling. We added a list that pulls these out automatically — &quot;call mom,&quot; &quot;take a real lunch break,&quot; &quot;start the book.&quot;
              </p>
            </div>
          </div>
        </section>

        {/* Emotion Visualization */}
        <section className="pearl-section" data-section="emotion-visualization">
          <div className="pearl-content">
            <div className="pearl-text-container">
              <h2 className="pearl-h2">emotion tagging &amp; visualization</h2>
              <p className="pearl-p">
                It&apos;s hard to keep journaling. We wanted to reinforce the habit with something you could actually see grow. Pearl automatically tags entries with emotions. Just write, and your emotional patterns surface over time.
              </p>
              <h3 className="pearl-h3">emotion graph</h3>
              <p className="pearl-p">
                We built a visualization that maps your emotions over time. Each dot is an entry that you can hover to preview, and click to open.
              </p>
            </div>
            
            <PearlDemoSection>
              <EmotionVisualizationDemo />
            </PearlDemoSection>
            
            <div className="pearl-text-container" style={{ marginTop: '3rem' }}>
              <h3 className="pearl-h3">noodlings on visualizations</h3>
              <p className="pearl-p">
                Users engaged with the weekly reflections and emotion visualizations much less than Inline Reflections, but visualizations performed well in marketing content. This suggests discoverability issues: maybe it&apos;s hard to find and not intuitive to use, but it has potential as a growth mechanism.
              </p>
              <p className="pearl-p">
                In the future, we could surface this more on mobile or create a widget, integrate this into notifications or a weekly email, or make it easier to share with screenshot customization.
              </p>
            </div>
          </div>
        </section>

        {/* Impact */}
        <section className="pearl-section" data-section="impact">
          <div className="pearl-content">
            <div className="pearl-text-container">
              <h2 className="pearl-h2">impact</h2>
              <p className="pearl-p">
                Pearl reached <span className="pearl-p-emphasis">2K users</span> in its first few months, helping <span className="pearl-p-emphasis">62% of surveyed users think more clearly</span>.
              </p>
              
              <div className="pearl-impact-grid">
                <div className="pearl-impact-card">
                  <div className="pearl-impact-number">2K</div>
                  <div className="pearl-impact-label">users in first months</div>
                </div>
                <div className="pearl-impact-card">
                  <div className="pearl-impact-number">62%</div>
                  <div className="pearl-impact-label">report thinking more clearly</div>
                </div>
                <div className="pearl-impact-card">
                  <div className="pearl-impact-number">38</div>
                  <div className="pearl-impact-label">user interviews conducted</div>
                </div>
              </div>
              
              <div className="pearl-testimonial">
                <p className="pearl-testimonial-quote">
                  &quot;Pearl feels like a wise friend helping you find yourself.&quot;
                </p>
                <p className="pearl-testimonial-author">— Pearl user</p>
              </div>
              
              <p className="pearl-p">
                Another user said they&apos;d never shared their journal with anyone before — but Pearl felt different.
              </p>
            </div>
          </div>
        </section>

        {/* Reflection */}
        <section className="pearl-section" data-section="reflection">
          <div className="pearl-content">
            <div className="pearl-text-container">
              <h2 className="pearl-h2">reflection</h2>
              <p className="pearl-p">
                We thought about our users, and how we wanted them to feel, at every step. I cared deeply about our logo, branding our website and social media, letting people login with google, adding soft animations and gradients. I was also deeply aware of all the things that we couldn&apos;t get good enough with the time we had.
              </p>
              <p className="pearl-p">
                With time, I realized that all I could do was pay attention to our users, iterate, and enjoy the process of making something new.
              </p>
              <p className="pearl-p-large" style={{ marginTop: '2rem' }}>
                <span className="pearl-p-emphasis">Designing Pearl taught me that it isn&apos;t about making it perfect (because that&apos;s impossible).</span> It&apos;s about learning quickly to make improvements quickly, being perceptive enough to know which improvements could make things much better, and making someone&apos;s day more fruitful.
              </p>
              <p className="pearl-p" style={{ marginTop: '3rem', fontStyle: 'italic', color: 'var(--color-accentgray)' }}>
                — Thanks for reading, Lele
              </p>
            </div>
          </div>
        </section>

          {/* Spacer */}
          <div style={{ height: '6rem' }} />
        </div>
      </div>
    </div>
  );
}
