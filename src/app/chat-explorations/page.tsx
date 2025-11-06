import dynamic from 'next/dynamic';
import type { Metadata } from 'next';
import DemoSection from '@/app/components/DemoSection';
import './blog-demos.css';

// Dynamically import demos for code splitting
const CommentsDemo = dynamic(() => import('@/app/components/demos/CommentsDemo'), {
  loading: () => <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>,
});

const EditingDemo = dynamic(() => import('@/app/components/demos/EditingDemo'), {
  loading: () => <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>,
});

const IndexDemo = dynamic(() => import('@/app/components/demos/IndexDemo'), {
  loading: () => <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>,
});

const QueueDemo = dynamic(() => import('@/app/components/demos/QueueDemo'), {
  loading: () => <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>,
});

const SwipeDemo = dynamic(() => import('@/app/components/demos/SwipeDemo'), {
  loading: () => <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>,
});

const DigDeeperDemo = dynamic(() => import('@/app/components/demos/DigDeeperDemo'), {
  loading: () => <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>,
});

export const metadata: Metadata = {
  title: 'Explorations on Chat as an Interface for Thinking',
  description: 'Interactive explorations on making chat more navigable as a home for our thoughts',
  openGraph: {
    title: 'Explorations on Chat as an Interface for Thinking',
    description: 'Interactive explorations on making chat more navigable',
    type: 'article',
    publishedTime: '2025-11-01',
    authors: ['Lele Zhang'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Explorations on Chat as an Interface for Thinking',
    description: 'Interactive explorations on making chat more navigable',
  },
};

// Text wrapper component to constrain text width
const TextContainer = ({ children }: { children: React.ReactNode }) => (
  <div style={{ maxWidth: '600px', margin: '0 auto' }}>
    {children}
  </div>
);

export default function ChatExplorationsPage() {
  return (
    <div className="blog-demos" style={{ maxWidth: '1080px', margin: '4rem auto 0 auto', padding: '3rem 2rem' }}>
      <article>
        <TextContainer>
          <header style={{ marginBottom: '3rem' }}>
            <h1 style={{
              fontSize: '1.25rem',
              fontWeight: 500,
              marginBottom: '0.5rem',
              color: 'var(--color-black)'
            }}>
              explorations on chat as an interface for thinking
            </h1>
            <p style={{
              fontSize: '0.9rem',
              color: 'var(--color-gray)',
              marginBottom: '2rem'
            }}>
              nov 2025
            </p>
          </header>

          <section style={{ marginBottom: '3rem', lineHeight: 1.7 }}>
            <p style={{ marginBottom: '1rem' }}>
              I used to want to journal more. I always felt so guilty, when the end of the week, month, year rolled by, and I didn&apos;t take the time to reflect.
            </p>
            <p style={{ marginBottom: '.25rem' }}>
              I wanted to journal more so badly that I made a journal, and asked all my friends how they journaled.
            </p>
            <p style={{ marginBottom: '1rem' }}>
              I found out that everyone wanted to journal more, but not everyone needed to. Most of my friends didn&apos;t journal, but they processed the stresses of school, relationships, and work by talking. I&apos;d been thinking about thinking wrong. I wasn&apos;t failing by not journaling, it just wasn&apos;t right for me.
            </p>
            <p style={{ marginBottom: '1rem' }}>
              Dialogue is the most natural medium for our thoughts. With chat, our tools are catching up, but sometimes I get overwhelmed by the length of a response, or by how I want to explore different topics, but can&apos;t. I think a lot of people feel this way too.
            </p>
            <p style={{ marginBottom: '.25 rem' }}>
              AI can generate so much useful information to explore (yay!) but it&apos;s too much for my human brain to keep up with, at once.
            </p>
            <p style={{ marginBottom: '1rem' }}>
              I&apos;ve been fiddling with different solutions to this for a while. I didn&apos;t want the degraded quality that comes with responses that parrot your tone. I thought this could be fixed with Git-style branching or a canvas, but I&apos;ve found that takes a lot of work to navigate. I wanted depth and breadth without the work of physically moving around a canvas and zooming in and out.
            </p>
            <p style={{ marginBottom: '.25rem' }}>
            I&apos;ve been exploring ways to make chat more navigable, so that it can be a better home for our thoughts.
            </p>
            <p style={{ marginBottom: '1rem' }}>
            Please play around and let me know what you think!
            </p>
          </section>

          <section style={{ marginBottom: '1.5rem' }}>
            <h2 style={{
              fontWeight: 600,
              marginBottom: '.5rem',
              color: 'var(--color-black)',
              fontSize: '1rem'
            }}>
              Messages as documents
            </h2>
            <p style={{ marginBottom: '2rem', lineHeight: 1.7 }}>
              What if your chat was a document too? The process of editing, annotating, always brings me much closer to a text. I wanted to see if this was true for chats too.
            </p>

            <h3 style={{
              marginBottom: '.5rem',
              color: 'var(--color-gray)'
            }}>
              A. Comment for depth
            </h3>
            <p style={{ marginBottom: '0.25rem', lineHeight: 1.7 }}>
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
        >
          <CommentsDemo />
        </DemoSection>

        <TextContainer>
          <section style={{ marginBottom: '2rem' }}>
            <h3 style={{
              marginBottom: '1rem',
              color: 'var(--color-gray)'
            }}>
              B. Editing
            </h3>
            <p style={{ marginBottom: '0.25rem', lineHeight: 1.7 }}>
              You can click on any message to edit it.
            </p>
            <p style={{ marginBottom: '.25rem', lineHeight: 1.7 }}>
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
        >
          <EditingDemo />
        </DemoSection>

        <TextContainer>
          <section style={{ marginBottom: '2rem' }}>
            <h3 style={{
              marginBottom: '.5rem',
              color: 'var(--color-gray)'
            }}>
              C. A more powerful index
            </h3>
            <p style={{ marginBottom: '0.25rem', lineHeight: 1.7 }}>
              Indexes are the age old answer to navigation. The index updates as you scroll, highlighting the current section. Click any section to jump to it.
            </p>
            <p style={{ marginBottom: '0.25rem', lineHeight: 1.7 }}>
              While this is more of a nice touch than a core interaction difference, I had to include it because it feels nice to have this little grounding element.
            </p>
          </section>
        </TextContainer>

        <DemoSection
          name="index"
          previewGif="/demos/index.gif"
          previewImage="/demos/index.jpg"
          loadOnScroll
        >
          <IndexDemo />
        </DemoSection>

        <TextContainer>
          <h3 style={{
              marginBottom: '.5rem',
              color: 'var(--color-gray)'
            }}>
              D. Index becomes queue
          </h3>

          <p style={{ marginBottom: '1.75rem', lineHeight: 1.7 }}>
            With the index summarizing past messages, I figured that it could also be used to preview future ones (like a queue for your songs!). This way, long, complex messages can be broken down into shorter, digestible ones.
          </p>
        </TextContainer>

        <DemoSection
          name="queue"
          previewGif="/demos/queue.gif"
          previewImage="/demos/queue.jpg"
          loadOnScroll
        >
          <QueueDemo />
        </DemoSection>

        <TextContainer>
          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{
              fontWeight: 600,
              marginBottom: '.5rem',
              color: 'var(--color-black)',
              fontSize: '1rem'
            }}>
              Two paths diverge
            </h2>
            <p style={{ marginBottom: '2rem', lineHeight: 1.7 }}>
              While the above features enhance linear chat, I also prototyped two different navigation patterns, inspired by Eddy Chung and Matthew Siu&apos;s exploration interactions.
            </p>

            <h3 style={{
              marginBottom: '.5rem',
              color: 'var(--color-gray)'
            }}>
              A. Threads
            </h3>
            <p style={{ marginBottom: '1.75rem', lineHeight: 1.7 }}>
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
        >
          <DigDeeperDemo />
        </DemoSection>

        <TextContainer>
          <section style={{ marginBottom: '2rem' }}>
            <h3 style={{
              marginBottom: '.5rem',
              color: 'var(--color-gray)'
            }}>
              B. Swipe deeper
            </h3>
            <p style={{ marginBottom: '0.25rem', lineHeight: 1.7 }}>
            My friend commented that he felt encouraged to bounce around when using threads, which nudged me to try a more focused, mobile-friendly interaction.
            </p>
            <p style={{ marginBottom: '0.25rem', lineHeight: 1.7 }}>
              With swipe deeper, you can swipe horizontally to explore topics in depth. Click the arrow on any section (or swipe if you&apos;re on mobile) to dig deeper, or select text and click the &ldquo;?&rdquo; button  to explore that specific concept.
            </p>
            <p style={{ marginBottom: '1.5rem', lineHeight: 1.7 }}>
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
        >
          <SwipeDemo />
        </DemoSection>

        <TextContainer>
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{
              fontWeight: 600,
              marginBottom: '.5rem',
              color: 'var(--color-black)',
              fontSize: '1rem'
            }}>
              Closing thoughts
            </h2>
          <p style={{ marginBottom: '0.25rem', lineHeight: 1.7 }}>
            I&apos;m not claiming these are definitive improvements to chat, as I have no clue what constraints the people making chat experiences are grappling with every day, but I hope this serves as a little spark of wonder in dreaming about how much potential there is for chat to grow in as a home for and co-creator to your thoughts. At least, that&apos;s what this did for me :).
          </p>
          <p style={{ marginBottom: '1.5rem', lineHeight: 1.7 }}>
            If you try these patterns, I&apos;m curious if they felt grounding and helpful, or if they felt like a distraction. I&apos;d love to hear from you!
          </p>
          <p style={{ marginBottom: '1.75rem', lineHeight: 1.7 }}>
            - Thanks for reading, Lele
          </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
          <h2 style={{
              fontWeight: 600,
              marginBottom: '.5rem',
              color: 'var(--color-black)',
              fontSize: '1rem'
            }}>
              References
            </h2>
            <p style={{ marginBottom: '5rem', lineHeight: 1.7 }}>
            Fill in later...
            </p>
          </section>
          </TextContainer>
      </article>
    </div>
  );
}
