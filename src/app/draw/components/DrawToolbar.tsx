import { Tool } from '../types';
import { COLOR_PALETTES } from '../constants';
import { PencilToolIcon } from './icons/PencilToolIcon';

interface DrawToolbarProps {
  tool: Tool;
  setTool: (tool: Tool) => void;
  asciiStroke: boolean;
  setAsciiStroke: (value: boolean) => void;
  strokeColor: string;
  setStrokeColor: (color: string) => void;
  strokeSize: number;
  setStrokeSize: (size: number) => void;
  paletteIndex: number;
  setPaletteIndex: (index: number) => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  isLoading: boolean;
  onYourTurn: () => void;
  onClear: () => void;
  onSave: () => void;
}

export function DrawToolbar({
  tool,
  setTool,
  asciiStroke,
  setAsciiStroke,
  strokeColor,
  setStrokeColor,
  strokeSize,
  setStrokeSize,
  paletteIndex,
  setPaletteIndex,
  showSettings,
  setShowSettings,
  isLoading,
  onYourTurn,
  onClear,
  onSave,
}: DrawToolbarProps) {
  return (
    <div className="draw-toolbar">
      {/* Left section: profiles + social */}
      <div className="draw-toolbar-section">
        <div className="draw-icon-btn draw-icon-btn--no-hover">
          <img src="/draw/user.svg" alt="" className="w-6 h-6 draw-img-no-anim draw-user-icon" />
        </div>
        <button
          onClick={onYourTurn}
          disabled={isLoading}
          className="draw-icon-btn disabled:opacity-50"
          title="Claude's turn"
        >
          <img src="/draw/claude.svg" alt="" className="w-6 h-6" />
        </button>
        <div className="draw-divider" />
        <button
          onClick={() => setTool('comment')}
          className={`draw-icon-btn ${tool === 'comment' ? 'draw-icon-btn--active' : ''}`}
          title="Comment"
        >
          <img src="/draw/comment.svg" alt="" className="w-6 h-6" />
        </button>
        <button className="draw-icon-btn" title="React">
          <img src="/draw/react.svg" alt="" className="w-6 h-6" />
        </button>
      </div>

      {/* Center section: floating toolbar */}
      <div className="draw-toolbar-center">
        <div className="draw-tools-container">
          {/* Pencil tool */}
          <button
            onClick={() => { setTool('draw'); setAsciiStroke(false); }}
            className="draw-tool-btn draw-tool-btn--pencil"
            title="Pencil (SVG/shapes)"
          >
            <PencilToolIcon
              color={strokeColor}
              isSelected={tool === 'draw' && !asciiStroke}
            />
          </button>
          {/* ASCII tool */}
          <button
            onClick={() => { setTool('draw'); setAsciiStroke(true); }}
            className="draw-tool-btn draw-tool-btn--ascii"
            title="ASCII art"
          >
            <img
              src="/draw/cursor.svg"
              alt=""
              className={`draw-tool-icon draw-tool-icon--ascii ${tool === 'draw' && asciiStroke ? 'draw-tool-icon--selected' : ''}`}
              style={{ bottom: tool === 'draw' && asciiStroke ? '6px' : '-8px' }}
            />
          </button>
          {/* Eraser tool */}
          <button
            onClick={() => setTool('erase')}
            className="draw-tool-btn draw-tool-btn--eraser"
            title="Eraser"
          >
            <img
              src="/draw/eraser.svg"
              alt=""
              className={`draw-tool-icon draw-tool-icon--eraser ${tool === 'erase' ? 'draw-tool-icon--selected' : ''}`}
              style={{ bottom: tool === 'erase' ? '-6px' : '-20px' }}
            />
          </button>
        </div>

        {/* Colors and size section */}
        <div className="draw-colors-section">
          <div className="draw-color-palette">
            {COLOR_PALETTES[paletteIndex].map((color) => (
              <button
                key={color}
                onClick={() => setStrokeColor(color)}
                className="draw-color-btn"
                style={{ backgroundColor: color }}
                aria-label={`Color ${color}`}
              />
            ))}
            <button
              onClick={() => {
                const nextIndex = (paletteIndex + 1) % COLOR_PALETTES.length;
                setPaletteIndex(nextIndex);
                setStrokeColor(COLOR_PALETTES[nextIndex][0]);
              }}
              className="draw-icon-btn draw-icon-btn--sm"
              title="Change color palette"
            >
              <img src="/draw/dice.svg" alt="" className="w-6 h-6" />
            </button>
          </div>

          <button
            onClick={() => setStrokeSize(2)}
            className={`draw-icon-btn draw-icon-btn--sm ${strokeSize === 2 ? 'draw-icon-btn--active' : ''}`}
            title="Thin"
          >
            <img src="/draw/thin.svg" alt="" className="w-6 h-6 draw-stroke-icon" />
          </button>
          <button
            onClick={() => setStrokeSize(6)}
            className={`draw-icon-btn draw-icon-btn--sm ${strokeSize === 6 ? 'draw-icon-btn--active' : ''}`}
            title="Medium"
          >
            <img src="/draw/medium.svg" alt="" className="w-6 h-6 draw-stroke-icon" />
          </button>
          <button
            onClick={() => setStrokeSize(12)}
            className={`draw-icon-btn draw-icon-btn--sm ${strokeSize === 12 ? 'draw-icon-btn--active' : ''}`}
            title="Thick"
          >
            <img src="/draw/thick.svg" alt="" className="w-6 h-6 draw-stroke-icon" />
          </button>
        </div>
      </div>

      {/* Right section: actions */}
      <div className="draw-toolbar-section">
        <button onClick={onClear} className="draw-icon-btn" title="Clear canvas">
          <img src="/draw/clear.svg" alt="" className="w-6 h-6" />
        </button>
        <button onClick={onSave} className="draw-icon-btn" title="Save image">
          <img src="/draw/save.svg" alt="" className="w-6 h-6" />
        </button>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`draw-icon-btn ${showSettings ? 'draw-icon-btn--active' : ''}`}
          title="Settings"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
