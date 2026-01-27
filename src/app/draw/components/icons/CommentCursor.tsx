interface CommentCursorProps {
  color: string;
}

export function CommentCursor({ color }: CommentCursorProps) {
  // SVG filter removed for Safari compatibility - CSS drop-shadow applied on parent wrapper
  return (
    <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'translate(0px, 0px)' }}>
      {/* Colored fill */}
      <path d="M3.5 3.5C3.5 2.94772 3.94772 2.5 4.5 2.5H12.5C17.4706 2.5 21.5 6.52944 21.5 11.5C21.5 16.4706 17.4706 20.5 12.5 20.5C7.52944 20.5 3.5 16.4706 3.5 11.5V3.5Z" fill={color}/>
      {/* White outline */}
      <path d="M12.5 1.75C17.8848 1.75 22.25 6.11522 22.25 11.5C22.25 16.8848 17.8848 21.25 12.5 21.25C7.11522 21.25 2.75 16.8848 2.75 11.5V3.5C2.75 2.5335 3.5335 1.75 4.5 1.75H12.5Z" stroke="white" strokeWidth="1.5"/>
    </svg>
  );
}
