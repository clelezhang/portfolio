'use client';

import { useState, useCallback } from 'react';
import '../draw.css';

// Types for drawing simulation
type Point = { x: number; y: number };
type Stroke = {
  id: string;
  points: Point[];
  color: string;
  type: 'pencil' | 'ascii';
  isClaudeDrawing: boolean;
};
type Comment = {
  id: string;
  x: number;
  y: number;
  text: string;
  isClaudeComment: boolean;
};

// ASCII characters for ASCII brush
const ASCII_CHARS = ['#', '@', '*', '+', '~', '%', '&', '=', '-', '.'];

// Base cursor definitions (without Opus label)
const BASE_CURSORS = {
  // Navigation/interaction cursors
  default: { url: '/draw/CURSOR/USER.svg', hotspot: [3, 3] as [number, number], label: 'Default Pointer' },
  pointer: { url: '/draw/CURSOR/POINTER.svg', hotspot: [10, 2] as [number, number], label: 'Pointer (Clickable)' },
  grab: { url: '/draw/CURSOR/HAND.svg', hotspot: [11, 5] as [number, number], label: 'Grab (Ready)' },
  grabbing: { url: '/draw/CURSOR/GRAB.svg', hotspot: [11, 10] as [number, number], label: 'Grabbing (Active)' },
  // Tool cursors - tips at top-left for drawing tools, bottom-left for comment
  pencil: { url: '/draw/pencilcursor.svg', hotspot: [3, 3] as [number, number], label: 'Pencil' },
  eraser: { url: '/draw/erasercursor.svg', hotspot: [3, 3] as [number, number], label: 'Eraser' },
  ascii: { url: '/draw/asciicursor.svg', hotspot: [3, 3] as [number, number], label: 'ASCII' },
  comment: { url: '/draw/CURSOR/COMMENT.svg', hotspot: [3, 21] as [number, number], label: 'Comment' },
} as const;

type CursorKey = keyof typeof BASE_CURSORS;

// Tool cursors that Claude can use - pre-made SVGs with Opus label baked in (vector, no pixelation)
const OPUS_CURSORS = {
  pencil: { url: '/draw/CURSOR/CLAUDEDRAW.svg', hotspot: [3, 3] as [number, number], label: 'Claude Pencil' },
  eraser: { url: '/draw/CURSOR/CLAUDEERASE.svg', hotspot: [3, 3] as [number, number], label: 'Claude Eraser' },
  ascii: { url: '/draw/CURSOR/CLAUDEASCII.svg', hotspot: [3, 3] as [number, number], label: 'Claude ASCII' },
} as const;

type OpusCursorKey = keyof typeof OPUS_CURSORS;

// Tool cursors that Claude can use
const TOOL_CURSORS: OpusCursorKey[] = ['pencil', 'eraser', 'ascii'];

function CursorPreview({
  url,
  hotspot,
  label,
  isActive,
  onClick,
  isGenerated,
}: {
  url: string;
  hotspot: [number, number];
  label: string;
  isActive: boolean;
  onClick: () => void;
  isGenerated?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '12px 16px',
        background: isActive ? 'var(--gray-100, rgba(47, 53, 87, 0.08))' : 'white',
        border: isActive ? '2px solid var(--slate, #2F3557)' : '1px solid var(--gray-200, rgba(47, 53, 87, 0.1))',
        borderRadius: 12,
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        transition: 'all 0.15s ease',
      }}
    >
      <div style={{
        width: 80,
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--gray-50, rgba(47, 53, 87, 0.03))',
        borderRadius: 8,
        overflow: 'hidden',
      }}>
        <img src={url} alt={label} style={{ maxHeight: 36, maxWidth: 75 }} />
      </div>
      <div>
        <div style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--slate, #2F3557)',
          marginBottom: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          {label}
          {isGenerated && (
            <span style={{
              fontSize: 9,
              padding: '2px 6px',
              background: 'rgba(243, 56, 26, 0.1)',
              color: 'rgba(243, 56, 26, 0.8)',
              borderRadius: 4,
              fontWeight: 600,
            }}>
              GENERATED
            </span>
          )}
        </div>
        <div style={{
          fontSize: 11,
          color: 'var(--gray-500, rgba(47, 53, 87, 0.55))',
        }}>
          Hotspot: ({hotspot[0]}, {hotspot[1]})
        </div>
      </div>
    </button>
  );
}

function InteractiveZone({
  title,
  description,
  cursorStyle,
  children,
  style,
}: {
  title: string;
  description: string;
  cursorStyle: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        padding: 24,
        background: 'white',
        borderRadius: 16,
        border: '1px solid var(--gray-200, rgba(47, 53, 87, 0.1))',
        cursor: cursorStyle,
        minHeight: 180,
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      <div style={{ marginBottom: 12 }}>
        <h3 style={{
          margin: 0,
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--slate, #2F3557)',
        }}>
          {title}
        </h3>
        <p style={{
          margin: '4px 0 0',
          fontSize: 12,
          color: 'var(--gray-500, rgba(47, 53, 87, 0.55))',
        }}>
          {description}
        </p>
      </div>
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--gray-50, rgba(47, 53, 87, 0.03))',
        borderRadius: 8,
        padding: 16,
      }}>
        {children || (
          <span style={{
            color: 'var(--gray-400, rgba(47, 53, 87, 0.35))',
            fontSize: 13,
          }}>
            Move cursor here to test
          </span>
        )}
      </div>
    </div>
  );
}

function DraggableBox({ cursorGrab, cursorGrabbing }: { cursorGrab: string; cursorGrabbing: string }) {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - startPos.x,
        y: e.clientY - startPos.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        cursor: isDragging ? cursorGrabbing : cursorGrab,
      }}
    >
      <div
        onMouseDown={handleMouseDown}
        style={{
          width: 60,
          height: 60,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 12,
          position: 'absolute',
          left: `calc(50% + ${position.x}px - 30px)`,
          top: `calc(50% + ${position.y}px - 30px)`,
          boxShadow: isDragging
            ? '0 10px 30px rgba(102, 126, 234, 0.4)'
            : '0 4px 12px rgba(102, 126, 234, 0.3)',
          transition: isDragging ? 'none' : 'box-shadow 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 11,
          fontWeight: 500,
        }}
      >
        Drag me
      </div>
    </div>
  );
}

function ClickableButtons({ cursorPointer }: { cursorPointer: string }) {
  const [clickCount, setClickCount] = useState(0);

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
      <button
        onClick={() => setClickCount(c => c + 1)}
        style={{
          padding: '10px 20px',
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          border: 'none',
          borderRadius: 8,
          color: 'white',
          fontSize: 12,
          fontWeight: 500,
          cursor: cursorPointer,
        }}
      >
        Clicks: {clickCount}
      </button>
      <button
        onClick={() => setClickCount(0)}
        style={{
          padding: '10px 20px',
          background: 'var(--gray-200, rgba(47, 53, 87, 0.1))',
          border: 'none',
          borderRadius: 8,
          color: 'var(--slate, #2F3557)',
          fontSize: 12,
          fontWeight: 500,
          cursor: cursorPointer,
        }}
      >
        Reset
      </button>
    </div>
  );
}

export default function CursorTestPage() {
  const [selectedCursor, setSelectedCursor] = useState<CursorKey>('default');
  const [selectedClaudeTool, setSelectedClaudeTool] = useState<OpusCursorKey>('pencil');

  // Build cursor CSS strings
  const getCursorStyle = useCallback((key: CursorKey) => {
    const cursor = BASE_CURSORS[key];
    return `url('${cursor.url}') ${cursor.hotspot[0]} ${cursor.hotspot[1]}, auto`;
  }, []);

  // Get Claude cursor style from pre-made SVGs (no runtime generation, crisp vectors)
  const getOpusCursorStyle = useCallback((key: OpusCursorKey) => {
    const cursor = OPUS_CURSORS[key];
    return `url('${cursor.url}') ${cursor.hotspot[0]} ${cursor.hotspot[1]}, auto`;
  }, []);

  const userCursorStyle = getCursorStyle(selectedCursor);
  const claudeCursorStyle = getOpusCursorStyle(selectedClaudeTool);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--lightgray, #FBFBFC)',
      fontFamily: 'var(--font-untitled-sans), -apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        padding: '24px 32px',
        borderBottom: '1px solid var(--gray-100, rgba(47, 53, 87, 0.08))',
        background: 'white',
      }}>
        <h1 style={{
          margin: 0,
          fontSize: 20,
          fontWeight: 600,
          color: 'var(--slate, #2F3557)',
          letterSpacing: '-0.02em',
        }}>
          Cursor Test Page
        </h1>
        <p style={{
          margin: '4px 0 0',
          fontSize: 13,
          color: 'var(--gray-500, rgba(47, 53, 87, 0.55))',
        }}>
          Test custom cursors for the draw app. Claude cursors are dynamically generated with an &quot;opus&quot; label.
        </p>
      </div>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 85px)' }}>
        {/* Sidebar - Cursor Selection */}
        <div style={{
          width: 340,
          padding: 24,
          borderRight: '1px solid var(--gray-100, rgba(47, 53, 87, 0.08))',
          background: 'white',
          overflowY: 'auto',
        }}>
          {/* User Cursors - Navigation */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{
              margin: '0 0 16px',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--gray-500, rgba(47, 53, 87, 0.55))',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Navigation Cursors
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(['default', 'pointer', 'grab', 'grabbing'] as CursorKey[]).map((key) => (
                <CursorPreview
                  key={key}
                  url={BASE_CURSORS[key].url}
                  hotspot={BASE_CURSORS[key].hotspot}
                  label={BASE_CURSORS[key].label}
                  isActive={selectedCursor === key}
                  onClick={() => setSelectedCursor(key)}
                />
              ))}
            </div>
          </div>

          {/* User Cursors - Tools */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{
              margin: '0 0 16px',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--gray-500, rgba(47, 53, 87, 0.55))',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Tool Cursors (User)
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(['pencil', 'eraser', 'ascii', 'comment'] as CursorKey[]).map((key) => (
                <CursorPreview
                  key={key}
                  url={BASE_CURSORS[key].url}
                  hotspot={BASE_CURSORS[key].hotspot}
                  label={BASE_CURSORS[key].label}
                  isActive={selectedCursor === key}
                  onClick={() => setSelectedCursor(key)}
                />
              ))}
            </div>
          </div>

          {/* Claude Cursors (Pre-made SVGs with Opus label) */}
          <div>
            <h2 style={{
              margin: '0 0 8px',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--gray-500, rgba(47, 53, 87, 0.55))',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Claude Cursors (Opus)
            </h2>
            <p style={{
              margin: '0 0 16px',
              fontSize: 11,
              color: 'var(--gray-400, rgba(47, 53, 87, 0.35))',
            }}>
              Pre-made SVGs with Opus label (crisp vectors)
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {TOOL_CURSORS.map((key) => {
                const opusCursor = OPUS_CURSORS[key];
                return (
                  <CursorPreview
                    key={key}
                    url={opusCursor.url}
                    hotspot={opusCursor.hotspot}
                    label={opusCursor.label}
                    isActive={selectedClaudeTool === key}
                    onClick={() => setSelectedClaudeTool(key)}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content - Test Zones */}
        <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
          {/* Selected User Cursor Test */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{
              margin: '0 0 16px',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--slate, #2F3557)',
            }}>
              Selected User Cursor: {BASE_CURSORS[selectedCursor].label}
            </h2>
            <div
              style={{
                padding: 32,
                background: 'white',
                borderRadius: 16,
                border: '1px solid var(--gray-200, rgba(47, 53, 87, 0.1))',
                cursor: userCursorStyle,
                minHeight: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ color: 'var(--gray-400, rgba(47, 53, 87, 0.35))', fontSize: 14 }}>
                Move your cursor here to test the selected user cursor
              </span>
            </div>
          </div>

          {/* Selected Claude Cursor Test */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{
              margin: '0 0 16px',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--slate, #2F3557)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              Selected Claude Cursor: Claude {OPUS_CURSORS[selectedClaudeTool].label}
              <span style={{
                fontSize: 10,
                padding: '3px 8px',
                background: 'rgba(243, 56, 26, 0.1)',
                color: 'rgba(243, 56, 26, 0.8)',
                borderRadius: 4,
                fontWeight: 600,
              }}>
                + opus
              </span>
            </h2>
            <div
              style={{
                padding: 32,
                background: 'linear-gradient(135deg, rgba(243, 56, 26, 0.05) 0%, rgba(243, 56, 26, 0.02) 100%)',
                borderRadius: 16,
                border: '1px solid rgba(243, 56, 26, 0.15)',
                cursor: claudeCursorStyle,
                minHeight: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ color: 'rgba(243, 56, 26, 0.5)', fontSize: 14 }}>
                Move your cursor here to test the Claude cursor with dynamically generated Opus label
              </span>
            </div>
          </div>

          {/* Interactive Test Zones */}
          <h2 style={{
            margin: '0 0 16px',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--slate, #2F3557)',
          }}>
            Interactive Test Zones
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}>
            {/* Pointer Test */}
            <InteractiveZone
              title="Clickable Elements"
              description="Hover over buttons to see pointer cursor"
              cursorStyle={getCursorStyle('default')}
            >
              <ClickableButtons
                cursorPointer={getCursorStyle('pointer')}
              />
            </InteractiveZone>

            {/* Grab/Hand Test */}
            <InteractiveZone
              title="Draggable Element"
              description="Drag the box to see grab/hand cursors"
              cursorStyle={getCursorStyle('default')}
              style={{ minHeight: 220 }}
            >
              <DraggableBox
                cursorGrab={getCursorStyle('grab')}
                cursorGrabbing={getCursorStyle('grabbing')}
              />
            </InteractiveZone>

            {/* All Tool Cursors */}
            <InteractiveZone
              title="All Tool Cursors (User)"
              description="Hover each section to see different tool cursors"
              cursorStyle={getCursorStyle('default')}
            >
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 8,
                width: '100%',
              }}>
                {(['pencil', 'eraser', 'ascii', 'comment'] as CursorKey[]).map((key) => (
                  <div
                    key={key}
                    style={{
                      padding: 16,
                      background: 'white',
                      borderRadius: 8,
                      border: '1px solid var(--gray-200, rgba(47, 53, 87, 0.1))',
                      cursor: getCursorStyle(key),
                      textAlign: 'center',
                      fontSize: 11,
                      color: 'var(--gray-500, rgba(47, 53, 87, 0.55))',
                      fontWeight: 500,
                    }}
                  >
                    {BASE_CURSORS[key].label}
                  </div>
                ))}
              </div>
            </InteractiveZone>

            {/* All Claude Cursors (with Opus) */}
            <InteractiveZone
              title="All Claude Cursors (Opus)"
              description="Hover each section to see Claude's cursors with Opus label"
              cursorStyle={getCursorStyle('default')}
            >
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
                width: '100%',
              }}>
                {TOOL_CURSORS.map((key) => (
                  <div
                    key={key}
                    style={{
                      padding: 16,
                      background: 'rgba(243, 56, 26, 0.05)',
                      borderRadius: 8,
                      border: '1px solid rgba(243, 56, 26, 0.15)',
                      cursor: getOpusCursorStyle(key),
                      textAlign: 'center',
                      fontSize: 11,
                      color: 'rgba(243, 56, 26, 0.7)',
                      fontWeight: 500,
                    }}
                  >
                    {BASE_CURSORS[key].label}
                  </div>
                ))}
              </div>
            </InteractiveZone>
          </div>

          {/* Canvas Simulation */}
          <div style={{ marginTop: 32 }}>
            <h2 style={{
              margin: '0 0 16px',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--slate, #2F3557)',
            }}>
              Canvas Simulation
            </h2>
            <div style={{
              background: 'white',
              borderRadius: 16,
              border: '1px solid var(--gray-200, rgba(47, 53, 87, 0.1))',
              overflow: 'hidden',
            }}>
              {/* Toolbar */}
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--gray-100, rgba(47, 53, 87, 0.08))',
                display: 'flex',
                gap: 32,
                alignItems: 'center',
              }}>
                {/* User tools */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--gray-500, rgba(47, 53, 87, 0.55))', fontWeight: 500 }}>User:</span>
                  {(['pencil', 'eraser', 'ascii', 'comment'] as CursorKey[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => setSelectedCursor(key)}
                      style={{
                        padding: '6px 10px',
                        fontSize: 11,
                        fontWeight: 500,
                        border: selectedCursor === key ? '2px solid var(--slate, #2F3557)' : '1px solid var(--gray-200, rgba(47, 53, 87, 0.1))',
                        borderRadius: 6,
                        background: selectedCursor === key ? 'var(--gray-100, rgba(47, 53, 87, 0.08))' : 'white',
                        color: 'var(--slate, #2F3557)',
                        cursor: getCursorStyle('pointer'),
                      }}
                    >
                      {BASE_CURSORS[key].label}
                    </button>
                  ))}
                </div>

                {/* Claude tools */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'rgba(243, 56, 26, 0.7)', fontWeight: 500 }}>Claude:</span>
                  {TOOL_CURSORS.map((key) => (
                    <button
                      key={key}
                      onClick={() => setSelectedClaudeTool(key)}
                      style={{
                        padding: '6px 10px',
                        fontSize: 11,
                        fontWeight: 500,
                        border: selectedClaudeTool === key ? '2px solid rgba(243, 56, 26, 0.8)' : '1px solid rgba(243, 56, 26, 0.2)',
                        borderRadius: 6,
                        background: selectedClaudeTool === key ? 'rgba(243, 56, 26, 0.1)' : 'white',
                        color: 'rgba(243, 56, 26, 0.8)',
                        cursor: getCursorStyle('pointer'),
                      }}
                    >
                      {BASE_CURSORS[key].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Canvas Area */}
              <div
                style={{
                  height: 400,
                  background: 'repeating-linear-gradient(0deg, transparent, transparent 19px, var(--gray-100, rgba(47, 53, 87, 0.05)) 19px, var(--gray-100, rgba(47, 53, 87, 0.05)) 20px), repeating-linear-gradient(90deg, transparent, transparent 19px, var(--gray-100, rgba(47, 53, 87, 0.05)) 19px, var(--gray-100, rgba(47, 53, 87, 0.05)) 20px)',
                  position: 'relative',
                }}
              >
                {/* User drawing area */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '50%',
                    height: '100%',
                    cursor: getCursorStyle(selectedCursor),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRight: '2px dashed var(--gray-200, rgba(47, 53, 87, 0.1))',
                  }}
                >
                  <div style={{
                    padding: '8px 16px',
                    background: 'white',
                    borderRadius: 8,
                    fontSize: 12,
                    color: 'var(--gray-500, rgba(47, 53, 87, 0.55))',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    pointerEvents: 'none',
                  }}>
                    User: {BASE_CURSORS[selectedCursor].label}
                  </div>
                </div>

                {/* Claude drawing area */}
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    width: '50%',
                    height: '100%',
                    cursor: getOpusCursorStyle(selectedClaudeTool),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(243, 56, 26, 0.02)',
                  }}
                >
                  <div style={{
                    padding: '8px 16px',
                    background: 'white',
                    borderRadius: 8,
                    fontSize: 12,
                    color: 'rgba(243, 56, 26, 0.7)',
                    boxShadow: '0 2px 8px rgba(243, 56, 26, 0.1)',
                    pointerEvents: 'none',
                  }}>
                    Claude: {OPUS_CURSORS[selectedClaudeTool].label} + opus
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div style={{
                padding: 16,
                borderTop: '1px solid var(--gray-100, rgba(47, 53, 87, 0.08))',
                display: 'flex',
                gap: 24,
                justifyContent: 'center',
                fontSize: 12,
                color: 'var(--gray-500, rgba(47, 53, 87, 0.55))',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 12,
                    height: 12,
                    borderRadius: 4,
                    background: 'white',
                    border: '1px solid var(--gray-200, rgba(47, 53, 87, 0.1))',
                  }} />
                  User cursor (no label)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 12,
                    height: 12,
                    borderRadius: 4,
                    background: 'rgba(243, 56, 26, 0.1)',
                    border: '1px solid rgba(243, 56, 26, 0.2)',
                  }} />
                  Claude cursor (+ opus label)
                </div>
              </div>
            </div>
          </div>

          {/* Technical Info */}
          <div style={{
            marginTop: 32,
            padding: 20,
            background: 'var(--gray-50, rgba(47, 53, 87, 0.03))',
            borderRadius: 12,
            fontSize: 12,
            color: 'var(--gray-500, rgba(47, 53, 87, 0.55))',
          }}>
            <h3 style={{
              margin: '0 0 12px',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--slate, #2F3557)',
            }}>
              How Cursor Implementation Works
            </h3>
            <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
              <li>User cursors use base SVG files from <code>/draw/</code> directory</li>
              <li>Claude cursors use pre-made SVGs with the Opus label baked in</li>
              <li>Using vector SVGs (not canvas-composited) keeps cursors crisp at any scale</li>
              <li>CSS cursor property: <code>url(&apos;path.svg&apos;) hotspotX hotspotY, auto</code></li>
              <li>Hotspot coordinates define where clicks register (tip of pencil, etc.)</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
