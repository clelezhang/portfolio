'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import Footer from '@/app/components/Footer';
import HeroDemo from './components/HeroDemo';
import JournalWithReflectionDemo from './components/JournalWithReflectionDemo';
import ReflectionsDashboardDemo from './components/ReflectionsDashboardDemo';
import PearlDemoSection from './components/PearlDemoSection';
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
      {/* Hero - Journal Entry Window - Full Width Background */}
      <section className="pearl-hero-section">
        <PearlDemoSection fullWidth>
          <HeroDemo />
        </PearlDemoSection>
      </section>

      {/* Main content */}
      <div className="pearl-content-with-sidebar">
        <div className="pearl-main-column">
          {/* Project Info */}
          <section className="pearl-section pearl-project-info">
            <div className="pearl-content">
              <div className="pearl-text-container">
                <div className="pearl-info-grid">
                  <span className="pearl-info-item">co-founder, product, design</span>
                  <span className="pearl-info-separator">•</span>
                  <span className="pearl-info-item">aug-dec 2024</span>
                </div>
              </div>
            </div>
          </section>

          {/* The Problem */}
        <section className="pearl-section" data-section="problem">
          <div className="pearl-content">
            <div className="pearl-text-container">
              <h2 className="pearl-h2">the problem</h2>
              <p className="pearl-p">
                Rates of anxiety and depression among young people have doubled in the last decade.
                One in five adolescents experience mental health concerns, most without access to support.
                {' '}
                <a
                  href="https://www.pewresearch.org/internet/2025/04/22/teens-social-media-and-mental-health/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: 'var(--color-black)',
                    textDecoration: 'none',
                    fontFamily: 'var(--font-compagnon), monospace',
                    letterSpacing: '.05em',
                    transition: 'color 200ms ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accentgray)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-black)'; }}
                >
                  [2]
                </a>{' '}
              </p>
              <p className="pearl-p">
                Therapy is expensive, inaccessible, and once a week at best. Lower cost, more accessible resources, like journaling, require self-initiative and don’t provide feedback. A blank page doesn't teach you how to process emotions or notice patterns.
              </p>
              <div className="pearl-research-callout">
                <div className="pearl-quote-header">
                  We asked
                </div>
                <div className="pearl-quote">
                  Can we use recent advancements like LLMs to help people reflect on themselves and process their emotions easily and intuitively? If so, how?
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Outcome */}
        <section className="pearl-section" data-section="outcome">
          <div className="pearl-content">
            <div className="pearl-text-container">
              <h2 className="pearl-h2">the outcome</h2>
              <p className="pearl-p-large">
                Over four months, we designed and shipped a journaling tool with AI-powered reflection features and emotion tracking, growing to 2K users. I focused on creating an experience that guided people in reflecting deeper with gentle and intuitive interactions and visuals. 
              </p>
            </div>
          </div>
        </section>

        {/* Inline Reflection */}
        <section className="pearl-section" data-section="inline-reflection">
          <div className="pearl-content">
            <div className="pearl-text-container">
              <PearlDemoSection>
                <JournalWithReflectionDemo />
              </PearlDemoSection>
              <h2 className="pearl-h2">inline reflection</h2>
              <p className="pearl-p">
                People don&apos;t look back on journal entries, but they want to. 
                              </p>
              <p className="pearl-p">

                I conducted 38 semi-structured interviews and surveyed 84 individuals and found that <span className="pearl-p-emphasis">92% of people don&apos;t look back on journal entries, but 82% would like to.</span>
              </p>
              <div style={{ width: '80%', margin: '0 auto', position: 'relative' }}>
                <Image src="/work-images/datav.webp" alt="Data visualization" width={1200} height={800} style={{ width: '100%', height: 'auto' }} loading="lazy" />
              </div>
              <p className="pearl-caption" style={{ fontSize: '0.75rem', color: 'var(--color-accentgray)', textAlign: 'right', marginBottom: '2rem' }}>Interview materials from 38 user interviews.</p>
              <p className="pearl-p">
                Inline reflection brings reflections into the core journaling experience.
                              </p>
                                            <p className="pearl-p">

                We noticed early AI adopters using AI tools like NotebookLM and ChatGPT voice mode to analyze their journal entries or just talk about their days. With inline reflection, we bring the utility of intelligent, personalized feedback to the average user in a more familiar journaling interface.
              </p>
              <div style={{ width: '80%', margin: '0 auto', position: 'relative' }}>
                <Image src="/work-images/competitive.webp" alt="Competitive analysis" width={1200} height={800} style={{ width: '100%', height: 'auto' }} loading="lazy" />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-accentgray)', textAlign: 'right', marginTop: '0.75rem', marginBottom: '6rem' }}>Competitive analysis of journaling, chat, and visualization interfaces</p>

            </div>
          </div>
        </section>

        {/* Weekly Reflection */}
        <section className="pearl-section" data-section="weekly-reflection">
          <div className="pearl-content">
            <div className="pearl-text-container">
            <PearlDemoSection>
              <ReflectionsDashboardDemo />
            </PearlDemoSection>
              <h2 className="pearl-h2">weekly reflection</h2>
              <p className="pearl-p">
                Your journal reflects on itself, helping you see the bigger picture when you wouldn&apos;t otherwise. Pearl synthesizes your week: recurring themes, emotional patterns, shifts over time.
              </p>
              <h3 className="pearl-h3">things you said you&apos;d do</h3>
              <p className="pearl-p">
                In user interviews, users mentioned losing track of small commitments they made to themselves while stream of consciousness journaling. We added a list that pulls these out automatically (message grandma, buy bananas, start reading more).
              </p>
            </div>
          </div>
        </section>

        {/* Emotion Tagging & Visualization */}
        <section className="pearl-section" data-section="emotion-visualization">
          <div className="pearl-content">
            <div className="pearl-text-container">
              <PearlDemoSection>
                <ReflectionsDashboardDemo variant="alt" />
              </PearlDemoSection>
              <h2 className="pearl-h2">emotion tagging &amp; visualization</h2>
              <p className="pearl-p">
                It&apos;s hard to keep journaling. We wanted to reinforce the habit with something you could actually see grow. Pearl automatically tags entries with emotions so that as you write, your emotional patterns surface over time.
              </p>
              <h3 className="pearl-h3">emotion graph</h3>
              <p className="pearl-p">
                We built a visualization that maps your emotions over time. Each dot is an entry that you can hover to preview, and click to open.
              </p>
              
              <h3 className="pearl-h3">noodlings on visualizations</h3>
              <p className="pearl-p">
                Users engaged with the weekly reflections and emotion visualizations much less than Inline Reflections, but visualizations performed well in marketing content. This suggests discoverability issues: maybe it&apos;s hard to find and not intuitive to use, but it has potential as a growth mechanism.
              </p>
              <p className="pearl-p">
                In the future, we could surface this more on mobile or create a widget, integrate this into notifications or a weekly email, or make it easier to share with screenshot customization.
              </p>
              <div style={{ width: '100%', margin: '1.5rem auto 0', position: 'relative' }}>
                <Image src="/work-images/lofi.webp" alt="Low-fidelity wireframes" width={1600} height={900} style={{ width: '100%', height: 'auto' }} loading="lazy" />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-accentgray)', textAlign: 'right', marginTop: '0.5rem', marginBottom: '6rem' }}>Early wireframes exploring widget and notification concepts</p>
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
              <div style={{ width: '100%', margin: '.5rem auto 0', position: 'relative' }}>
                <Image src="/work-images/feedback.webp" alt="User feedback" width={1600} height={900} style={{ width: '100%', height: 'auto' }} loading="lazy" />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-accentgray)', textAlign: 'right', marginTop: '-0.75rem', marginBottom: '1.5rem' }}>Feedback from Pearl users</p>
              <p className="pearl-p">
                A user mentioned pearl feeling like "a wise friend helping you find yourself." Another said they'd never shared their journal with anyone before, but Pearl felt different.
              </p>
            </div>
          </div>
        </section>

        {/* Reflection */}
        <section className="pearl-section" data-section="reflection" style={{ marginTop: '5rem' }}>
          <div className="pearl-content">
            <div className="pearl-text-container">
              <h2 className="pearl-h2">reflection</h2>
              <p className="pearl-p">
                We thought about our users, and how we wanted them to feel, at every step. I cared deeply about our logo, branding our website and social media, letting people login with google, adding soft animations and gradients. I was also deeply aware of all the things that we couldn&apos;t get good enough with the time we had.
              </p>
              <p className="pearl-p">
                With time, I realized that all I could do was pay attention to our users, iterate, and enjoy the process of making something new.
              </p>
              <p className="pearl-p-large">
                <span className="pearl-p-emphasis">Designing Pearl taught me that it isn&apos;t about making it perfect (because that&apos;s impossible).</span> It&apos;s about learning quickly to make improvements quickly, being perceptive enough to know which improvements could make things much better, and making someone&apos;s day more fruitful.
              </p>
            </div>
          </div>
        </section>
        </div>
      </div>

      <Footer />
    </div>
  );
}
