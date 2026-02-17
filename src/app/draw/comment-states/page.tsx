'use client';
import '../draw.css';
import { useState } from 'react';
import { CommentBubble } from '../components/CommentSystem';
import type { Comment } from '../types';

// ─── Sample data ────────────────────────────────────────────────────────────

const SHORT = 'Nice line!';
const MEDIUM = 'I really like where this is heading — the composition feels balanced.';
const LONG =
  'This is a longer comment that should overflow the preview bubble and trigger the three-line clamp with an ellipsis at the end, demonstrating how truncation works.';

const REPLIES: Comment['replies'] = [
  { text: 'Thanks, I was going for that!', from: 'human' },
  { text: 'Agreed, the balance works well here.', from: 'claude' },
];

function makeComment(
  text: string,
  from: 'human' | 'claude',
  status: 'saved' | 'temp' = 'saved',
  replies?: Comment['replies'],
): Comment {
  return {
    text, x: 0, y: 0, from, status, replies,
    tempStartedAt: status === 'temp' ? Date.now() : undefined,
  };
}

// ─── Bubble wrapper with local reply state ───────────────────────────────────

interface ShowcaseBubbleProps {
  comment: Comment;
  visualState: 'collapsed' | 'preview' | 'open';
  isReplying?: boolean;
}

function ShowcaseBubble({ comment, visualState, isReplying = false }: ShowcaseBubbleProps) {
  const [replyText, setReplyText] = useState('');
  return (
    <CommentBubble
      comment={comment}
      commentIndex={0}
      visualState={visualState}
      isUserComment={comment.from === 'human'}
      isTemp={comment.status === 'temp'}
      isReplying={isReplying}
      replyText={replyText}
      setReplyText={setReplyText}
      strokeColor="#888"
      onOpen={() => {}}
      onDelete={() => {}}
      onReplyStart={() => {}}
      onReplyCancel={() => {}}
      onReplySubmit={() => {}}
      onSave={comment.status === 'temp' ? () => {} : undefined}
      onDismiss={comment.status === 'temp' ? () => {} : undefined}
    />
  );
}

// ─── Layout helpers ──────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 56 }}>
      <p style={{
        fontFamily: 'monospace', fontSize: 10, color: '#999', marginBottom: 20,
        letterSpacing: '0.1em', textTransform: 'uppercase',
      }}>
        {label}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start' }}>
        {children}
      </div>
    </section>
  );
}

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
      <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#ccc', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <div style={{ pointerEvents: 'none' }}>
        {children}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CommentStatesPage() {
  return (
    <div style={{ background: '#f0eeeb', minHeight: '100vh', padding: '56px 64px', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 400, color: '#555', letterSpacing: '0.04em', marginBottom: 56 }}>
        /draw/comment-states — all comment bubble states
      </h1>

      <Section label="Collapsed">
        <Tile label="user · saved">
          <ShowcaseBubble comment={makeComment(SHORT, 'human')} visualState="collapsed" />
        </Tile>
        <Tile label="claude · saved">
          <ShowcaseBubble comment={makeComment(SHORT, 'claude')} visualState="collapsed" />
        </Tile>
        <Tile label="user · temp">
          <ShowcaseBubble comment={makeComment(SHORT, 'human', 'temp')} visualState="collapsed" />
        </Tile>
        <Tile label="claude · temp">
          <ShowcaseBubble comment={makeComment(SHORT, 'claude', 'temp')} visualState="collapsed" />
        </Tile>
      </Section>

      <Section label="Preview — short text">
        <Tile label="user · saved">
          <ShowcaseBubble comment={makeComment(SHORT, 'human')} visualState="preview" />
        </Tile>
        <Tile label="claude · saved">
          <ShowcaseBubble comment={makeComment(SHORT, 'claude')} visualState="preview" />
        </Tile>
        <Tile label="user · temp">
          <ShowcaseBubble comment={makeComment(SHORT, 'human', 'temp')} visualState="preview" />
        </Tile>
        <Tile label="claude · temp">
          <ShowcaseBubble comment={makeComment(SHORT, 'claude', 'temp')} visualState="preview" />
        </Tile>
      </Section>

      <Section label="Preview — long text (3-line clamp)">
        <Tile label="user · saved">
          <ShowcaseBubble comment={makeComment(LONG, 'human')} visualState="preview" />
        </Tile>
        <Tile label="claude · saved">
          <ShowcaseBubble comment={makeComment(LONG, 'claude')} visualState="preview" />
        </Tile>
        <Tile label="user · temp">
          <ShowcaseBubble comment={makeComment(LONG, 'human', 'temp')} visualState="preview" />
        </Tile>
        <Tile label="claude · temp">
          <ShowcaseBubble comment={makeComment(LONG, 'claude', 'temp')} visualState="preview" />
        </Tile>
      </Section>

      <Section label="Open — no replies">
        <Tile label="user · saved">
          <ShowcaseBubble comment={makeComment(MEDIUM, 'human')} visualState="open" />
        </Tile>
        <Tile label="claude · saved">
          <ShowcaseBubble comment={makeComment(MEDIUM, 'claude')} visualState="open" />
        </Tile>
        <Tile label="user · temp">
          <ShowcaseBubble comment={makeComment(MEDIUM, 'human', 'temp')} visualState="open" />
        </Tile>
        <Tile label="claude · temp">
          <ShowcaseBubble comment={makeComment(MEDIUM, 'claude', 'temp')} visualState="open" />
        </Tile>
      </Section>

      <Section label="Open — with replies">
        <Tile label="user · saved">
          <ShowcaseBubble comment={makeComment(SHORT, 'human', 'saved', REPLIES)} visualState="open" />
        </Tile>
        <Tile label="claude · saved">
          <ShowcaseBubble comment={makeComment(SHORT, 'claude', 'saved', REPLIES)} visualState="open" />
        </Tile>
        <Tile label="user · temp">
          <ShowcaseBubble comment={makeComment(SHORT, 'human', 'temp', REPLIES)} visualState="open" />
        </Tile>
        <Tile label="claude · temp">
          <ShowcaseBubble comment={makeComment(SHORT, 'claude', 'temp', REPLIES)} visualState="open" />
        </Tile>
      </Section>

      <Section label="Open — reply input active">
        <Tile label="user · saved">
          <ShowcaseBubble comment={makeComment(SHORT, 'human')} visualState="open" isReplying />
        </Tile>
        <Tile label="claude · saved">
          <ShowcaseBubble comment={makeComment(SHORT, 'claude')} visualState="open" isReplying />
        </Tile>
        <Tile label="user · temp">
          <ShowcaseBubble comment={makeComment(SHORT, 'human', 'temp')} visualState="open" isReplying />
        </Tile>
        <Tile label="claude · temp">
          <ShowcaseBubble comment={makeComment(SHORT, 'claude', 'temp')} visualState="open" isReplying />
        </Tile>
      </Section>

      <Section label="Open — long text (scrollable)">
        <Tile label="user · saved">
          <ShowcaseBubble comment={makeComment(LONG, 'human')} visualState="open" />
        </Tile>
        <Tile label="claude · saved">
          <ShowcaseBubble comment={makeComment(LONG, 'claude')} visualState="open" />
        </Tile>
        <Tile label="user · temp">
          <ShowcaseBubble comment={makeComment(LONG, 'human', 'temp')} visualState="open" />
        </Tile>
        <Tile label="claude · temp">
          <ShowcaseBubble comment={makeComment(LONG, 'claude', 'temp')} visualState="open" />
        </Tile>
      </Section>
    </div>
  );
}
