'use client';

import React, { useState, useEffect, useRef } from 'react';

interface JournalWithReflectionDemoProps {
  isVisible?: boolean;
}

export default function JournalWithReflectionDemo({ isVisible = false }: JournalWithReflectionDemoProps) {
  const [showContent, setShowContent] = useState(false);
  // First reflection
  const [showReflection1, setShowReflection1] = useState(false);
  const [typedPrompt1, setTypedPrompt1] = useState('');
  const [typedResponse1, setTypedResponse1] = useState('');
  // "Would you like another question?" prompts
  const [typedFollowUpPrompt1, setTypedFollowUpPrompt1] = useState('');
  const [typedFollowUpPrompt2, setTypedFollowUpPrompt2] = useState('');
  // Second reflection  
  const [showReflection2, setShowReflection2] = useState(false);
  const [typedPrompt2, setTypedPrompt2] = useState('');
  const [typedResponse2, setTypedResponse2] = useState('');
  // Third reflection
  const [showReflection3, setShowReflection3] = useState(false);
  const [typedPrompt3, setTypedPrompt3] = useState('');
  const [typedResponse3, setTypedResponse3] = useState('');
  
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isMobileView, setIsMobileView] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const editorRef = useRef<HTMLDivElement>(null);
  
  // Simple animation cancellation: increment ID to invalidate old animations
  const animationIdRef = useRef(0);

  const prompt1 = "When you say you shouldn't be so lax about time, what do you wish you were doing differently?";
  const response1 = "i'm just thinking abt like\n\nhow things are precious. and if I always go on my own pace\n\nif I don't act in response to opportunity, I will most certainly miss things that will never come by again";
  const followUpPrompt = "Would you like another question?";
  const prompt2 = "What would it look like to act on these opportunities?";
  const response2 = "i think i need to take more chances, say yes more, reach out to people, try new things";
  const prompt3 = "What's one small step you could take this week?";
  const response3 = "maybe i'll message someone i've been meaning to catch up with";

  const autoScroll = () => {
    if (editorRef.current) {
      editorRef.current.scrollTop = editorRef.current.scrollHeight;
    }
  };

  // Assistant text - animate in chunks (words)
  const typeChunks = (text: string, setter: (val: string) => void, onComplete: () => void, animId: number) => {
    const words = text.split(' ');
    let wordIndex = 0;
    const step = () => {
      if (animationIdRef.current !== animId) return; // Cancelled
      if (wordIndex <= words.length) {
        setter(words.slice(0, wordIndex).join(' '));
        wordIndex++;
        autoScroll();
        setTimeout(step, 50);
      } else {
        onComplete();
      }
    };
    step();
  };

  // User text - natural typing with pauses
  const typeNatural = (text: string, setter: (val: string) => void, onComplete: () => void, animId: number, speed = 1) => {
    let index = 0;
    const typeNext = () => {
      if (animationIdRef.current !== animId) return; // Cancelled
      if (index <= text.length) {
        setter(text.slice(0, index));
        index++;
        autoScroll();
        const char = text[index - 1];
        let delay = (30 + Math.random() * 40) * speed;
        if (char === '.' || char === ',' || char === '\n') delay += (150 + Math.random() * 200) * speed;
        if (char === ' ' && Math.random() > 0.7) delay += 100 * speed;
        setTimeout(typeNext, delay);
      } else {
        onComplete();
      }
    };
    typeNext();
  };

  const [waitingForTrigger1, setWaitingForTrigger1] = useState(false);
  const [waitingForTrigger2, setWaitingForTrigger2] = useState(false);

  const triggerSecondReflection = () => {
    if (!waitingForTrigger1) return;
    const animId = animationIdRef.current;
    setWaitingForTrigger1(false);
    setShowReflection2(true);
    typeChunks(prompt2, setTypedPrompt2, () => {
      if (animationIdRef.current !== animId) return;
      setTimeout(() => {
        if (animationIdRef.current !== animId) return;
        typeNatural(response2, setTypedResponse2, () => {
          if (animationIdRef.current !== animId) return;
          setTimeout(() => {
            if (animationIdRef.current !== animId) return;
            setWaitingForTrigger2(true);
            typeChunks(followUpPrompt, setTypedFollowUpPrompt2, () => {
              autoScroll();
            }, animId);
          }, 400);
        }, animId, 0.25);
      }, 400);
    }, animId);
  };

  const triggerThirdReflection = () => {
    if (!waitingForTrigger2) return;
    const animId = animationIdRef.current;
    setWaitingForTrigger2(false);
    setShowReflection3(true);
    typeChunks(prompt3, setTypedPrompt3, () => {
      if (animationIdRef.current !== animId) return;
      setTimeout(() => {
        if (animationIdRef.current !== animId) return;
        typeNatural(response3, setTypedResponse3, () => {
          autoScroll();
        }, animId, 0.25);
      }, 400);
    }, animId);
  };

  const runAnimation = () => {
    // Increment animation ID to cancel any running animations
    const animId = ++animationIdRef.current;
    
    // Reset all state
    setShowContent(false);
    setShowReflection1(false);
    setTypedPrompt1('');
    setTypedResponse1('');
    setTypedFollowUpPrompt1('');
    setTypedFollowUpPrompt2('');
    setShowReflection2(false);
    setTypedPrompt2('');
    setTypedResponse2('');
    setShowReflection3(false);
    setTypedPrompt3('');
    setTypedResponse3('');
    setWaitingForTrigger1(false);
    setWaitingForTrigger2(false);

    setTimeout(() => {
      if (animationIdRef.current !== animId) return;
      setShowContent(true);
    }, 200);
    
    // Start first reflection
    setTimeout(() => {
      if (animationIdRef.current !== animId) return;
      setShowReflection1(true);
      typeChunks(prompt1, setTypedPrompt1, () => {
        if (animationIdRef.current !== animId) return;
        setTimeout(() => {
          if (animationIdRef.current !== animId) return;
          typeNatural(response1, setTypedResponse1, () => {
            if (animationIdRef.current !== animId) return;
            setTimeout(() => {
              if (animationIdRef.current !== animId) return;
              setWaitingForTrigger1(true);
              typeChunks(followUpPrompt, setTypedFollowUpPrompt1, () => {
                autoScroll();
              }, animId);
            }, 400);
          }, animId, 0.25);
        }, 400);
      }, animId);
    }, 800);
  };

  // Listen for Cmd+Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (waitingForTrigger1) triggerSecondReflection();
        else if (waitingForTrigger2) triggerThirdReflection();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [waitingForTrigger1, waitingForTrigger2]);

  useEffect(() => {
    if (isVisible) {
      runAnimation();
    }
  }, [isVisible, animationKey]);

  const handleToggleView = () => {
    setIsMobileView(!isMobileView);
    setPosition({ x: 0, y: 0 });
    setAnimationKey(prev => prev + 1); // Trigger re-animation
  };

  const handleTitleBarMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Sample notes - exact EMOTION_COLORS from Pearl
  const sampleNotes = [
    { 
      id: 1, 
      title: 'I was in the bus going across the bay...', 
      preview: 'I thought about how I\'ve been across the bridge many times...',
      date: 'AUG 23', 
      emotions: [
        { name: 'Love', color: '#B53674', bg: 'rgba(248, 10, 152, 0.16)' },
        { name: 'Pain', color: '#C94261', bg: 'rgba(203, 1, 14, 0.14)' },
      ],
      active: true 
    },
    { 
      id: 2, 
      title: 'Thinking about what makes a good day', 
      preview: 'Sometimes the smallest things can change everything...',
      date: 'AUG 21', 
      emotions: [
        { name: 'Joy', color: '#BA643C', bg: 'rgba(255, 170, 0, 0.22)' },
        { name: 'Satisfaction', color: '#177BB9', bg: 'rgba(4, 196, 255, 0.2)' },
        { name: 'Contentment', color: '#168681', bg: 'rgba(28, 234, 186, 0.18)' },
      ],
      active: false 
    },
    { 
      id: 3, 
      title: 'Notes from the coffee shop', 
      preview: 'Overheard conversations and people watching...',
      date: 'AUG 19', 
      emotions: [
        { name: 'Interest', color: '#2D8A8F', bg: 'rgba(50, 233, 209, 0.18)' },
      ],
      active: false 
    },
    { 
      id: 4, 
      title: 'Weekend reflections', 
      preview: 'Taking stock of where I am and where I want to be...',
      date: 'AUG 17', 
      emotions: [
        { name: 'Contemplation', color: '#0680C6', bg: 'rgba(0, 202, 213, 0.18)' },
        { name: 'Nostalgia', color: '#3C4BD5', bg: 'rgba(65, 84, 255, 0.14)' },
      ],
      active: false 
    },
    { 
        id: 5, 
        title: 'Weekend reflections', 
        preview: 'Taking stock of where I am and where I want to be...',
        date: 'AUG 17', 
        emotions: [
          { name: 'Contemplation', color: '#0680C6', bg: 'rgba(0, 202, 213, 0.18)' },
          { name: 'Nostalgia', color: '#3C4BD5', bg: 'rgba(65, 84, 255, 0.14)' },
        ],
        active: false 
      },
  ];

  return (
    <div className="pearl-demo-wrapper">
      <div 
        className="pearl-demo-container"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ backgroundImage: 'url(/work-images/44E86C7C-3123-4028-B956-F3C96E6B2FA9.jpeg)' }}
      >
        {/* Window */}
        <div 
          className={`pearl-demo-window visible ${isMobileView ? 'mobile' : ''}`}
          style={{
            transform: isMobileView 
              ? `translate(${position.x}px, ${position.y}px) scale(0.85)` 
              : `translate(${position.x}px, ${position.y}px)`,
            transformOrigin: 'top center',
            transition: isDragging ? 'none' : 'transform 200ms ease',
          }}
          onMouseDown={handleTitleBarMouseDown}
        >
          {/* Title Bar - hidden on mobile */}
          {!isMobileView && (
            <div className={`pearl-demo-titlebar ${isDragging ? 'dragging' : ''}`}>
              <div className="pearl-demo-titlebar-dots">
                <div className="pearl-demo-titlebar-dot" />
                <div className="pearl-demo-titlebar-dot" />
                <div className="pearl-demo-titlebar-dot" />
              </div>
              <a 
                className="pearl-demo-titlebar-link"
                href="https://pearl-journal.com" 
                target="_blank" 
                rel="noopener noreferrer"
                onMouseDown={(e) => e.stopPropagation()}
              >
                Open Pearl
              </a>
            </div>
          )}

          {/* Main Content */}
          <div className="pearl-demo-main">
            {/* Note List Sidebar */}
            {!isMobileView && (
              <div className="pearl-demo-notelist">
                <div className="pearl-demo-notelist-header">
                  <h2 className="pearl-demo-notelist-title">My notes</h2>
                  <div className="pearl-demo-icon-group">
                    <button className="pearl-demo-icon-btn">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="pearl-demo-notes">
                  <div className="pearl-demo-notes-spacer" />
                  {sampleNotes.map((note) => (
                    <div 
                      key={note.id}
                      className={`pearl-demo-note-item ${note.active ? 'selected' : ''}`}
                    >
                      <div className="pearl-demo-note-title">{note.title}</div>
                      <div className="pearl-demo-note-preview">{note.preview}</div>
                      <div className="pearl-demo-note-meta">
                        {note.emotions.length > 0 && (
                          <div className="pearl-demo-note-emotions">
                            {note.emotions.map((emotion, i) => (
                              <span 
                                key={i}
                                className={`pearl-demo-emotion ${i === 0 ? 'first' : 'circle'}`}
                                style={{ color: emotion.color, backgroundColor: emotion.bg }}
                              >
                                {i === 0 ? emotion.name : ''}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="pearl-demo-note-date">{note.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Editor Area */}
            <div className="pearl-demo-editor" ref={editorRef}>
              <div className="pearl-demo-editor-header">
                <span className="pearl-demo-editor-date">August 23rd 2024 at 11:24</span>
                <span className="pearl-demo-editor-saved">
                  Saved
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              </div>

              <div className="pearl-demo-editor-content">
                <div className="pearl-note-emotions">
                  <span className="pearl-note-emotion-tag love">Love</span>
                  <span className="pearl-note-emotion-tag pain">Pain</span>
                </div>

                <h1 className="pearl-note-title">
                  I was in the bus going across the bay, looking out the window
                </h1>

                <div className="pearl-demo-editor-body">
                  <p>I thought about how I&apos;ve been across the bridge many times now, but I will never feel like it&apos;s enough. Every time I cross the bridge it will be as beautiful as it was the first time.</p>
                  <p>maybe I shouldn&apos;t be so lax about the time I have</p>

                  {/* First reflection - animated */}
                  {showReflection1 && (
                    <div className="pearl-demo-reflection">
                      <div className="pearl-demo-reflection-prompt">
                        <span className="pearl-demo-dot" />
                        <span>
                          {typedPrompt1}
                          {typedPrompt1.length < prompt1.length && (
                            <span className="pearl-demo-cursor prompt" />
                          )}
                        </span>
                      </div>
                      {typedResponse1 && (
                        <div className="pearl-demo-reflection-response">
                          {typedResponse1.split('\n\n').map((para, i, arr) => (
                            <p key={i}>
                              {para}
                              {i === arr.length - 1 && typedResponse1.length < response1.length && (
                                <span className="pearl-demo-cursor response" />
                              )}
                            </p>
                          ))}
                        </div>
                      )}
                      {/* Waiting for user to trigger second question */}
                      {waitingForTrigger1 && (
                        <div 
                          className="pearl-demo-reflection-followup clickable"
                          onClick={triggerSecondReflection}
                        >
                          <span className="pearl-demo-dot" />
                          <span>
                            {typedFollowUpPrompt1}
                            {typedFollowUpPrompt1.length >= followUpPrompt.length && (
                              <> (<kbd>⌘</kbd>+<kbd>Enter</kbd>)</>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Second reflection - animated */}
                  {showReflection2 && (
                    <div className="pearl-demo-reflection">
                      <div className="pearl-demo-reflection-prompt">
                        <span className="pearl-demo-dot" />
                        <span>
                          {typedPrompt2}
                          {typedPrompt2.length < prompt2.length && (
                            <span className="pearl-demo-cursor prompt" />
                          )}
                        </span>
                      </div>
                      {typedResponse2 && (
                        <div className="pearl-demo-reflection-response">
                          {typedResponse2}
                          {typedResponse2.length < response2.length && (
                            <span className="pearl-demo-cursor response" />
                          )}
                        </div>
                      )}
                      {/* Waiting for user to trigger third question */}
                      {waitingForTrigger2 && (
                        <div 
                          className="pearl-demo-reflection-followup clickable"
                          onClick={triggerThirdReflection}
                        >
                          <span className="pearl-demo-dot" />
                          <span>
                            {typedFollowUpPrompt2}
                            {typedFollowUpPrompt2.length >= followUpPrompt.length && (
                              <> (<kbd>⌘</kbd>+<kbd>Enter</kbd>)</>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Third reflection - animated */}
                  {showReflection3 && (
                    <div className="pearl-demo-reflection">
                      <div className="pearl-demo-reflection-prompt">
                        <span className="pearl-demo-dot" />
                        <span>
                          {typedPrompt3}
                          {typedPrompt3.length < prompt3.length && (
                            <span className="pearl-demo-cursor prompt" />
                          )}
                        </span>
                      </div>
                      {typedResponse3 && (
                        <div className="pearl-demo-reflection-response">
                          {typedResponse3}
                          {typedResponse3.length < response3.length && (
                            <span className="pearl-demo-cursor response" />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toggle - outside container, bottom right */}
      <div className="pearl-demo-toggle-wrapper">
        <button className="pearl-demo-toggle" onClick={handleToggleView}>
          <div className="pearl-demo-toggle-switch">
            <div className={`pearl-demo-toggle-option ${!isMobileView ? 'active' : ''}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <div className={`pearl-demo-toggle-option ${isMobileView ? 'active' : ''}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
