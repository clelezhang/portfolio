'use client';

import React, { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import DemoSection from '@/app/components/DemoSection';
import Header from '@/app/components/Header';
import { Play } from 'lucide-react';
import { SideNav } from './components/SideNav';
import { ExplorationInput } from './components/ExplorationInput';
import { TextContainer } from './components/TextContainer';
import { useResponsive } from './hooks/useResponsive';
import './blog-demos.css';

// Dynamically import demos for code splitting
const CommentsDemo = dynamic(() => import('@/app/components/demos/CommentsDemo'), {
  loading: () => <div style={{ width: '100%', height: '600px', background: '#FBFBFA', animation: 'pulse 1.5s ease-in-out infinite' }} />,
});

const EditingDemo = dynamic(() => import('@/app/components/demos/EditingDemo'), {
  loading: () => <div style={{ width: '100%', height: '600px', background: '#FBFBFA', animation: 'pulse 1.5s ease-in-out infinite' }} />,
});

const IndexDemo = dynamic(() => import('@/app/components/demos/IndexDemo'), {
  loading: () => <div style={{ width: '100%', height: '600px', background: '#FBFBFA', animation: 'pulse 1.5s ease-in-out infinite' }} />,
});

const QueueDemo = dynamic(() => import('@/app/components/demos/QueueDemo'), {
  loading: () => <div style={{ width: '100%', height: '600px', background: '#FBFBFA', animation: 'pulse 1.5s ease-in-out infinite' }} />,
});

const SwipeDemo = dynamic(() => import('@/app/components/demos/SwipeDemo'), {
  loading: () => <div style={{ width: '100%', height: '600px', background: '#FBFBFA', animation: 'pulse 1.5s ease-in-out infinite' }} />,
});

const DigDeeperDemo = dynamic(() => import('@/app/components/demos/DigDeeperDemo'), {
  loading: () => <div style={{ width: '100%', height: '600px', background: '#FBFBFA', animation: 'pulse 1.5s ease-in-out infinite' }} />,
});

// Base style tokens
const baseText = {
  color: 'var(--color-black)',
  letterSpacing: '-0.02em'
} as const;

const baseBodyWithLineHeight = {
  ...baseText,
  lineHeight: 1.5
} as const;

// Consolidated style objects
const styles = {
  h1: {
    ...baseText,
    fontSize: '1.25rem',
    fontWeight: 400,
  },
  h2: {
    ...baseText,
    fontFamily: 'var(--font-caveat)',
    letterSpacing: '-0.02em',
    fontWeight: 500,
    fontSize: '1.55rem',
    marginBottom: '.25rem',
    textTransform: 'lowercase'
  },
  h3: {
    fontFamily: 'var(--font-caveat)',
    fontSize: '1.6rem',
    fontWeight: 500,
    marginBottom: '.25rem',
    color: 'var(--color-accentgray)',
    letterSpacing: '-0.02em',
    textTransform: 'lowercase'
  },
  date: {
    fontFamily: 'var(--font-caveat)',
    fontSize: '1.5rem',
    fontWeight: 400,
    color: 'var(--color-accentgray)',
    letterSpacing: '-0.02em',
    lineHeight: 1,
    textTransform: 'lowercase'
  },
  p: {
    ...baseText,
    marginBottom: '1rem'
  },
  pTight: {
    ...baseText,
    marginBottom: '.5rem'
  },
  pWithLineHeight: {
    ...baseBodyWithLineHeight,
    marginBottom: '0.5rem'
  },
  pLarge: {
    ...baseBodyWithLineHeight,
    marginBottom: '2rem'
  },
  pSpaced: {
    ...baseBodyWithLineHeight,
    marginBottom: '1.5rem'
  },
  pFinal: {
    ...baseBodyWithLineHeight,
    marginBottom: '5rem'
  }
} as const;

export default function ChatExplorationsPage() {
  const [digDeeperTopic, setDigDeeperTopic] = useState<string | undefined>();
  const [swipeTopic, setSwipeTopic] = useState<string | undefined>();
  const [triggerQueueDemo, setTriggerQueueDemo] = useState<boolean>(false);
  const [isDemosFocused, setIsDemosFocused] = useState<boolean>(true);
  const queueDemoRef = useRef<HTMLDivElement>(null);

  const { isMobile } = useResponsive();

  const handleDigDeeperSubmit = (topic: string) => {
    setDigDeeperTopic(topic);
  };

  const handleSwipeSubmit = (topic: string) => {
    setSwipeTopic(topic);
  };

  const handlePlayQueueDemo = () => {
    // Scroll to demo first
    queueDemoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Trigger demo after a short delay to ensure it's in view
    setTimeout(() => {
      setTriggerQueueDemo(true);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      <Header />
      <SideNav isFocused={isDemosFocused} onToggleFocus={() => setIsDemosFocused(!isDemosFocused)} />
      <div
        className="blog-demos"
        style={{
          maxWidth: '1080px',
          margin: '0 auto',
          padding: '12rem 1rem 3rem 1rem'
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
          onFocusRequest={() => setIsDemosFocused(true)}
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
          onFocusRequest={() => setIsDemosFocused(true)}
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
          onFocusRequest={() => setIsDemosFocused(true)}
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
        <div style={{ paddingBottom: '1rem', maxWidth: '600px', margin: '0 auto' }}>
          <button
            onClick={handlePlayQueueDemo}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '0.75rem 1rem',
              backgroundColor: '#C6C7D24D',
              color: '#2F3557',
              border: 'none',
              borderRadius: '.75rem',
              cursor: 'pointer',
              fontSize: '.85rem',
              fontWeight: 400,
              fontFamily: 'var(--font-untitled-sans), -apple-system, BlinkMacSystemFont, sans-serif',
              transition: 'background-color 150ms ease-out',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#B8B9C44D'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#C6C7D24D'}
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
            onFocusRequest={() => setIsDemosFocused(true)}
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
          onFocusRequest={() => setIsDemosFocused(true)}
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
          onFocusRequest={() => setIsDemosFocused(true)}
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
