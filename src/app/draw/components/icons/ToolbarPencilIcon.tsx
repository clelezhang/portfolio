interface ToolbarPencilIconProps {
  color: string;
  className?: string;
  style?: React.CSSProperties;
  tipAnimation?: string;
}

// Toolbar pencil icon with dynamic tip color while preserving gradient appearance
export function ToolbarPencilIcon({ color, className, style, tipAnimation }: ToolbarPencilIconProps) {
  // Generate unique IDs for this instance to avoid conflicts
  const id = Math.random().toString(36).substr(2, 9);

  return (
    <svg
      width="40"
      height="72"
      viewBox="0 0 40 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <g clipPath={`url(#clip_${id})`}>
        {/* Pencil tip - dynamic color */}
        <g filter={`url(#filter_${id})`}>
          <path d="M18.5637 6.49688C18.8881 5.63171 20.1119 5.63171 20.4363 6.49688L27 24H12L18.5637 6.49688Z" fill={color} style={{ transition: tipAnimation ? undefined : 'fill 110ms ease-out', animation: tipAnimation }}/>
        </g>
        {/* Pencil tip stroke */}
        <path d="M19.0322 6.67285C19.1944 6.24026 19.8056 6.24027 19.9678 6.67285L26.2783 23.5H12.7217L19.0322 6.67285Z" stroke="#02061D" strokeOpacity="0.1"/>
        {/* Pencil body - base fill */}
        <path d="M2 72.1217V50.7296C2 48.2939 2.44493 45.8786 3.31289 43.6028L12.2545 20.1572C12.4023 19.7696 12.7741 19.5135 13.1889 19.5135H25.8227C26.2317 19.5135 26.5995 19.7627 26.7513 20.1425L36.0725 43.4724C37.0155 45.8327 37.5 48.3511 37.5 50.8928V72.1217H2Z" fill="#F3F0ED"/>
        {/* Pencil body - gradient overlays */}
        <path d="M2 72.1217V50.7296C2 48.2939 2.44493 45.8786 3.31289 43.6028L12.2545 20.1572C12.4023 19.7696 12.7741 19.5135 13.1889 19.5135H25.8227C26.2317 19.5135 26.5995 19.7627 26.7513 20.1425L36.0725 43.4724C37.0155 45.8327 37.5 48.3511 37.5 50.8928V72.1217H2Z" fill={`url(#paint0_${id})`}/>
        <path d="M2 72.1217V50.7296C2 48.2939 2.44493 45.8786 3.31289 43.6028L12.2545 20.1572C12.4023 19.7696 12.7741 19.5135 13.1889 19.5135H25.8227C26.2317 19.5135 26.5995 19.7627 26.7513 20.1425L36.0725 43.4724C37.0155 45.8327 37.5 48.3511 37.5 50.8928V72.1217H2Z" fill={`url(#paint1_${id})`} fillOpacity="0.3"/>
        <path d="M2 72.1217V50.7296C2 48.2939 2.44493 45.8786 3.31289 43.6028L12.2545 20.1572C12.4023 19.7696 12.7741 19.5135 13.1889 19.5135H25.8227C26.2317 19.5135 26.5995 19.7627 26.7513 20.1425L36.0725 43.4724C37.0155 45.8327 37.5 48.3511 37.5 50.8928V72.1217H2Z" fill={`url(#paint2_${id})`}/>
        <path d="M2 72.1217V50.7296C2 48.2939 2.44493 45.8786 3.31289 43.6028L12.2545 20.1572C12.4023 19.7696 12.7741 19.5135 13.1889 19.5135H25.8227C26.2317 19.5135 26.5995 19.7627 26.7513 20.1425L36.0725 43.4724C37.0155 45.8327 37.5 48.3511 37.5 50.8928V72.1217H2Z" fill={`url(#paint3_${id})`} fillOpacity="0.2"/>
        <path d="M2 72.1217V50.7296C2 48.2939 2.44493 45.8786 3.31289 43.6028L12.2545 20.1572C12.4023 19.7696 12.7741 19.5135 13.1889 19.5135H25.8227C26.2317 19.5135 26.5995 19.7627 26.7513 20.1425L36.0725 43.4724C37.0155 45.8327 37.5 48.3511 37.5 50.8928V72.1217H2Z" fill={`url(#paint4_${id})`} fillOpacity="0.2"/>
        {/* Pencil body stroke */}
        <path d="M13.1885 20.0135H25.8223C26.0268 20.0135 26.2112 20.1381 26.2871 20.328L35.6084 43.6581C36.5277 45.9592 37 48.4145 37 50.8925V71.6219H2.5V50.7294C2.50003 48.3546 2.93407 46 3.78027 43.7811L12.7217 20.3358C12.7955 20.1422 12.9812 20.0137 13.1885 20.0135Z" stroke="#0F1931" strokeOpacity="0.1"/>
      </g>
      <defs>
        {/* Inner shadow filter for pencil tip */}
        <filter id={`filter_${id}`} x="12" y="4.84802" width="15" height="19.152" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix"/>
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feOffset dy="-1"/>
          <feGaussianBlur stdDeviation="2"/>
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
          <feBlend mode="normal" in2="shape" result="effect1_innerShadow"/>
        </filter>
        {/* Gradient 0 - bottom warm glow */}
        <linearGradient id={`paint0_${id}`} x1="20.0849" y1="44.9349" x2="20" y2="69.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0"/>
          <stop offset="1" stopColor="#F9F1E7"/>
        </linearGradient>
        {/* Gradient 1 - side shading (warm brown) */}
        <linearGradient id={`paint1_${id}`} x1="38.8396" y1="43.9417" x2="0.660377" y2="43.9417" gradientUnits="userSpaceOnUse">
          <stop stopColor="#B2753F"/>
          <stop offset="0.245082" stopColor="#B2753F" stopOpacity="0.75"/>
          <stop offset="0.294077" stopColor="#B2753F" stopOpacity="0"/>
          <stop offset="0.374934" stopColor="#B2753F" stopOpacity="0.25"/>
          <stop offset="0.623271" stopColor="#B2753F" stopOpacity="0.1"/>
          <stop offset="0.69" stopColor="#B2753F" stopOpacity="0"/>
          <stop offset="0.748823" stopColor="#B2753F" stopOpacity="0.5"/>
          <stop offset="1" stopColor="#B2753F"/>
        </linearGradient>
        {/* Gradient 2 - main body gradient */}
        <linearGradient id={`paint2_${id}`} x1="20.0849" y1="15.6377" x2="20" y2="60.5" gradientUnits="userSpaceOnUse">
          <stop offset="0.01" stopColor="#F4EADE"/>
          <stop offset="0.709254" stopColor="#F9F1E7" stopOpacity="0.85"/>
          <stop offset="1" stopColor="white" stopOpacity="0"/>
        </linearGradient>
        {/* Gradient 3 - left edge shadow */}
        <linearGradient id={`paint3_${id}`} x1="16.066" y1="46.4246" x2="2.6469" y2="41.8993" gradientUnits="userSpaceOnUse">
          <stop stopColor="#B2753F" stopOpacity="0"/>
          <stop offset="1" stopColor="#B2753F"/>
        </linearGradient>
        {/* Gradient 4 - right edge shadow */}
        <linearGradient id={`paint4_${id}`} x1="28.1226" y1="42.2038" x2="35.2055" y2="40.0324" gradientUnits="userSpaceOnUse">
          <stop stopColor="#B2753F" stopOpacity="0"/>
          <stop offset="1" stopColor="#B2753F"/>
        </linearGradient>
        <clipPath id={`clip_${id}`}>
          <rect width="40" height="72" fill="white"/>
        </clipPath>
      </defs>
    </svg>
  );
}
