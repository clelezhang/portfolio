interface IconProps {
  className?: string;
  size?: number;
}

export default function HeartIcon({ 
  className = "", 
  size 
}: IconProps) {
  return (
    <svg 
      width={size || 16} 
      height={size || 16} 
      fill="none" 
      viewBox="0 0 16 16"
      className={className}
      aria-label="heart"
      role="img"
    >
      <path
        d="M8.328 14.248c5.685-3.186 7.084-6.98 6.014-9.646-.52-1.295-1.609-2.223-2.894-2.51-1.132-.251-2.369.003-3.446.858-1.078-.855-2.315-1.11-3.447-.857-1.285.286-2.375 1.214-2.894 2.509-1.07 2.667.33 6.46 6.015 9.646.202.114.45.114.652 0Z"
        fill="currentColor"
      />
    </svg>
  );
}