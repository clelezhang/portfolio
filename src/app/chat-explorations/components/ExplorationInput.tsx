'use client';

import { useState, useRef } from 'react';

interface ExplorationInputProps {
  buttonText: string;
  onSubmit: (topic: string) => void;
}

export function ExplorationInput({ buttonText, onSubmit }: ExplorationInputProps) {
  const [newTopicInput, setNewTopicInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleNewTopic = () => {
    if (!newTopicInput.trim()) return;
    onSubmit(newTopicInput.trim());
    setNewTopicInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleNewTopic();
    }
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div style={{
      paddingTop: '.75rem',
      maxWidth: '600px',
      margin: '0 auto',
    }}>
        <div
          onClick={handleContainerClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.25rem 0.25rem 0.25rem 1rem',
            backgroundColor: '#C6C7D24D',
            borderRadius: '.75rem',
            cursor: 'text',
          }}>
          <input
            ref={inputRef}
            type="text"
            value={newTopicInput}
            onChange={(e) => setNewTopicInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Explore more?"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '.85rem',
              color: '#2F3557',
              fontFamily: 'var(--font-untitled-sans), -apple-system, BlinkMacSystemFont, sans-serif',
            }}
          />
          <button
            onClick={handleNewTopic}
            disabled={!newTopicInput.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: newTopicInput.trim() ? '#2f35578c' : '#2e345633',
              color: 'white',
              border: 'none',
              borderRadius: '.5rem',
              cursor: newTopicInput.trim() ? 'pointer' : 'not-allowed',
              fontSize: '0.75rem',
              fontWeight: 500,
              fontFamily: 'var(--font-untitled-sans), -apple-system, BlinkMacSystemFont, sans-serif',
              transition: 'background-color 200ms ease-out',
            }}
          >
            <span>{buttonText}</span>
          </button>
        </div>
    </div>
  );
}
