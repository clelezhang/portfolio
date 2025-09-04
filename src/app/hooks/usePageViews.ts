'use client';

import { useState, useEffect } from 'react';

export function usePageViews() {
  const [views, setViews] = useState<number>(1); // Start with 1
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Function to increment view count
    const incrementViews = async () => {
      try {
        const response = await fetch('/api/views', {
          method: 'POST',
        });
        
        if (response.ok) {
          const data = await response.json();
          setViews(data.views);
        }
      } catch (error) {
        console.error('Error incrementing views:', error);
      } finally {
        setLoading(false);
      }
    };

    // Function to get current view count
    const getViews = async () => {
      try {
        const response = await fetch('/api/views');
        if (response.ok) {
          const data = await response.json();
          setViews(data.views);
        }
      } catch (error) {
        console.error('Error getting views:', error);
      } finally {
        setLoading(false);
      }
    };

    // Check if this is a new visit (basic client-side check)
    const lastVisit = localStorage.getItem('lastVisit');
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes

    if (!lastVisit || (now - parseInt(lastVisit)) > fiveMinutes) {
      // New visit or been away for more than 5 minutes
      localStorage.setItem('lastVisit', now.toString());
      incrementViews();
    } else {
      // Just get current count without incrementing
      getViews();
    }
  }, []);

  return { views, loading };
}
