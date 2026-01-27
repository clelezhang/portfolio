interface PencilToolIconProps {
  color: string;
  isSelected: boolean;
}

export function PencilToolIcon({ color, isSelected }: PencilToolIconProps) {
  return (
    <svg
      viewBox="0 0 27 51"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`draw-tool-icon draw-tool-icon--pencil ${isSelected ? 'draw-tool-icon--selected' : ''}`}
      style={{ bottom: isSelected ? '-2px' : '-18px' }}
    >
      <g filter="url(#filter0_i_pencil)">
        <path d="M12.1262 2.559C12.4469 1.68489 13.6831 1.68489 14.0038 2.55899L16.9737 10.6543H9.15625L12.1262 2.559Z" fill={color}/>
      </g>
      <path d="M12.5957 2.73145C12.756 2.29439 13.3738 2.2944 13.5342 2.73145L16.2578 10.1543H9.87207L12.5957 2.73145Z" stroke="#02061D" strokeOpacity="0.1"/>
      <path d="M0 50.6772V35.8205C0 33.4065 0.437028 31.0124 1.28994 28.7541L8.54507 9.54426C8.69205 9.15511 9.06459 8.89758 9.48057 8.89758H16.8015C17.2129 8.89758 17.5824 9.14959 17.7325 9.53265L25.2261 28.6505C26.1376 30.9759 26.6055 33.4515 26.6055 35.9492V50.6772H0Z" fill="#F3F0ED"/>
      <path d="M0 50.6772V35.8205C0 33.4065 0.437028 31.0124 1.28994 28.7541L8.54507 9.54426C8.69205 9.15511 9.06459 8.89758 9.48057 8.89758H16.8015C17.2129 8.89758 17.5824 9.14959 17.7325 9.53265L25.2261 28.6505C26.1376 30.9759 26.6055 33.4515 26.6055 35.9492V50.6772H0Z" fill="url(#paint0_linear_pencil)"/>
      <path d="M0 50.6772V35.8205C0 33.4065 0.437028 31.0124 1.28994 28.7541L8.54507 9.54426C8.69205 9.15511 9.06459 8.89758 9.48057 8.89758H16.8015C17.2129 8.89758 17.5824 9.14959 17.7325 9.53265L25.2261 28.6505C26.1376 30.9759 26.6055 33.4515 26.6055 35.9492V50.6772H0Z" fill="url(#paint1_linear_pencil)" fillOpacity="0.3"/>
      <path d="M0 50.6772V35.8205C0 33.4065 0.437028 31.0124 1.28994 28.7541L8.54507 9.54426C8.69205 9.15511 9.06459 8.89758 9.48057 8.89758H16.8015C17.2129 8.89758 17.5824 9.14959 17.7325 9.53265L25.2261 28.6505C26.1376 30.9759 26.6055 33.4515 26.6055 35.9492V50.6772H0Z" fill="url(#paint2_linear_pencil)"/>
      <path d="M0 50.6772V35.8205C0 33.4065 0.437028 31.0124 1.28994 28.7541L8.54507 9.54426C8.69205 9.15511 9.06459 8.89758 9.48057 8.89758H16.8015C17.2129 8.89758 17.5824 9.14959 17.7325 9.53265L25.2261 28.6505C26.1376 30.9759 26.6055 33.4515 26.6055 35.9492V50.6772H0Z" fill="url(#paint3_linear_pencil)" fillOpacity="0.2"/>
      <path d="M0 50.6772V35.8205C0 33.4065 0.437028 31.0124 1.28994 28.7541L8.54507 9.54426C8.69205 9.15511 9.06459 8.89758 9.48057 8.89758H16.8015C17.2129 8.89758 17.5824 9.14959 17.7325 9.53265L25.2261 28.6505C26.1376 30.9759 26.6055 33.4515 26.6055 35.9492V50.6772H0Z" fill="url(#paint4_linear_pencil)" fillOpacity="0.2"/>
      <path d="M9.48047 9.39758H16.8018C17.0073 9.39769 17.1915 9.52367 17.2666 9.71497L24.7607 28.8331C25.6494 31.1004 26.1055 33.5142 26.1055 35.9493V50.1769H0.5V35.8204C0.500003 33.4668 0.926224 31.1326 1.75781 28.9308L9.0127 9.72083C9.08618 9.52631 9.27253 9.39763 9.48047 9.39758Z" stroke="#0F1931" strokeOpacity="0.1"/>
      <defs>
        <filter id="filter0_i_pencil" x="9.15625" y="0.90344" width="7.81641" height="9.75085" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix"/>
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feOffset dy="-1"/>
          <feGaussianBlur stdDeviation="1"/>
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
          <feBlend mode="normal" in2="shape" result="effect1_innerShadow"/>
        </filter>
        <linearGradient id="paint0_linear_pencil" x1="13.5537" y1="30.612" x2="13.5537" y2="39.4077" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E3F5FF" stopOpacity="0"/>
          <stop offset="1" stopColor="#FBFBFB"/>
        </linearGradient>
        <linearGradient id="paint1_linear_pencil" x1="27.6094" y1="29.879" x2="-1.00398" y2="29.879" gradientUnits="userSpaceOnUse">
          <stop/>
          <stop offset="0.245082" stopColor="#666666" stopOpacity="0.75"/>
          <stop offset="0.294077" stopColor="#666666" stopOpacity="0"/>
          <stop offset="0.374934" stopColor="#666666" stopOpacity="0.25"/>
          <stop offset="0.623271" stopColor="#666666" stopOpacity="0.1"/>
          <stop offset="0.69" stopColor="#666666" stopOpacity="0"/>
          <stop offset="0.748823" stopColor="#666666" stopOpacity="0.5"/>
          <stop offset="1"/>
        </linearGradient>
        <linearGradient id="paint2_linear_pencil" x1="13.5537" y1="8.9892" x2="13.5537" y2="41.9731" gradientUnits="userSpaceOnUse">
          <stop offset="0.01" stopColor="#F4EADE"/>
          <stop offset="0.650404" stopColor="#F9F1E7" stopOpacity="0.85"/>
          <stop offset="1" stopColor="white" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="paint3_linear_pencil" x1="10.5418" y1="31.7114" x2="0.516687" y2="28.2785" gradientUnits="userSpaceOnUse">
          <stop stopColor="#B2753F" stopOpacity="0"/>
          <stop offset="1" stopColor="#B2753F"/>
        </linearGradient>
        <linearGradient id="paint4_linear_pencil" x1="19.5776" y1="28.5963" x2="24.8717" y2="26.9482" gradientUnits="userSpaceOnUse">
          <stop stopColor="#B2753F" stopOpacity="0"/>
          <stop offset="1" stopColor="#B2753F"/>
        </linearGradient>
      </defs>
    </svg>
  );
}
