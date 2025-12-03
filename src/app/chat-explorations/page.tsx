'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import DemoSection from '@/app/components/DemoSection';
import { Play } from 'lucide-react';
import { SideNav } from './components/SideNav';
import { ExplorationInput } from './components/ExplorationInput';
import { TextContainer } from './components/TextContainer';
import { useResponsive } from './hooks/useResponsive';
import { DemoFocusProvider } from './contexts/DemoFocusContext';
import { styles, LAYOUT } from './constants/styles';
import './blog-demos.css';

// Loading fallback for all demos
const DemoLoadingFallback = () => (
  <div style={{
    width: '100%',
    height: '600px',
    background: 'var(--color-off-white)',
    animation: 'pulse 1.5s ease-in-out infinite'
  }} />
);

// Inline video demo with poster loading state
const InlineVideoDemo = ({ videoSrc, posterSrc, aspectRatio = '16 / 9' }: { videoSrc: string; posterSrc: string; aspectRatio?: string }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div style={{
      width: '100%',
      maxWidth: LAYOUT.TEXT_MAX_WIDTH,
      margin: '1rem auto',
      overflow: 'hidden',
      position: 'relative',
      aspectRatio,
    }}>
      <img
        src={posterSrc}
        alt="Loading preview"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '102%',
          height: '100%',
          objectFit: 'cover',
          transform: 'scale(1.02)',
          marginRight: '-1%',
          opacity: isLoaded ? 0 : 1,
          transition: 'opacity 0.3s ease-out',
          pointerEvents: 'none',
        }}
      />
      <video
        autoPlay
        loop
        muted
        playsInline
        onLoadedData={() => setIsLoaded(true)}
        style={{
          width: '102%',
          height: 'auto',
          display: 'block',
          transform: 'scale(1.02)',
          marginRight: '-1%',
        }}
      >
        <source src={videoSrc} type="video/mp4" />
      </video>
    </div>
  );
};

// Dynamically import demos for code splitting
const CommentsDemo = dynamic(
  () => import('./components/demos/CommentsDemo'),
  { loading: () => <DemoLoadingFallback /> }
);

const EditingDemo = dynamic(
  () => import('./components/demos/EditingDemo'),
  { loading: () => <DemoLoadingFallback /> }
);

const IndexDemo = dynamic(
  () => import('./components/demos/IndexDemo'),
  { loading: () => <DemoLoadingFallback /> }
);

const QueueDemo = dynamic(
  () => import('./components/demos/QueueDemo'),
  { loading: () => <DemoLoadingFallback /> }
);

const SwipeDemo = dynamic(
  () => import('./components/demos/SwipeDemo'),
  { loading: () => <DemoLoadingFallback /> }
);

const DigDeeperDemo = dynamic(
  () => import('./components/demos/DigDeeperDemo'),
  { loading: () => <DemoLoadingFallback /> }
);

// Prefetch functions for each demo
const prefetchCommentsDemo = () => import('./components/demos/CommentsDemo');
const prefetchEditingDemo = () => import('./components/demos/EditingDemo');
const prefetchIndexDemo = () => import('./components/demos/IndexDemo');
const prefetchQueueDemo = () => import('./components/demos/QueueDemo');
const prefetchSwipeDemo = () => import('./components/demos/SwipeDemo');
const prefetchDigDeeperDemo = () => import('./components/demos/DigDeeperDemo');

function ChatExplorationsContent() {
  const [digDeeperTopic, setDigDeeperTopic] = useState<string | undefined>();
  const [swipeTopic, setSwipeTopic] = useState<string | undefined>();
  const [triggerQueueDemo, setTriggerQueueDemo] = useState<boolean>(false);
  const [isDemosFocused, setIsDemosFocused] = useState<boolean>(true);
  const queueDemoRef = useRef<HTMLDivElement>(null);

  const { isMobile } = useResponsive();

  const handleDigDeeperSubmit = useCallback((topic: string) => {
    setDigDeeperTopic(topic);
  }, []);

  const handleSwipeSubmit = useCallback((topic: string) => {
    setSwipeTopic(topic);
  }, []);

  const handlePlayQueueDemo = useCallback(() => {
    // Scroll to demo first
    queueDemoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Trigger demo after scroll completes using requestAnimationFrame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTriggerQueueDemo(true);
      });
    });
  }, []);

  const handleToggleFocus = useCallback(() => {
    setIsDemosFocused(prev => !prev);
  }, []);

  const handleFocusRequest = useCallback(() => {
    setIsDemosFocused(true);
  }, []);

  // Prefetch demos on idle to improve performance
  useEffect(() => {
    // Use requestIdleCallback if available, otherwise setTimeout
    const prefetchOnIdle = () => {
      if ('requestIdleCallback' in window) {
        // Prefetch in order of likely user interaction
        requestIdleCallback(() => prefetchCommentsDemo(), { timeout: 2000 });
        requestIdleCallback(() => prefetchEditingDemo(), { timeout: 3000 });
        requestIdleCallback(() => prefetchIndexDemo(), { timeout: 4000 });
        requestIdleCallback(() => prefetchQueueDemo(), { timeout: 5000 });
        requestIdleCallback(() => prefetchDigDeeperDemo(), { timeout: 6000 });
        requestIdleCallback(() => prefetchSwipeDemo(), { timeout: 7000 });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(prefetchCommentsDemo, 1000);
        setTimeout(prefetchEditingDemo, 2000);
        setTimeout(prefetchIndexDemo, 3000);
        setTimeout(prefetchQueueDemo, 4000);
        setTimeout(prefetchDigDeeperDemo, 5000);
        setTimeout(prefetchSwipeDemo, 6000);
      }
    };

    // Start prefetching after initial render
    prefetchOnIdle();
  }, []);

  // Handle circular tab navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const headings = Array.from(document.querySelectorAll('.blog-demos h1, .blog-demos h2, .blog-demos h3')) as HTMLElement[];
      const activeElement = document.activeElement as HTMLElement;
      const currentIndex = headings.indexOf(activeElement);

      if (currentIndex === -1) return;

      if (!e.shiftKey && currentIndex === headings.length - 1) {
        // Tab on last heading - go to first
        e.preventDefault();
        headings[0]?.focus();
      } else if (e.shiftKey && currentIndex === 0) {
        // Shift+Tab on first heading - go to last
        e.preventDefault();
        headings[headings.length - 1]?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans">
      <SideNav isFocused={isDemosFocused} onToggleFocus={handleToggleFocus} />
      <div
        className="blog-demos"
        style={{
          maxWidth: LAYOUT.MAX_CONTENT_WIDTH,
          margin: '0 auto',
          padding: `${LAYOUT.PAGE_PADDING_TOP} ${LAYOUT.PAGE_PADDING_SIDE} ${LAYOUT.PAGE_PADDING_BOTTOM} ${LAYOUT.PAGE_PADDING_SIDE}`
        }}>
        <article>
        <TextContainer>
          <header style={{ marginBottom: '3rem' }}>
            <h1 style={styles.h1} tabIndex={0}>
              sketches of chat as an interface for thinking
            </h1>
            <p style={styles.date}>
              nov 2025
            </p>
          </header>

          <section style={{ marginBottom: '2.5rem', lineHeight: 1.5 }}>
            <p style={styles.p}>
              I used to want to journal more. The end of every week, month, year marked another failure, another time I didn&apos;t take the time to reflect.
            </p>
            <p style={styles.p}>
              I wanted to journal more so badly that I made <a href="https://info.writewithprl.com/" target="_blank" rel="noopener noreferrer" tabIndex={-1} style={{ color: 'var(--color-black)', textDecoration: 'none', transition: 'color 200ms ease' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-accentgray)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-black)'}>a journal <span style={{ fontFamily: 'var(--font-compagnon), monospace', color: 'var(--color-accentgray)', letterSpacing: '.05em' }}>[1]</span></a>, and I interviewed every friend I could corner about their journaling habits.
              It turns out, most of them didn&apos;t journal either. They didn&apos;t need to. When Chloe was stressed about attending school across the country, she told her roommates about it, a little every day.
            </p>
            <p style={styles.p}>
              <span style={{ fontWeight: 500 }}> Dialogue has always been how we think best. </span>
              Journaling was the wrong form factor. With chat, our tools are conversational, but they&apos;re still catching up to how we think. 
              I believe that there&apos;s still enormous potential for chat interfaces to expand and support our thinking. A small example of this--sometimes I get overwhelmed by the length of a response, or by how I want to explore branching topics, but can&apos;t. 
              I think a lot of people feel this way too.
            </p>
            <p style={styles.p}>
              AI can generate so much useful information to explore (yay!) but it&apos;s too much for my human brain to keep up with, at once (boo).
              I&apos;ve been fiddling with different solutions to this. I didn&apos;t want the degraded quality that comes with <a href="https://openai.com/index/sycophancy-in-gpt-4o/" target="_blank" rel="noopener noreferrer" tabIndex={-1} style={{ color: 'var(--color-black)', textDecoration: 'none', transition: 'color 200ms ease' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-accentgray)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-black)'}>responses that parrot your tone <span style={{ fontFamily: 'var(--font-compagnon), monospace', color: 'var(--color-accentgray)', letterSpacing: '.05em' }}>[2]</span></a>. 
              This could be &apos;fixed&apos; with Git-style branching or a canvas, but for my daily chats, I wanted depth and breadth without the friction of moving around a canvas or branches.
            </p>
            <p style={styles.pLarge}>
              Maybe the interface could handle navigation for me, focusing on threads of conversion I want to go deeper in, leaving one-off threads behind.
              <span style={{ fontWeight: 500 }}> Maybe our ai tools could feel more like our memory--vibrant in some areas, faded in others--a scaffold that feels navigable and retrievable.</span>
            </p>
            <InlineVideoDemo videoSrc="/demos/demo1.mp4" posterSrc="/demos/demo1-poster.jpg" aspectRatio="2 / 1" />
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={styles.h2} tabIndex={0}>
              breadcrumbs and rabbitholes
            </h2>
            <p style={styles.pLarge}>
              I prototyped two different navigation patterns, inspired by <a href="https://x.com/eddiejiao_obj/status/1925494218052370730?s=20" target="_blank" rel="noopener noreferrer" tabIndex={-1} style={{ color: 'var(--color-black)', textDecoration: 'none', transition: 'color 200ms ease' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-accentgray)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-black)'}>Eddie Jiao <span style={{ fontFamily: 'var(--font-compagnon), monospace', color: 'var(--color-accentgray)', letterSpacing: '.05em' }}>[3]</span></a> and <a href="https://x.com/MatthewWSiu/status/1594900264053575684?s=20" target="_blank" rel="noopener noreferrer" tabIndex={-1} style={{ color: 'var(--color-black)', textDecoration: 'none', transition: 'color 200ms ease' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-accentgray)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-black)'}>Matthew Siu&apos;s <span style={{ fontFamily: 'var(--font-compagnon), monospace', color: 'var(--color-accentgray)', letterSpacing: '.05em' }}>[4]</span></a> exploration interactions.
            </p>

            <h3 style={styles.h3} tabIndex={0}>
              A.  Threads
            </h3>
            <p style={styles.p}>
              Threads exposes the branches and rabbit holes of exploration. 
            </p>
            <p style={styles.p}>
            I wanted to explore a more confined kind of navigation, where people are encouraged to go down rabbitholes. Here, you start with a few segments that can be expanded on infinitely, each with their own thread. You can click on any section to expand it. 
            </p>
            <p style={styles.pSpaced}>
            I found this to be easy to navigate, but also fairly clunky.
            </p>
          </section>
        </TextContainer>
        <DemoSection
          name="dig-deeper"
          loadOnScroll
          enableMobile
          isFocused={isDemosFocused}
          onFocusRequest={handleFocusRequest}
        >
          <DigDeeperDemo
            newTopic={digDeeperTopic}
            onTopicProcessed={() => setDigDeeperTopic(undefined)}
          />
        </DemoSection>
        <ExplorationInput
          buttonText="new thread"
          onSubmit={handleDigDeeperSubmit}
        />

        <TextContainer>
          <section style={{ marginTop: '4rem', marginBottom: '2rem' }}>
            <h3 style={styles.h3} tabIndex={0}>
              B. Swipe deeper
            </h3>
            <p style={styles.p}>
            My friend commented that he felt encouraged to bounce around when using threads, which nudged me to try a more focused, mobile-friendly interaction.
            </p>
            <p style={{ ...styles.p, marginBottom: '1.5rem' }}>
              With swipe deeper, you can swipe horizontally to explore topics in depth. Click the arrow on any section (or swipe left if you&apos;re on mobile) to dig deeper, or select text and click the &ldquo;?&rdquo; button  to explore that specific concept.
            </p>
          </section>
        </TextContainer>

        <DemoSection
          name="swipe-deeper"
          loadOnScroll
          enableMobile
          isFocused={isDemosFocused}
          onFocusRequest={handleFocusRequest}
        >
          <SwipeDemo
            newTopic={swipeTopic}
            onTopicProcessed={() => setSwipeTopic(undefined)}
          />
        </DemoSection>

        <ExplorationInput
          buttonText="new swipe"
          onSubmit={handleSwipeSubmit}
        />

        <TextContainer>
        <section style={{ marginTop: '2rem', marginBottom: '2rem' }}>
          <p style={styles.p}>
            I really loved how focused and simple swipe deeper felt, <span style={{ fontWeight: 500 }}>but it misses the whole point of LLMs--how they open up to expansive, sometimes ridiculous, responses from users. </span>
            Swipe deeper totally ignores the fundamental importance of dialogue.
          </p>
          <p style={styles.p}>
            <span style={{ fontWeight: 500 }}>What if our chats were ephemeral and expansive like swipe deeper is?</span>
          </p>
        </section>
        <section style={{ marginTop: '4rem', marginBottom: '2rem' }}>
          <h2 style={styles.h2} tabIndex={0}>
            Chats that die, chats that grow
          </h2>
          <p style={styles.p}>
            Last week, I planned a party. While planning, I created 8 conversations with Claude. 
            6 of which I have not revisited. 
            I have returned to 2 chats where we altered brownie and apple cider recipes--I needed to reference them and adjust them while cooking, and will reference them again.
          </p>
          <p style={styles.pNone}>
            What if your one off chats only lived as long as needed, and the longer term ones were persistent chats, or became documents?
            For longer term projects, work projects, or small businesses, your chats could feed into a self organizing document structure<a href="#appendix-2" style={{ color: 'inherit', textDecoration: 'none' }}>²</a> that the user can reference in addition to just floating in a memory soup.
          </p>
          <InlineVideoDemo videoSrc="/demos/demo2.mp4" posterSrc="/demos/demo2-poster.jpg" aspectRatio="30 / 21" />
          </section>
        <section style={{ marginTop: '3rem', marginBottom: '4rem' }}>
          <h2 style={styles.h2} tabIndex={0}>
              Closing thoughts
            </h2>
          <p style={styles.p}>
            I am very curious about the potential there is for chat to grow into a home for and co-creator to your thoughts.<a href="#appendix-1" style={{ color: 'inherit', textDecoration: 'none' }}>¹</a>
          </p>
          <p style={styles.p}>
            My explorations were quite limited, and I&apos;m not claiming these are definitive improvements to chat, 
            as I have no clue what constraints the people making chat experiences are grappling with every day, 
            but I hope this serves as a little spark of wonder in dreaming about how chat could evolve as a living extension of how we think.
            At least, that&apos;s what this did for me :).
          </p>
          <p style={{ ...styles.pSpaced, marginTop: '1.5rem' }}>
            - Thanks for reading, Lele
          </p>
          </section>

          <section style={{ marginBottom: '3rem' }}>
            <h2 style={styles.h2} tabIndex={0}>
                Appendix
              </h2>
            <h3 id="appendix-1" style={{ ...styles.h3, marginTop: '1rem' }} data-demo-name="voice" tabIndex={0}>
              1. Voice & Co-creation
            </h3>
            <p style={styles.p}>
              <span style={{ fontWeight: 500 }}>When I bring my half-formed ideas to chat, I gain distinct clarity from the back and forth. </span>
              Even when chat&apos;s feedback isn&apos;t necessarily correct, the alternate perspectives help me understand the meaning I was searching for. 
            </p>
            <p style={styles.p}>
              This is amplified by voice. <a href="https://wisprflow.ai/leaders?gad_campaignid=22460289083&gbraid=0AAAAA-Jst42FYXr9HFUFQuHfxHrk5hgyG&dub_id=pPBI9yPvB9GcFrkp" target="_blank" rel="noopener noreferrer" tabIndex={-1} style={{ color: 'var(--color-black)', textDecoration: 'none', transition: 'color 200ms ease' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-accentgray)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-black)'}>Wispr <span style={{ fontFamily: 'var(--font-compagnon), monospace', color: 'var(--color-accentgray)', letterSpacing: '.05em' }}>[5]</span></a>, <a href="https://net.inc/" target="_blank" rel="noopener noreferrer" tabIndex={-1} style={{ color: 'var(--color-black)', textDecoration: 'none', transition: 'color 200ms ease' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-accentgray)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-black)'}>Net <span style={{ fontFamily: 'var(--font-compagnon), monospace', color: 'var(--color-accentgray)', letterSpacing: '.05em' }}>[6]</span></a>, 
              and chatGPT voice mode have demonstrated how transformative speaking as an input method can be. 
              When inputs are seamless, words aren&apos;t as precious. Voice enables us to think more, truly feel, and hear our thoughts.
            </p>
            <p style={styles.pLarge}>
              I am so excited by the potential of interfaces that understand this, and combine this with easy to read visuals and meaningful gestures.
            </p>
          </section>
          <section style={{ marginBottom: '2rem' }}>
            <p style={styles.p}>
              I did some prototypes around making messages feel more like documents, but this felt more like an offshoot than the central idea I wanted to explore so they live here now.
            </p>
            <h3 id="appendix-2" style={styles.h3} tabIndex={0}>
              2a. messages becoming documents
            </h3>
            <p style={styles.p}>
              <span style={{ fontStyle: 'italic' }}>What if your chat was a document? </span>&nbsp;The process of editing and annotating always brings me much closer to a text. I wanted to see if this was true for chats too.
            </p>
            <p style={styles.p}>
              Try selecting some text you&apos;d like to define, and ask for whatever explanation you&apos;d like. I really loved how this didn&apos;t take me out of the chat message, while still being able to learn more.
            </p>
              You can also click on any message to edit it.
            <p style={styles.pSpaced}>
            </p>
          </section>
        </TextContainer>

        <DemoSection
          name="comments"
          loadOnScroll
          enableMobile
          isFocused={isDemosFocused}
          onFocusRequest={handleFocusRequest}
        >
          <CommentsDemo />
        </DemoSection>

        <TextContainer>
          <section style={{ marginTop: '4rem', marginBottom: '2rem' }}>
            <h3 style={styles.h3} tabIndex={0}>
              2b. A more powerful index
            </h3>
            <p style={styles.p}>
              Indexes are the age old answer to navigation. The index updates as you scroll, highlighting the current section. Click any section to jump to it.
            </p>
            <p style={styles.p}>
              While this is more of a nice touch than a core interaction difference, I had to include it because it feels nice to have this little grounding element.
            </p>
          </section>
        </TextContainer>

        <DemoSection
          name="index"
          previewVideo="/demos/index.mp4"
          loadOnScroll
          isFocused={isDemosFocused}
          onFocusRequest={handleFocusRequest}
        >
          <IndexDemo />
        </DemoSection>

        <TextContainer>
          <section style={{ marginTop: '4rem', marginBottom: '2rem' }}>
          <h3 style={styles.h3} tabIndex={0}>
              2c. Index becomes queue
          </h3>

          <p style={styles.pSpaced}>
            With the index summarizing past messages, I figured that it could also be used to preview future ones (like a queue for your songs!). This way, long, complex messages can be broken down into shorter, digestible ones.
          </p>
          </section>
        </TextContainer>

        {!isMobile && (
        <div style={{ paddingBottom: '1rem', maxWidth: LAYOUT.TEXT_MAX_WIDTH, margin: '0 auto' }}>
          <button
            onClick={handlePlayQueueDemo}
            className="queue-play-button"
            tabIndex={-1}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '0.75rem 1rem',
              color: '#2F3557',
              border: 'none',
              borderRadius: '.75rem',
              cursor: 'pointer',
              fontSize: '.85rem',
              fontWeight: 400,
              fontFamily: 'var(--font-untitled-sans), -apple-system, BlinkMacSystemFont, sans-serif',
            }}
          >
            <span>play queue demo</span>
            <Play size={16} fill="#2F3557" strokeWidth={0} />

          </button>
        </div>
        )}

        <div ref={queueDemoRef}>
          <DemoSection
            name="queue"
            previewVideo="/demos/queue.mp4"
            loadOnScroll
            isFocused={isDemosFocused}
            onFocusRequest={handleFocusRequest}
          >
            <QueueDemo
              triggerDemo={triggerQueueDemo}
              onDemoTriggered={() => setTriggerQueueDemo(false)}
            />
          </DemoSection>
        </div>

        <TextContainer>
          <section style={{ marginTop: '6rem', marginBottom: '2rem' }}>
          <h2 style={styles.h2} tabIndex={0}>
              References
            </h2>
            <div style={styles.pFinal}>
              <p style={{ ...styles.p, marginBottom: '0.25rem' }}>
                <span style={{ fontFamily: 'var(--font-compagnon), monospace', color: 'var(--color-accentgray)', letterSpacing: '.05em' }}>[1]</span>{' '}
                <a
                  href="https://info.writewithprl.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--color-black)', textDecoration: 'none', transition: 'color 200ms ease' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-accentgray)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-black)'}
                >
                  Pearl - AI journal that reflects with you
                </a>
              </p>
              <p style={{ ...styles.p, marginBottom: '0.25rem' }}>
                <span style={{ fontFamily: 'var(--font-compagnon), monospace', color: 'var(--color-accentgray)', letterSpacing: '.05em' }}>[2]</span>{' '}
                <a
                  href="https://openai.com/index/sycophancy-in-gpt-4o/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--color-black)', textDecoration: 'none', transition: 'color 200ms ease' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-accentgray)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-black)'}
                >
                  OpenAI - Sycophancy in GPT-4o
                </a>
              </p>
              <p style={{ ...styles.p, marginBottom: '0.25rem' }}>
                <span style={{ fontFamily: 'var(--font-compagnon), monospace', color: 'var(--color-accentgray)', letterSpacing: '.05em' }}>[3]</span>{' '}
                <a
                  href="https://x.com/eddiejiao_obj/status/1945494218052370730?s=20"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--color-black)', textDecoration: 'none', transition: 'color 200ms ease' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-accentgray)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-black)'}
                >
                  Eddie Jiao - Infinite news canvas
                </a>
              </p>
              <p style={{ ...styles.p, marginBottom: '0.25rem' }}>
                <span style={{ fontFamily: 'var(--font-compagnon), monospace', color: 'var(--color-accentgray)', letterSpacing: '.05em' }}>[4]</span>{' '}
                <a
                  href="https://x.com/MatthewWSiu/status/1594900264053575684?s=20"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--color-black)', textDecoration: 'none', transition: 'color 200ms ease' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-accentgray)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-black)'}
                >
                  Matthew Siu - Traveling gpt3 interface
                </a>
              </p>
              <p style={{ ...styles.p, marginBottom: '0.25rem' }}>
                <span style={{ fontFamily: 'var(--font-compagnon), monospace', color: 'var(--color-accentgray)', letterSpacing: '.05em' }}>[5]</span>{' '}
                <a
                  href="https://wisprflow.ai/leaders?gad_campaignid=22460289083&gbraid=0AAAAA-Jst42FYXr9HFUFQuHfxHrk5hgyG&dub_id=pPBI9yPvB9GcFrkp"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--color-black)', textDecoration: 'none', transition: 'color 200ms ease' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-accentgray)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-black)'}
                >
                  Wispr - Voice input tool
                </a>
              </p>
              <p style={{ ...styles.p, marginBottom: '5rem' }}>
                <span style={{ fontFamily: 'var(--font-compagnon), monospace', color: 'var(--color-accentgray)', letterSpacing: '.05em' }}>[6]</span>{' '}
                <a
                  href="https://net.inc/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--color-black)', textDecoration: 'none', transition: 'color 200ms ease' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-accentgray)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-black)'}
                >
                  Net -  Mobile-first email app
                </a>
              </p>
            </div>
          </section>
          </TextContainer>
        </article>
      </div>
    </div>
  );
}

export default function ChatExplorationsPage() {
  return (
    <DemoFocusProvider>
      <ChatExplorationsContent />
    </DemoFocusProvider>
  );
}
