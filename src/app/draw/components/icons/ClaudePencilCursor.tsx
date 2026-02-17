// Claude's pencil cursor with "opus" label
// Uses pre-made SVG for crisp vector rendering
export function ClaudePencilCursor() {
  return (
    <img
      src="/draw/cursors/claude-draw.svg"
      alt="Claude pencil cursor"
      width={59}
      height={26}
      style={{
        display: 'block',
        pointerEvents: 'none',
      }}
    />
  );
}
