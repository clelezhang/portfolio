'use client';

import { useState, useEffect, useRef, useCallback} from 'react';
import SpinningCD from './SpinningCD';
import ScrollingTitle from './ScrollingTitle';
import ProgressBar from './ProgressBar';

interface MusicPlayerProps {
  className?: string;
}

export default function MusicPlayer({ className = "" }: MusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const lastProgressUpdate = useRef<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [trackInfo, setTrackInfo] = useState({
    title: "Click to play music",
    artwork: "https://picsum.photos/40/40?random=2"
  });
  
  const widgetRef = useRef<any>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const cachedDuration = useRef<number | null>(null);

  // Initialize SoundCloud widget with random starting position
  useEffect(() => {
    // Generate a random starting position (assuming playlist has around 10-20 tracks)
    const randomStartPosition = Math.floor(Math.random() * 15) + 1;
    
    // Load SoundCloud API script
    const script = document.createElement('script');
    script.src = 'https://w.soundcloud.com/player/api.js';
    script.onload = () => {
      // Wait a bit for SC to be available
      setTimeout(() => {
        if ((window as any).SC) {
          try {
            const widget = (window as any).SC.Widget('soundcloud-iframe');
            widgetRef.current = widget;

          // Bind events
          widget.bind((window as any).SC.Widget.Events.READY, () => {
            setIsLoading(false);
            
            // Skip to random track (but don't play) so user sees the right song
            widget.skip(randomStartPosition);
            
            // Get track info after skipping
            setTimeout(() => {
              widget.getCurrentSound((sound: any) => {
                if (sound) {
                  setTrackInfo({
                    title: sound.title || "Click to play music",
                    artwork: sound.artwork_url || "https://picsum.photos/40/40?random=1"
                  });
                } else {
                  // If no current sound, set default
                  setTrackInfo({
                    title: "Click to play music",
                    artwork: "https://picsum.photos/40/40?random=1"
                  });
                }
              });
            }, 800);
          });

          widget.bind((window as any).SC.Widget.Events.PLAY, () => {
            setIsPlaying(true);
            startProgressTracking();
          });

          widget.bind((window as any).SC.Widget.Events.PAUSE, () => {
            setIsPlaying(false);
            stopProgressTracking();
          });

          widget.bind((window as any).SC.Widget.Events.FINISH, () => {
            setProgress(0);
            cachedDuration.current = null; // Reset cache on track finish
          });

          // Update track info on track change (throttled)
          let lastTrackUpdate = 0;
          widget.bind((window as any).SC.Widget.Events.PLAY_PROGRESS, () => {
            const now = Date.now();
            if (now - lastTrackUpdate > 5000) { // Only update every 5 seconds
              lastTrackUpdate = now;
              widget.getCurrentSound((sound: any) => {
                if (sound && sound.title && sound.title !== trackInfo.title) {
                  setTrackInfo({
                    title: sound.title,
                    artwork: sound.artwork_url || "https://picsum.photos/40/40?random=2"
                  });
                  cachedDuration.current = null; // Reset cache on track change
                }
              });
            }
          });
          } catch (error) {
            console.error('Error initializing SoundCloud widget:', error);
          }
        } else {
          console.error('SoundCloud API not available');
        }
      }, 1000);
    };

    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      stopProgressTracking();
    };
  }, []);

  const startProgressTracking = useCallback(() => {
    if (progressInterval.current) return;
    
    progressInterval.current = setInterval(() => {
      if (widgetRef.current) {
        // Only get duration once per track, then cache it
        if (cachedDuration.current === null) {
          widgetRef.current.getDuration((duration: number) => {
            if (duration > 0) {
              cachedDuration.current = duration;
              // Now get position with cached duration
              widgetRef.current.getPosition((position: number) => {
                const newProgress = (position / cachedDuration.current!) * 100;
                // Only update if progress changed by at least 0.1%
                if (Math.abs(newProgress - lastProgressUpdate.current) >= 0.1) {
                  setProgress(newProgress);
                  lastProgressUpdate.current = newProgress;
                }
              });
            }
          });
        } else {
          // Use cached duration, only get position
          widgetRef.current.getPosition((position: number) => {
            const newProgress = (position / cachedDuration.current!) * 100;
            // Only update if progress changed by at least 0.1%
            if (Math.abs(newProgress - lastProgressUpdate.current) >= 0.1) {
              setProgress(newProgress);
              lastProgressUpdate.current = newProgress;
            }
          });
        }
      }
    }, 2000) as NodeJS.Timeout; // Reduced frequency from 1s to 2s
  }, []);

  const stopProgressTracking = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  }, []);

  const handleCDClick = useCallback(() => {
    if (isLoading || !widgetRef.current) {
      return;
    }

    if (!isPlaying) {
      // Start playing the current track (already skipped to random position)
      widgetRef.current.play();
      widgetRef.current.setVolume(25);
      setIsPlaying(true);
      setIsMuted(false);
      startProgressTracking();
    } else if (!isMuted) {
      // Playing and audible -> mute (but keep playing)
      widgetRef.current.setVolume(0);
      setIsMuted(true);
    } else {
      // Playing but muted -> unmute
      widgetRef.current.setVolume(25);
      setIsMuted(false);
    }
  }, [isPlaying, isMuted, isLoading, startProgressTracking]);

  return (
    <>
      {/* Hidden SoundCloud iframe */}
      <iframe
        id="soundcloud-iframe"
        src="https://w.soundcloud.com/player/?url=https://soundcloud.com/lele-zhang-cherrilynn/sets/portfolio&auto_play=false&shuffle=true"
        style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px' }}
        allow="autoplay; encrypted-media"
        sandbox="allow-scripts allow-same-origin allow-presentation"
      />
      
      <div className={`flex h-10 w-30 items-center gap-1 bg-gray-50 backdrop-blur-[20px] rounded-full pl-1 pr-3 py-2 ${className}`} style={{ willChange: 'transform' }}>
        <SpinningCD 
          artwork={trackInfo.artwork}
          onClick={handleCDClick}
          className="flex-shrink-0"
        />
        
        <div className="flex-1 min-w-0 space-y-1">
          <ScrollingTitle 
            title={trackInfo.title}
          />
          
          <ProgressBar 
            progress={progress}
            isAnimating={isPlaying && !isMuted}
            className=""
          />
        </div>
      </div>
    </>
  );
}