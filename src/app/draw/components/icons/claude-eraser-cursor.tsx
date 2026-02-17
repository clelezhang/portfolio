// Claude's eraser cursor with "opus" label
// Uses pre-made SVG for crisp vector rendering
export function ClaudeEraserCursor() {
  return (
    <img
      src="/draw/cursors/claude-erase.svg"
      alt="Claude eraser cursor"
      width={65}
      height={34}
      style={{
        display: 'block',
        pointerEvents: 'none',
      }}
    />
  );
}
