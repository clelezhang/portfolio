'use client';

import { useState } from 'react';
import { usePageViews } from '../hooks/usePageViews';

// Helper function to get ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) {
    return 'ST';
  }
  if (j === 2 && k !== 12) {
    return 'ND';
  }
  if (j === 3 && k !== 13) {
    return 'RD';
  }
  return 'TH';
}

export default function Footer() {
  const [emailCopied, setEmailCopied] = useState(false);
  const { views, loading } = usePageViews();

  const handleEmailCopy = async () => {
    try {
      await navigator.clipboard.writeText('clzhang@berkeley.edu');
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy email:', err);
    }
  };

  return (
    <footer className="pt-0 sm:pt-48 lg:pt-80 pb-6 px-4 sm:px-4 bg-lightgray relative">
      <div className="max-w-7xl mx-auto">
        {/* Main signature area */}
        <div className="relative mb-6 ">
          {/* Contact links - responsive positioning */}
          <div className="sm:absolute sm:right-0 lg:top-0 xl:top-36 mb-16 text-right text-xs sm:text-sm font-mono uppercase space-y-1">
            <div>
              <a 
                href="https://x.com/CherrilynnZ"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accentgray hover:text-slate transition-colors"
              >
                TWITTER <span className="text-slate">[3]</span>
              </a>
            </div>
            <div>
              <button 
                onClick={handleEmailCopy}
                className="text-accentgray hover:text-slate transition-colors"
                title={emailCopied ? "Email copied!" : "Copy email address"}
              >
                EMAIL <span className="text-slate">[{emailCopied ? 'COPIED!' : '4'}]</span>
              </button>
            </div>
            <div>
              <a 
                href="https://linkedin.com/in/cherrilynn-zhang"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accentgray hover:text-slate transition-colors"
              >
                LINKEDIN <span className="text-slate">[5]</span>
              </a>
            </div>
          </div>

          {/* Large cursive signature */}
          <div 
            className="text-[100px] sm:text-[120px] md:text-[212px] lg:text-[280px] text-[#898DA0] font-light leading-none md:text-left"
            style={{ 
              fontFamily: 'Miss Fajardose, cursive',
              fontStyle: 'normal'
            }}
          >
            Lele&nbsp;&nbsp;Zhang
          </div>
        </div>

        {/* Bottom footer text */}
        <div className="flex flex-row justify-between items-center text-xs sm:text-sm font-mono text-accentgray uppercase">
          <div className="flex flex-row items-center justify-between gap-48">
            <div><span className="text-slate">THANKS</span> FOR VISITING!</div>
            <div className="hidden md:block">
              {loading ? (
                <><span className="text-slate">1ST</span> VISITOR :)</>
              ) : (
                <><span className="text-slate">{views}{getOrdinalSuffix(views)}</span> VISITOR :)</>
              )}
            </div>
          </div>
          <div className="text-center sm:text-right">
            <span>CODED BY ME & CLAUDE </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
