// Comment cursor - matches /draw/CURSOR/COMMENT.svg
// Drop shadow is handled by CSS filter on the parent wrapper
export function CommentCursor() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Black fill with white stroke - hotspot is at bottom-left (3, 21) */}
      <path d="M21 11C21 15.9706 16.9706 20 12 20H7C4.79086 20 3 18.2091 3 16V11C3 6.02944 7.02944 2 12 2V2C16.9706 2 21 6.02944 21 11V11Z" fill="black"/>
      <path d="M7 20.5C4.51472 20.5 2.5 18.4853 2.5 16V11C2.5 5.7533 6.7533 1.5 12 1.5C17.2467 1.5 21.5 5.7533 21.5 11C21.5 16.2467 17.2467 20.5 12 20.5H7Z" stroke="white"/>
    </svg>
  );
}
