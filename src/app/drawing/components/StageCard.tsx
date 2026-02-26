'use client';

import { useState } from 'react';
import { type Stage } from '../stages';

type StageCardProps = {
  stage: Stage;
  isActive: boolean;
  isNeighbor: boolean;
  onClick: () => void;
};

export default function StageCard({ stage, isActive, isNeighbor, onClick }: StageCardProps) {
  const [iframeActive, setIframeActive] = useState(false);
  const shouldLoadIframe = stage.embedUrl && (isActive || isNeighbor);

  return (
    <div
      className="stage-card"
      data-active={isActive}
      onClick={onClick}
    >
      <div className="stage-card-embed">
        {shouldLoadIframe ? (
          <>
            <iframe
              src={stage.embedUrl}
              title={stage.title}
              className="stage-card-iframe"
              style={{ pointerEvents: iframeActive ? 'auto' : 'none' }}
            />
            {!iframeActive && isActive && (
              <button
                className="stage-card-activate"
                onClick={(e) => {
                  e.stopPropagation();
                  setIframeActive(true);
                }}
              >
                Click to interact
              </button>
            )}
            {iframeActive && (
              <button
                className="stage-card-deactivate"
                onClick={(e) => {
                  e.stopPropagation();
                  setIframeActive(false);
                }}
              >
                Exit
              </button>
            )}
          </>
        ) : stage.videoUrl ? (
          <video
            src={stage.videoUrl}
            className="stage-card-video"
            autoPlay={isActive}
            loop
            muted
            playsInline
          />
        ) : (
          <div className="stage-card-placeholder">
            <span>Coming soon</span>
          </div>
        )}
      </div>
      {stage.embedUrl && (
        <a
          href={stage.embedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="stage-card-link"
          onClick={(e) => e.stopPropagation()}
        >
          Open full version
        </a>
      )}
    </div>
  );
}
