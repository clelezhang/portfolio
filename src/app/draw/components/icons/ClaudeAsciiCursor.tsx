// Claude's ASCII cursor with "opus" label
// Uses pre-made SVG for crisp vector rendering
export function ClaudeAsciiCursor() {
  return (
    <img
      src="/draw/CURSOR/CLAUDEASCII.svg"
      alt="Claude ASCII cursor"
      width={65}
      height={34}
      style={{
        display: 'block',
        pointerEvents: 'none',
      }}
    />
  );
}
