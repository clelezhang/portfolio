'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import DemoSection from '@/app/components/DemoSection';
import Header from '@/app/components/Header';
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

  return (
    <div className="min-h-screen bg-white font-sans">
      <Header />
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
          <header style={{ marginBottom: '2.5rem' }}>
            <h1 style={styles.h1}>
              explorations on chat as an interface for thinking
            </h1>
            <p style={styles.date}>
              nov 2025
            </p>
          </header>

          <section style={{ marginBottom: '2.5rem', lineHeight: 1.5 }}>
            <p style={styles.p}>
              I used to want to journal more. I always felt so guilty, when the end of the week, month, year rolled by, and I didn&apos;t take the time to reflect.
            </p>
            <p style={styles.p}>
              I wanted to journal more so badly that I made a journal, and asked all my friends how they journaled.
            </p>
            <p style={styles.p}>
              I found out that everyone wanted to journal more, but not everyone needed to. Most of my friends didn&apos;t journal, but they processed the stresses of school, relationships, and work by talking. I&apos;d been thinking about thinking wrong. I wasn&apos;t failing by not journaling, it just wasn&apos;t the right modality for me.
            </p>
            <p style={styles.p}>
              Dialogue is the most natural medium for our thoughts. With chat, our tools are catching up, but sometimes I get overwhelmed by the length of a response, or by how I want to explore different topics, but can&apos;t. I think a lot of people feel this way too.
            </p>
            <p style={styles.p}>
              AI can generate so much useful information to explore (yay!) but it&apos;s too much for my human brain to keep up with, at once (boo).
            I&apos;ve been fiddling with different solutions to this for a while. I didn&apos;t want the degraded quality that comes with responses that parrot your tone. I thought this could be fixed with Git-style branching or a canvas, but I&apos;ve found that takes a lot of work to navigate. I wanted depth and breadth without the work of physically moving around a canvas and zooming in and out.
            </p>
            <p style={styles.pTight}>
            I prototyped a few ways to make chat more navigable, so that it can be a better home for our thoughts.
            </p>
            <p style={styles.p}>
            Please play around and let me know what you think!
            </p>
          </section>

          <section style={{ marginBottom: '1.5rem' }}>
            <h2 style={styles.h2}>
              messages becoming documents
            </h2>
            <p style={styles.p}>
              What if your chat was a document? The process of editing, annotating, always brings me much closer to a text. I wanted to see if this was true for chats too.
            </p>

            <h3 style={styles.h3}>
              a. comment for depth
            </h3>
            <p style={styles.pSpaced}>
              Try selecting some text you&apos;d like to define, and ask for whatever explanation you&apos;d like. I really loved how this didn&apos;t take me out of the chat message, while still being able to learn more.
            </p>
          </section>
        </TextContainer>

        <DemoSection
          name="comments"
          previewGif="/demos/comments.gif"
          previewImage="/demos/comments.jpg"
          loadOnScroll
          enableMobile
          isFocused={isDemosFocused}
          onFocusRequest={handleFocusRequest}
        >
          <CommentsDemo />
        </DemoSection>

        <TextContainer>
          <section style={{ marginTop: '4rem', marginBottom: '2rem' }}>
            <h3 style={{ ...styles.h3, marginBottom: '1rem' }}>
              B. Editing
            </h3>
            <p style={styles.pWithLineHeight}>
              You can click on any message to edit it.
            </p>
            <p style={styles.pWithLineHeight}>
              I quickly realized I didn&apos;t really like editing chat messages beyond small tweaks (because I am lazy). I&apos;d rather have Claude make larger edits.
              I would be really interested in seeing an editor built around co-writing with AI & voice, or focused on writing with AI & voice from first principles. If only there was more time to explore!
              </p>
          </section>
        </TextContainer>

        <DemoSection
          name="editing"
          previewGif="/demos/editing.gif"
          previewImage="/demos/editing.jpg"
          loadOnScroll
          enableMobile
          isFocused={isDemosFocused}
          onFocusRequest={handleFocusRequest}
        >
          <EditingDemo />
        </DemoSection>

        <TextContainer>
          <section style={{ marginTop: '4rem', marginBottom: '2rem' }}>
            <h3 style={styles.h3}>
              C. A more powerful index
            </h3>
            <p style={styles.pWithLineHeight}>
              Indexes are the age old answer to navigation. The index updates as you scroll, highlighting the current section. Click any section to jump to it.
            </p>
            <p style={styles.pWithLineHeight}>
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
          <h3 style={styles.h3}>
              D. Index becomes queue
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
          <section style={{ marginTop: '4rem', marginBottom: '2rem' }}>
            <h2 style={styles.h2}>
              Two paths diverge
            </h2>
            <p style={styles.pLarge}>
              While the above features enhance linear chat, I also prototyped two different navigation patterns, inspired by Eddy Chung and Matthew Siu&apos;s exploration interactions.
            </p>

            <h3 style={styles.h3}>
              A. Threads
            </h3>
            <p style={styles.pSpaced}>
            With threads, you can click on any section to expand it. While this is nice and navigable, it also has the clunkiness of going through a long reddit thread.
            </p>
          </section>
        </TextContainer>

        <DemoSection
          name="dig-deeper"
          previewGif="/demos/explore.gif"
          previewImage="/demos/explore.jpg"
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
            <h3 style={styles.h3}>
              B. Swipe deeper
            </h3>
            <p style={styles.pWithLineHeight}>
            My friend commented that he felt encouraged to bounce around when using threads, which nudged me to try a more focused, mobile-friendly interaction.
            </p>
            <p style={styles.pWithLineHeight}>
              With swipe deeper, you can swipe horizontally to explore topics in depth. Click the arrow on any section (or swipe if you&apos;re on mobile) to dig deeper, or select text and click the &ldquo;?&rdquo; button  to explore that specific concept.
            </p>
            <p style={{ ...styles.pWithLineHeight, marginBottom: '1.5rem' }}>
              Play around with this! I&apos;m not sure what the rightful home for this interaction is, but I really love how simple this one feels.
            </p>
          </section>
        </TextContainer>

        <DemoSection
          name="swipe-deeper"
          previewGif="/demos/hopscotch.gif"
          previewImage="/demos/hopscotch.jpg"
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
        <section style={{ marginTop: '4rem', marginBottom: '2rem' }}>
          <h2 style={styles.h2}>
              Closing thoughts
            </h2>
          <p style={styles.pWithLineHeight}>
            I&apos;m not claiming these are definitive improvements to chat, as I have no clue what constraints the people making chat experiences are grappling with every day, but I hope this serves as a little spark of wonder in dreaming about how much potential there is for chat to grow in as a home for and co-creator to your thoughts. At least, that&apos;s what this did for me :).
          </p>
          <p style={{ ...styles.pWithLineHeight, marginBottom: '1.5rem' }}>
            If you try these patterns, I&apos;m curious if they felt grounding and helpful, or if they felt like a distraction. I&apos;d love to hear from you!
          </p>
          <p style={styles.pSpaced}>
            - Thanks for reading, Lele
          </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
          <h2 style={styles.h2}>
              References
            </h2>
            <p style={styles.pFinal}>
            Fill in later...
            </p>
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
