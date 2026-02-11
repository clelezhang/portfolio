interface SubmitArrowIconProps {
  size?: number;
  color?: string;
}

export function SubmitArrowIcon({ size = 12, color = 'white' }: SubmitArrowIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M6 10V2M3 5l3-3 3 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
