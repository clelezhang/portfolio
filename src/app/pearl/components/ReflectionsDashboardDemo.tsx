'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Monitor, Smartphone } from 'lucide-react';

// Exact Pearl emotion colors
const EMOTION_STATS = [
  { emotion: 'Satisfaction', color: '#177BB9', value: 40 },
  { emotion: 'Anxiety', color: '#4D4AB9', value: 21 },
  { emotion: 'Excitement', color: '#AB6C00', value: 18 },
];

// Background colors from EMOTION_COLORS
const EMOTION_BG: Record<string, string> = {
  Satisfaction: 'rgba(4, 196, 255, 0.2)',
  Anxiety: 'rgba(8, 0, 249, 0.12)',
  Excitement: 'rgba(249, 216, 0, 0.28)',
};

// Emotion labels for graph - positions as percentages
const EMOTION_LABELS = [
  { name: 'EXCITEMENT', color: '#AB6C00', x: 80, y: 15 },
  { name: 'LOVE', color: '#B53674', x: 70, y: 32 },
  { name: 'FEAR', color: '#8B5039', x: 22, y: 25 },
  { name: 'SATISFACTION', color: '#177BB9', x: 78, y: 50 },
  { name: 'INTEREST', color: '#2D8A8F', x: 45, y: 50 },
  { name: 'SADNESS', color: '#4262B3', x: 25, y: 65 },
  { name: 'EMBARRASSMENT', color: '#8C7E01', x: 65, y: 72 },
  { name: 'PAIN', color: '#C94261', x: 50, y: 80 },
];

// Sample journal entries with emotions for demo
// Dates spread across different days/weeks/months for filtering demo
const SAMPLE_NOTES = [
  { 
    id: 1, 
    title: 'Bay bridge thoughts', 
    content: 'I was on the bus crossing the bay, looking out the window. The light was beautiful...',
    emotions: ['Satisfaction', 'Interest'],
    date: 'AUG 23',
    // Friday of current week
    lastEdited: new Date(2024, 7, 23), // Aug 23, 2024 (Friday)
  },
  { 
    id: 2, 
    title: 'Coffee shop morning', 
    content: 'Sometimes the smallest things can change your whole perspective on a day.',
    emotions: ['Excitement', 'Love'],
    date: 'AUG 21',
    // Wednesday of current week
    lastEdited: new Date(2024, 7, 21), // Aug 21, 2024 (Wednesday)
  },
  { 
    id: 3, 
    title: 'Work stress', 
    content: 'The deadline is approaching and I feel like I haven\'t made enough progress...',
    emotions: ['Fear', 'Sadness'],
    date: 'AUG 20',
    // Tuesday of current week
    lastEdited: new Date(2024, 7, 20), // Aug 20, 2024 (Tuesday)
  },
  { 
    id: 4, 
    title: 'Old photos', 
    content: 'Found some photos from last year. So much has changed since then.',
    emotions: ['Love', 'Pain'],
    date: 'AUG 12',
    // Previous week (week 2 of month)
    lastEdited: new Date(2024, 7, 12), // Aug 12, 2024 (Monday)
  },
  { 
    id: 5, 
    title: 'New project idea', 
    content: 'Had a great brainstorming session today. Feeling energized about the possibilities.',
    emotions: ['Excitement', 'Interest', 'Satisfaction'],
    date: 'AUG 5',
    // Week 1 of month
    lastEdited: new Date(2024, 7, 5), // Aug 5, 2024 (Monday)
  },
  {
    id: 6,
    title: 'Difficult conversation',
    content: 'Had to have a tough conversation today. It didn\'t go as expected...',
    emotions: ['Embarrassment', 'Fear'],
    date: 'JUL 15',
    // Different month (July)
    lastEdited: new Date(2024, 6, 15), // Jul 15, 2024 (Monday)
  },
  {
    id: 7,
    title: 'Summer memories',
    content: 'Looking back at summer vacation photos. What a wonderful time that was.',
    emotions: ['Love', 'Satisfaction'],
    date: 'JUN 20',
    // Different month (June)
    lastEdited: new Date(2024, 5, 20), // Jun 20, 2024 (Thursday)
  },
  {
    id: 8,
    title: 'Morning run',
    content: 'Finally got back into running. The sunrise was incredible this morning.',
    emotions: ['Excitement', 'Satisfaction'],
    date: 'AUG 19',
    // Monday of current week
    lastEdited: new Date(2024, 7, 19), // Aug 19, 2024 (Monday)
  },
];

// Emotion colors for nodes (background colors from EMOTION_COLORS)
const EMOTION_NODE_COLORS: Record<string, string> = {
  Excitement: 'rgba(249, 216, 0, 0.35)',
  Love: 'rgba(248, 10, 152, 0.22)',
  Fear: 'rgba(174, 135, 76, 0.25)',
  Satisfaction: 'rgba(4, 196, 255, 0.28)',
  Interest: 'rgba(50, 233, 209, 0.25)',
  Sadness: 'rgba(0, 83, 210, 0.2)',
  Embarrassment: 'rgba(249, 236, 0, 0.38)',
  Pain: 'rgba(203, 1, 14, 0.2)',
};

// Seeded random for consistent node positions
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

// Generate nodes from notes - each emotion in a note is a node
const generateNodes = (notes: typeof SAMPLE_NOTES) => {
  const nodes: { id: string; noteId: number; emotion: string; x: number; y: number; bg: string }[] = [];
  
  notes.forEach(note => {
    note.emotions.forEach((emotion, i) => {
      const label = EMOTION_LABELS.find(l => l.name === emotion.toUpperCase());
      if (label) {
        // Use seeded random for consistent positions
        const seed = note.id * 100 + i;
        const jitterX = (seededRandom(seed) - 0.5) * 12;
        const jitterY = (seededRandom(seed + 50) - 0.5) * 12;
        nodes.push({
          id: `${note.id}-${emotion}`,
          noteId: note.id,
          emotion,
          x: label.x + jitterX,
          y: label.y + jitterY + 8, // Offset below label
          bg: EMOTION_NODE_COLORS[emotion] || 'rgba(150, 150, 150, 0.2)',
        });
      }
    });
  });
  
  return nodes;
};

// Generate links between nodes of the same note
const generateLinks = (nodes: { id: string; noteId: number; x: number; y: number }[], notes: typeof SAMPLE_NOTES) => {
  const links: { source: string; target: string; noteId: number }[] = [];
  
  notes.forEach(note => {
    const noteNodes = nodes.filter(n => n.noteId === note.id);
    // Create links between all pairs of nodes in the same note
    for (let i = 0; i < noteNodes.length; i++) {
      for (let j = i + 1; j < noteNodes.length; j++) {
        links.push({
          source: noteNodes[i].id,
          target: noteNodes[j].id,
          noteId: note.id,
        });
      }
    }
  });
  
  return links;
};

// Filter notes based on time filter and day filter
const filterNotes = (
  notes: typeof SAMPLE_NOTES,
  timeFilter: string,
  dayFilter: string
) => {
  // Reference date for "current" - using Aug 24, 2024 as reference
  const referenceDate = new Date(2024, 7, 24);
  
  return notes.filter(note => {
    const noteDate = note.lastEdited;
    
    // Time filtering
    if (timeFilter === 'week') {
      // Within last 7 days
      const weekAgo = new Date(referenceDate);
      weekAgo.setDate(weekAgo.getDate() - 7);
      if (noteDate < weekAgo) return false;
    } else if (timeFilter === 'month') {
      // Within last 30 days
      const monthAgo = new Date(referenceDate);
      monthAgo.setDate(monthAgo.getDate() - 30);
      if (noteDate < monthAgo) return false;
    } else if (timeFilter === 'year') {
      // Within last 365 days
      const yearAgo = new Date(referenceDate);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      if (noteDate < yearAgo) return false;
    }
    
    // Day filtering
    if (dayFilter !== 'ALL') {
      if (timeFilter === 'week') {
        // Filter by day of week
        const dayOfWeek = noteDate.toLocaleString('en-US', { weekday: 'short' }).toUpperCase();
        if (dayOfWeek !== dayFilter) return false;
      } else if (timeFilter === 'month') {
        // Filter by week of month
        const weekNumber = Math.ceil(noteDate.getDate() / 7);
        if (`WK${weekNumber}` !== dayFilter) return false;
      } else if (timeFilter === 'year') {
        // Filter by month
        const month = noteDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
        if (month !== dayFilter) return false;
      }
    }
    
    return true;
  });
};

// Initial nodes and links (all notes)
const ALL_NODES = generateNodes(SAMPLE_NOTES);
const ALL_LINKS = generateLinks(ALL_NODES, SAMPLE_NOTES);

// Date filters based on time filter
const getDateFilters = (timeFilter: string) => {
  switch (timeFilter) {
    case 'week':
      return ['ALL', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    case 'month':
      return ['ALL', 'WK1', 'WK2', 'WK3', 'WK4', 'WK5'];
    case 'year':
      return ['ALL', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    default:
      return ['ALL'];
  }
};

interface ReflectionsDashboardDemoProps {
  isVisible?: boolean;
  variant?: 'default' | 'alt';
  embedded?: boolean; // When true, renders just the window without wrapper/container/toggle
}

export default function ReflectionsDashboardDemo({ isVisible = false, variant = 'default', embedded = false }: ReflectionsDashboardDemoProps) {
  const [animatedValues, setAnimatedValues] = useState([0, 0, 0]);
  const [activeTimeFilter, setActiveTimeFilter] = useState(0);
  const [activeDayFilter, setActiveDayFilter] = useState(0);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNoteId, setHoveredNoteId] = useState<number | null>(null);
  const [preview, setPreview] = useState<{ 
    visible: boolean; 
    note: typeof SAMPLE_NOTES[0] | null; 
    x: number; 
    y: number;
    positionClass: string;
  }>({
    visible: false,
    note: null,
    x: 0,
    y: 0,
    positionClass: '',
  });
  const graphRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);
  const [contentOffset, setContentOffset] = useState(0);

  const timeFilters = ['week', 'month', 'year'];
  const dayFilters = getDateFilters(timeFilters[activeTimeFilter]);

  // Filter notes based on current filters
  const filteredNotes = filterNotes(
    SAMPLE_NOTES, 
    timeFilters[activeTimeFilter], 
    dayFilters[activeDayFilter]
  );
  
  // Generate nodes and links for filtered notes
  const filteredNodes = generateNodes(filteredNotes);
  const filteredLinks = generateLinks(filteredNodes, filteredNotes);
  
  // Check which day filters have notes (for disabling empty filters)
  const dayFilterHasNotes = (dayFilter: string) => {
    if (dayFilter === 'ALL') return true;
    const notesForDay = filterNotes(
      SAMPLE_NOTES,
      timeFilters[activeTimeFilter],
      dayFilter
    );
    return notesForDay.length > 0;
  };
  
  // Track node opacities for animation
  const [nodeOpacities, setNodeOpacities] = useState<Record<string, number>>({});

  // Set mobile view on client side only
  useEffect(() => {
    setIsClient(true);
    setIsMobileView(window.innerWidth < 768);

    // Listen for window resize
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      setIsMobileView(isMobile);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset day filter when time filter changes
  useEffect(() => {
    setActiveDayFilter(0);
  }, [activeTimeFilter]);

  useEffect(() => {
    if (isVisible && !hasAnimated.current) {
      hasAnimated.current = true;
      
      // Delay before starting animations
      setTimeout(() => {
        // Animate numbers
        const targetValues = EMOTION_STATS.map(s => s.value);
        const duration = 1200;
        const startTime = Date.now();
        
        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          
          setAnimatedValues(targetValues.map(v => Math.round(v * eased)));
          
          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        };
        
        setTimeout(animate, 400);

        // Animate all nodes appearing with stagger (use ALL_NODES for consistent animation)
        ALL_NODES.forEach((node, i) => {
          setTimeout(() => {
            setNodeOpacities(prev => ({
              ...prev,
              [node.id]: 1,
            }));
          }, 400 + i * 60);
        });
      }, 400); // Initial delay before all animations start
    }
  }, [isVisible]);

  // Scroll position for mobile view
  // Demo 3: scroll to top (dashboard)
  // Demo 4 (alt): scroll to bottom (graph)
  useEffect(() => {
    if (isMobileView && contentRef.current) {
      setTimeout(() => {
        if (contentRef.current) {
          if (variant === 'alt') {
            // Demo 4: scroll to bottom to show graph
            const maxScroll = contentRef.current.scrollHeight - contentRef.current.clientHeight;
            setContentOffset(-maxScroll);
          } else {
            // Demo 3: scroll to top to show dashboard
            setContentOffset(0);
          }
        }
      }, 100);
    } else {
      // Reset offset when not in mobile view
      setContentOffset(0);
    }
  }, [isMobileView, variant]);

  const handleToggleView = () => {
    setIsMobileView(!isMobileView);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (window.innerWidth < 768) return; // Disable dragging on mobile
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || window.innerWidth < 768) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Handle node hover - using Pearl's positioning logic (disabled on mobile)
  const handleNodeHover = (node: typeof ALL_NODES[0], e: React.MouseEvent) => {
    if (isMobileView) return; // Disable hover previews on mobile
    const note = SAMPLE_NOTES.find(n => n.id === node.noteId);
    if (!note || !graphRef.current) return;
    
    const rect = graphRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Preview dimensions (matching Pearl)
    const previewWidth = 220;
    const previewHeight = 150;
    const padding = 20;

    // Available space calculations
    const spaceRight = rect.right - e.clientX - previewWidth - padding;
    const spaceLeft = e.clientX - rect.left - previewWidth - padding;
    const spaceTop = e.clientY - rect.top - previewHeight - padding;
    const spaceBottom = rect.bottom - e.clientY - previewHeight - padding;

    // Determine position class
    let positionClass = '';

    // First determine left/right positioning
    if (spaceRight < 0 && spaceLeft > 0) {
      // Not enough space on right, use left side
      positionClass = 'left-side';
    }

    // Then determine top/bottom positioning if needed
    if (spaceBottom < 0 && spaceTop > 0) {
      // Not enough space on bottom, use top
      positionClass = positionClass ? `top-${positionClass}` : 'top-side';
    } else if (spaceTop < 0 && spaceBottom > 0) {
      // Not enough space on top, use bottom
      positionClass = positionClass ? `bottom-${positionClass}` : 'bottom-side';
    }

    setHoveredNoteId(node.noteId);
    setPreview({
      visible: true,
      note,
      x: x + 15,
      y,
      positionClass,
    });
  };

  const handleNodeLeave = () => {
    setHoveredNoteId(null);
    setPreview(prev => ({ ...prev, visible: false }));
  };

  // The window content (shared between embedded and normal modes)
  const windowContent = (
    <div 
      className={`pearl-demo-window visible ${isMobileView ? 'mobile' : ''}`}
      style={{
        transform: embedded ? undefined : `translate(${position.x}px, ${position.y}px) scale(${isMobileView ? 0.75 : 1})`,
        transformOrigin: isMobileView ? 'center center' : 'top center',
        transition: isDragging ? 'none' : 'transform 200ms ease',
        cursor: embedded ? 'default' : (isDragging ? 'grabbing' : 'grab'),
        width: embedded ? '724px' : (isMobileView ? '375px' : variant === 'alt' ? '700px' : '900px'),
        minWidth: embedded ? '724px' : (isMobileView ? '375px' : variant === 'alt' ? '800px' : '900px'),
        height: embedded ? '548px' : (isMobileView ? '812px' : variant === 'alt' ? '516px' : '612px'),
      }}
      onMouseDown={embedded ? undefined : handleMouseDown}
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
            href="https://info.writewithprl.com/"
            target="_blank"
            rel="noopener noreferrer"
            onMouseDown={(e) => e.stopPropagation()}
          >
            Open Pearl
          </a>
        </div>
      )}

          {/* Main Content - Dashboard + Graph side by side on desktop */}
          <div
            ref={contentRef}
            style={{
              display: 'flex',
              flex: 1,
              overflow: isMobileView ? 'auto' : 'hidden',
              flexDirection: isMobileView ? 'column' : 'row',
              position: 'relative',
              transform: isMobileView ? `translateY(${contentOffset}px)` : undefined,
              transition: 'transform 300ms ease',
            }}
          >
            {/* Dashboard Panel (left side on desktop, bottom on mobile) - using CSS classes */}
            <div 
              className="pearl-dashboard-panel"
              style={{
                width: isMobileView ? '100%' : undefined,
                border: isMobileView ? 'none' : undefined,
                borderRadius: isMobileView ? '0' : undefined,
                boxShadow: isMobileView ? 'none' : undefined,
                margin: isMobileView ? '0' : '8px',
                height: isMobileView ? 'auto' : 'calc(100% - 16px)',
              }}
            >
              {/* Dashboard header */}
              <div className="pearl-dashboard-header" style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                paddingLeft: '12px',
                height: '24px',
                marginBottom: '8px',
              }}>
                <h2 style={{
                  fontSize: isMobileView ? '24px' : '18px',
                  fontWeight: 400,
                  fontFamily: '"gelica", Georgia, serif',
                  color: 'var(--pearl-text-primary)',
                  margin: 0,
                }}>My reflections</h2>
              </div>

              {/* Stats grid content */}
              <div className="pearl-dashboard-content">
                {/* Heading */}
                <div style={{
                  fontFamily: '"Instrument Sans", sans-serif',
                  fontVariationSettings: '"wght" 500',
                  fontSize: isMobileView ? '14px' : '10px',
                  textTransform: 'uppercase',
                  color: 'var(--pearl-text-secondary)',
                  marginLeft: '12px',
                  marginRight: '12px',
                  marginTop: '8px',
                }}>
                  Your past week...
                </div>

                {/* Emotion Summary Section - exact .emotion-summary-section styling */}
                <div style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: '6px',
                  padding: '12px',
                  paddingTop: '18px',
                  background: `
                    linear-gradient(180deg, #fdfafb3d 10%, #fdfafb9f 30%, #fdfafbb4 100%),
                    linear-gradient(90deg, 
                      ${EMOTION_BG.Satisfaction} 30%, 
                      ${EMOTION_BG.Anxiety} 60%, 
                      ${EMOTION_BG.Excitement} 100%
                    )
                  `,
                }}>
                  {/* Emotion Stats Grid - exact .emotion-summary-grid styling */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    width: '100%',
                    marginBottom: '32px',
                  }}>
                    {EMOTION_STATS.map((stat, i) => (
                      <div key={stat.emotion} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: '2px',
                        color: stat.color,
                      }}>
                        <p style={{
                          fontFamily: '"Instrument Sans", sans-serif',
                          fontVariationSettings: '"wght" 300',
                          fontSize: isMobileView ? '44px' : '32px',
                          lineHeight: isMobileView ? '44px' : '32px',
                          margin: 0,
                        }}>
                          {animatedValues[i]}%
                        </p>
                        <p style={{
                          fontFamily: '"Instrument Sans", sans-serif',
                          fontVariationSettings: '"wght" 400',
                          fontSize: isMobileView ? '14px' : '10px',
                          textTransform: 'lowercase',
                          margin: 0,
                        }}>
                          {stat.emotion.toLowerCase()}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Summary - exact .week-description styling */}
                  <div style={{
                    fontFamily: '"Instrument Sans", sans-serif',
                    fontVariationSettings: '"wght" 400',
                    fontSize: isMobileView ? '16px' : '12px',
                    lineHeight: '140%',
                    color: 'var(--pearl-text-primary)',
                  }}>
                    <p style={{ margin: 0 }}>
                      You&apos;ve been balancing time&apos;s abundance and scarcity. Between moments of beauty like bay views and work constraints, you&apos;ve kept your sense of wonder.
                    </p>
                  </div>

                  {/* Descriptive Words - exact .descriptive-words styling */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                    paddingTop: '24px',
                  }}>
                    {['Temporality', '✦', 'Wonder', '✦', 'Duality'].map((word, i) => (
                      <span key={i} style={{
                        fontFamily: '"Instrument Sans", sans-serif',
                        fontVariationSettings: '"wght" 400',
                        fontSize: word === '✦' ? (isMobileView ? '8px' : '5px') : (isMobileView ? '14px' : '10px'),
                        color: 'var(--pearl-text-primary)',
                      }}>
                        {word}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Moments + Notes to Self side by side */}
                <div style={{ display: 'flex', gap: '8px' }}>
                    {/* Moments Section - square */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      width: '50%',
                      aspectRatio: '1',
                      padding: '11px',
                      background: 'radial-gradient(circle at 35% 80%, #f4c7c75e 0%, #f5d4cb00 50%), linear-gradient(100deg, #f5f3f6 0%, #f7f2f6 100%)',
                      borderRadius: '6px',
                    }}>

                      <div style={{
                        fontFamily: '"Instrument Sans", sans-serif',
                        fontVariationSettings: '"wght" 400',
                        fontSize: isMobileView ? '60px' : '40px',
                        lineHeight: '175%',
                        color: 'var(--pearl-text-primary)',
                      }}>
                        5
                      </div>
                      <div style={{
                        fontFamily: '"Instrument Sans", sans-serif',
                        fontVariationSettings: '"wght" 400',
                        fontSize: isMobileView ? '16px' : '12px',
                        lineHeight: '16px',
                        color: 'var(--pearl-text-primary)',
                      }}>
                        Moments saved
                      </div>
                      <div style={{
                        fontFamily: '"Instrument Sans", sans-serif',
                        fontVariationSettings: '"wght" 400',
                        fontSize: isMobileView ? '14px' : '10px',
                        color: 'var(--pearl-text-secondary)',
                      }}>
                        in the last week
                      </div>
                    </div>

                    {/* Notes to Self - square */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      width: '50%',
                      aspectRatio: '1',
                      padding: '11px',
                      background: 'linear-gradient(100deg, #f5f3f6 0%, #f7f2f6 100%)',
                      borderRadius: '6px',
                      justifyContent: 'space-between',
                    }}>
                      <div style={{
                        fontFamily: '"Instrument Sans", sans-serif',
                        fontVariationSettings: '"wght" 400',
                        fontSize: isMobileView ? '16px' : '12px',
                        lineHeight: '16px',
                        color: 'var(--pearl-text-primary)',
                      }}>
                        Notes to self
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        {['Message grandma', 'Buy corn', 'Study for exam', 'Respond to boss'].map(note => (
                          <div key={note} style={{
                            fontFamily: '"Instrument Sans", sans-serif',
                            fontVariationSettings: '"wght" 400',
                            fontSize: isMobileView ? '14px' : '10px',
                            color: 'var(--pearl-text-secondary)',
                          }}>
                            {note}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                {/* Overarching Themes Section - exact .theme-sections styling */}
                <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{
                      fontFamily: '"Instrument Sans", sans-serif',
                      fontVariationSettings: '"wght" 500',
                      fontSize: isMobileView ? '14px' : '10px',
                      textTransform: 'uppercase',
                      color: 'var(--pearl-text-secondary)',
                      marginLeft: '12px',
                    }}>
                      Overarching themes
                    </div>
                    
                    {/* Themes container - exact .themes styling */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      background: 'linear-gradient(135deg, #f5f3f6 0%, #f7f2f6 100%)',
                      borderRadius: '6px',
                      padding: '12px',
                    }}>
                      {/* Continuous threads */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{
                          fontFamily: '"Instrument Sans", sans-serif',
                          fontVariationSettings: '"wght" 400',
                          fontSize: isMobileView ? '16px' : '12px',
                          color: 'var(--pearl-text-secondary)',
                          fontStyle: 'italic',
                        }}>
                          Continuous threads
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {['Appreciation for mom & brother', 'Repeated friction with classmates'].map(theme => (
                            <div key={theme} style={{
                              fontFamily: '"Instrument Sans", sans-serif',
                              fontVariationSettings: '"wght" 400',
                              fontSize: isMobileView ? '16px' : '12px',
                              color: 'var(--pearl-text-primary)',
                            }}>
                              {theme}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* New directions */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{
                          fontFamily: '"Instrument Sans", sans-serif',
                          fontVariationSettings: '"wght" 400',
                          fontSize: isMobileView ? '16px' : '12px',
                          color: 'var(--pearl-text-secondary)',
                          fontStyle: 'italic',
                        }}>
                          New directions
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {['Anxiety about adjusting to new job', 'Exploring creative outlets'].map(theme => (
                            <div key={theme} style={{
                              fontFamily: '"Instrument Sans", sans-serif',
                              fontVariationSettings: '"wght" 400',
                              fontSize: isMobileView ? '16px' : '12px',
                              color: 'var(--pearl-text-primary)',
                            }}>
                              {theme}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
              </div>
            </div>

            {/* Emotion Graph Panel (right side on desktop, bottom on mobile) */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              width: isMobileView ? '100%' : undefined,
              maxWidth: isMobileView ? '350px' : undefined,
              margin: isMobileView ? '0 auto' : undefined,
              minHeight: isMobileView ? '650px' : undefined,
            }}>
              {/* Filter Bar at top */}
              <div style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: '12px',
                padding: '12px 20px',
              }}>
                {/* Time Filters - exact .time-filters styling */}
                <div style={{
                  position: 'relative',
                  display: 'flex',
                  height: isMobileView ? '32px' : '24px',
                  borderRadius: '4px',
                  background: 'linear-gradient(90deg, #f5f3f6, #f7f2f6)',
                  alignItems: 'center',
                  overflow: 'hidden',
                  padding: '0 2px',
                }}>
                  {/* Sliding indicator */}
                  <div style={{
                    position: 'absolute',
                    top: '3px',
                    left: '2px',
                    width: isMobileView ? '70px' : '54px',
                    height: isMobileView ? '26px' : '18px',
                    background: 'linear-gradient(45deg, #eae8ed, #eee7ee)',
                    borderRadius: '4px',
                    transition: 'transform 0.15s ease-out',
                    transform: `translateX(${activeTimeFilter * (isMobileView ? 72 : 56)}px)`,
                    zIndex: 0,
                  }} />
                  
                  {timeFilters.map((filter, i) => (
                    <button
                      key={filter}
                      onClick={() => setActiveTimeFilter(i)}
                      style={{
                        padding: '0 12px',
                        height: isMobileView ? '26px' : '18px',
                        width: isMobileView ? '70px' : '54px',
                        borderRadius: '4px',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--pearl-text-secondary)',
                        fontFamily: '"gelica", Georgia, serif',
                        fontSize: isMobileView ? '16px' : '12px',
                        cursor: 'pointer',
                        position: 'relative',
                        zIndex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Graph Content Area */}
              <div style={{
                display: 'flex',
                flex: 1,
                position: 'relative',
                minHeight: 0,
                overflow: 'hidden',
                justifyContent: isMobileView ? 'center' : undefined,
              }}>
                {/* Side Filters on LEFT */}
                <div 
                  className={`pearl-day-filters ${dayFilters.length > 8 ? 'compact' : 'normal'}`}
                  style={isMobileView ? { marginLeft: 0, gap: '24px' } : undefined}
                >
                  {dayFilters.map((day, i) => {
                    const hasNotes = dayFilterHasNotes(day);
                    return (
                      <div
                        key={day}
                        className={`pearl-day-filter ${activeDayFilter === i ? 'active' : ''} ${!hasNotes ? 'disabled' : ''}`}
                        onClick={() => hasNotes && setActiveDayFilter(i)}
                        style={isMobileView ? { 
                          fontSize: '14px',
                          width: '44px',
                          height: '24px',
                        } : undefined}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>

                {/* Main Graph Area */}
                <div 
                  ref={graphRef}
                  style={{
                    position: 'relative',
                    flex: 1,
                    margin: '12px 20px 12px 0',
                  }}
                >
                  {/* SVG for links */}
                  <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                    {filteredLinks.map((link, i) => {
                      const sourceNode = filteredNodes.find(n => n.id === link.source);
                      const targetNode = filteredNodes.find(n => n.id === link.target);
                      if (!sourceNode || !targetNode) return null;
                      const isHighlighted = hoveredNoteId === link.noteId;
                      return (
                        <line
                          key={i}
                          x1={`${sourceNode.x}%`}
                          y1={`${sourceNode.y}%`}
                          x2={`${targetNode.x}%`}
                          y2={`${targetNode.y}%`}
                          stroke={isHighlighted ? '#bfbfbf' : '#EAEAF2'}
                          strokeWidth={isHighlighted ? 2 : 1}
                          strokeOpacity={0.6}
                          style={{ transition: 'stroke 150ms ease, stroke-width 150ms ease' }}
                        />
                      );
                    })}
                  </svg>

                  {/* Emotion Labels - only show for emotions with visible nodes */}
                  {EMOTION_LABELS.map((label) => {
                    // Find nodes for this emotion
                    const emotionNodes = filteredNodes.filter(
                      n => n.emotion.toUpperCase() === label.name
                    );
                    
                    // Don't show label if no nodes for this emotion
                    if (emotionNodes.length === 0) return null;
                    
                    // Calculate average position of nodes to position label
                    const avgX = emotionNodes.reduce((sum, n) => sum + n.x, 0) / emotionNodes.length;
                    const avgY = emotionNodes.reduce((sum, n) => sum + n.y, 0) / emotionNodes.length;
                    
                    // Position label slightly above the average node position
                    const labelY = Math.min(...emotionNodes.map(n => n.y)) - 8;
                    
                    return (
                      <span
                        key={label.name}
                        style={{
                          position: 'absolute',
                          left: `${avgX}%`,
                          top: `${labelY}%`,
                          transform: 'translate(-50%, -50%)',
                          fontSize: isMobileView ? '12px' : '10px',
                          fontFamily: '"Instrument Sans", sans-serif',
                          fontVariationSettings: '"wght" 500',
                          textTransform: 'uppercase',
                          color: label.color,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          zIndex: 3,
                          transition: 'left 300ms ease, top 300ms ease',
                        }}
                      >
                        {label.name}
                      </span>
                    );
                  })}

                  {/* Nodes */}
                  {filteredNodes.map((node) => {
                    const isHighlighted = hoveredNoteId === node.noteId;
                    const opacity = nodeOpacities[node.id] || 0;
                    return (
                      <div
                        key={node.id}
                        onMouseEnter={(e) => handleNodeHover(node, e)}
                        onMouseLeave={handleNodeLeave}
                        style={{
                          position: 'absolute',
                          left: `${node.x}%`,
                          top: `${node.y}%`,
                          width: isHighlighted ? '14px' : '10px',
                          height: isHighlighted ? '14px' : '10px',
                          borderRadius: '50%',
                          backgroundColor: node.bg,
                          opacity: opacity,
                          transform: `translate(-50%, -50%) scale(${opacity})`,
                          transition: 'opacity 300ms ease, transform 300ms ease, width 150ms ease, height 150ms ease',
                          cursor: 'pointer',
                          zIndex: isHighlighted ? 10 : 1,
                        }}
                      />
                    );
                  })}

                  {/* Preview Card */}
                  {preview.visible && preview.note && (
                    <div style={{
                      position: 'absolute',
                      left: preview.positionClass.includes('left-side') ? preview.x - 15 : preview.x,
                      top: preview.y,
                      width: '220px',
                      transform: preview.positionClass === 'left-side'
                        ? 'translate(-100%, -50%)'
                        : preview.positionClass === 'top-side'
                        ? 'translate(0, -100%)'
                        : preview.positionClass === 'top-left-side'
                        ? 'translate(-100%, -100%)'
                        : preview.positionClass === 'bottom-side'
                        ? 'translate(0, 0)'
                        : preview.positionClass === 'bottom-left-side'
                        ? 'translate(-100%, 0)'
                        : 'translate(0, -50%)',
                      background: 'var(--pearl-bg-note)',
                      border: '1px solid var(--pearl-border-light)',
                      borderRadius: '8px',
                      padding: isMobileView ? '14px' : '12px',
                      boxShadow: '0 5px 12px rgba(162, 166, 217, 0.12)',
                      zIndex: 100,
                      pointerEvents: 'none',
                    }}>
                      <div style={{
                        fontFamily: '"Instrument Sans", sans-serif',
                        fontVariationSettings: '"wght" 500',
                        fontSize: isMobileView ? '15px' : '13px',
                        color: 'var(--pearl-text-primary)',
                        marginBottom: '6px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {preview.note.title}
                      </div>
                      <div style={{
                        fontFamily: '"Instrument Sans", sans-serif',
                        fontVariationSettings: '"wght" 400',
                        fontSize: isMobileView ? '14px' : '12px',
                        color: 'var(--pearl-text-primary)',
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {preview.note.content}
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: '8px',
                      }}>
                        <div style={{ display: 'flex', gap: '-2px' }}>
                          {preview.note.emotions.slice(0, 2).map((emotion, i) => (
                            <span 
                              key={emotion}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: isMobileView ? '11px' : '9px',
                                fontFamily: '"Instrument Sans", sans-serif',
                                fontVariationSettings: '"wght" 500',
                                textTransform: 'uppercase',
                                padding: i === 0 ? '2px 6px' : '0',
                                minWidth: i === 0 ? 'auto' : (isMobileView ? '18px' : '16px'),
                                height: isMobileView ? '18px' : '16px',
                                borderRadius: '9999px',
                                backgroundColor: EMOTION_NODE_COLORS[emotion] || 'rgba(150,150,150,0.2)',
                                color: EMOTION_LABELS.find(l => l.name === emotion.toUpperCase())?.color || '#666',
                                marginLeft: i > 0 ? '-4px' : '0',
                              }}
                            >
                              {i === 0 ? emotion : ''}
                            </span>
                          ))}
                        </div>
                        <span style={{
                          fontSize: isMobileView ? '11px' : '9px',
                          fontFamily: '"Instrument Sans", sans-serif',
                          fontVariationSettings: '"wght" 500',
                          color: 'var(--pearl-text-secondary)',
                          textTransform: 'uppercase',
                          marginLeft: 'auto',
                        }}>
                          {preview.note.date}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
  );

  // When embedded, return just the window
  if (embedded) {
    return windowContent;
  }

  // Normal mode with wrapper, container, and toggle
  return (
    <div className="pearl-demo-wrapper">
      <div
        className={`pearl-demo-container ${variant === 'alt' ? 'demo-reflections-alt' : 'demo-reflections'}`}
        style={{ backgroundImage: `url(/work-images/${variant === 'alt' ? 'i4.webp' : 'i3.webp'})` }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {isClient && window.innerWidth >= 768 && (
          <button className="pearl-demo-toggle" onClick={handleToggleView} style={{ position: 'absolute', bottom: '0.5rem', right: '0.5rem', zIndex: 10 }}>
            <div className="pearl-demo-toggle-switch">
              <div className={`pearl-demo-toggle-option ${!isMobileView ? 'active' : ''}`}>
                <Monitor size={16} strokeWidth={1.5} />
              </div>
              <div className={`pearl-demo-toggle-option ${isMobileView ? 'active' : ''}`}>
                <Smartphone size={16} strokeWidth={1.5} />
              </div>
            </div>
          </button>
        )}

        {windowContent}
      </div>
    </div>
  );
}
