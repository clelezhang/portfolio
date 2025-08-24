interface IconProps {
  className?: string;
  size?: number;
}

export default function EnvelopeIcon({ 
  className = "", 
  size 
}: IconProps) {
  return (
    <svg 
      width={size || 20} 
      height={size || 20} 
      fill="none" 
      viewBox="0 0 20 20"
      className={className}
      aria-label="envelope"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        fill="currentColor" 
        d="M1.667 5c0-.92.746-1.666 1.666-1.666h13.334c.92 0 1.666.746 1.666 1.667v.735L10 9.902 1.666 5.736V5Z"
      />
      <path 
        fill="currentColor" 
        d="M1.667 7.599v7.402c0 .92.746 1.666 1.666 1.666h13.334c.92 0 1.666-.746 1.666-1.666V7.599l-7.588 3.794a1.667 1.667 0 0 1-1.49 0L1.665 7.599Z"
      />
    </svg>
  );
}
