interface CloseIconProps {
  size?: number;
  color?: string;
}

export function CloseIcon({ size = 12, color = '#9CA3AF' }: CloseIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M3 3l6 6M9 3l-6 6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
