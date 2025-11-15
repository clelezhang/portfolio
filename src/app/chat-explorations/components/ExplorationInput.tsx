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
    <div className="exploration-input-container">
      <div
        onClick={handleContainerClick}
        className="exploration-input-wrapper"
      >
        <input
          ref={inputRef}
          type="text"
          value={newTopicInput}
          onChange={(e) => setNewTopicInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Explore more?"
          className="exploration-input"
          tabIndex={-1}
        />
        <button
          onClick={handleNewTopic}
          disabled={!newTopicInput.trim()}
          className="exploration-submit-button"
          tabIndex={-1}
        >
          <span>{buttonText}</span>
        </button>
      </div>
    </div>
  );
}
