'use client';

import { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// California sky shader - warm, hazy, golden
const vertexShader = `
varying vec3 vWorldPosition;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform float hour;
uniform float horizonOffset;
uniform float gradientScale;

varying vec3 vWorldPosition;

// Attempt smooth interpolation
float smootherstep(float edge0, float edge1, float x) {
  x = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}

void main() {
  vec3 viewDir = normalize(vWorldPosition);

  // viewDir.y: -1 (down/nadir) to +1 (up/zenith)
  // horizonOffset shifts where horizon appears on screen
  // gradientScale stretches the gradient (higher = more zoomed in)
  float elevation = (viewDir.y + horizonOffset) / gradientScale;

  // t=0 at horizon, t=1 at zenith
  float t = clamp(elevation, 0.0, 1.0);

  // Below horizon factor for ground
  float belowHorizon = clamp(-elevation, 0.0, 1.0);

  // === TIME OF DAY CALCULATIONS ===
  // California winter timing
  float sunriseStart = 5.5;
  float sunrisePeak = 6.5;
  float sunriseEnd = 8.0;
  float sunsetStart = 16.0;
  float sunsetPeak = 17.5;
  float sunsetEnd = 19.5;

  // Day factor: 0 at night, 1 at full day
  float dayFactor = 0.0;
  if (hour >= sunriseStart && hour <= 12.0) {
    dayFactor = smootherstep(sunriseStart, 9.0, hour);
  } else if (hour > 12.0 && hour <= sunsetEnd) {
    dayFactor = 1.0 - smootherstep(16.0, sunsetEnd, hour);
  }

  // Golden hour intensity
  float goldenMorning = 0.0;
  float goldenEvening = 0.0;
  if (hour >= sunriseStart && hour <= sunriseEnd) {
    float riseUp = smootherstep(sunriseStart, sunrisePeak, hour);
    float riseDown = 1.0 - smootherstep(sunrisePeak, sunriseEnd, hour);
    goldenMorning = riseUp * riseDown * 1.5; // Peak at sunrise
  }
  if (hour >= sunsetStart && hour <= sunsetEnd) {
    float setUp = smootherstep(sunsetStart, sunsetPeak, hour);
    float setDown = 1.0 - smootherstep(sunsetPeak, sunsetEnd, hour);
    goldenEvening = setUp * setDown * 1.5; // Peak at sunset
  }
  float goldenHour = max(goldenMorning, goldenEvening);

  // Night factor
  float night = 0.0;
  if (hour < sunriseStart) {
    night = 1.0 - smootherstep(4.5, sunriseStart, hour);
  } else if (hour > sunsetEnd) {
    night = smootherstep(sunsetEnd, 21.0, hour);
  }

  // === SKY COLORS (based on California sky palettes) ===

  // ZENITH (top of sky) - from palette[0] colors
  vec3 zenithNight = vec3(0.04, 0.04, 0.10);       // #0a0a1a
  vec3 zenithPreDawn = vec3(0.12, 0.16, 0.22);     // #1e2838
  vec3 zenithDawn = vec3(0.18, 0.22, 0.31);        // #2e3850
  vec3 zenithSunrise = vec3(0.38, 0.63, 0.82);     // #60a0d0
  vec3 zenithMorning = vec3(0.38, 0.66, 0.85);     // #60a8d8
  vec3 zenithMidday = vec3(0.41, 0.66, 0.78);      // #68a8c8
  vec3 zenithAfternoon = vec3(0.28, 0.56, 0.75);   // #4890c0
  vec3 zenithSunset = vec3(0.31, 0.56, 0.69);      // #5090b0
  vec3 zenithDusk = vec3(0.23, 0.38, 0.50);        // #3a6080
  vec3 zenithTwilight = vec3(0.13, 0.16, 0.28);    // #202848

  vec3 zenith = zenithNight;
  if (hour < 5.0) {
    zenith = mix(zenithNight, zenithPreDawn, smootherstep(3.0, 5.0, hour));
  } else if (hour < 6.0) {
    zenith = mix(zenithPreDawn, zenithDawn, smootherstep(5.0, 6.0, hour));
  } else if (hour < 7.0) {
    zenith = mix(zenithDawn, zenithSunrise, smootherstep(6.0, 7.0, hour));
  } else if (hour < 9.0) {
    zenith = mix(zenithSunrise, zenithMorning, smootherstep(7.0, 9.0, hour));
  } else if (hour < 12.0) {
    zenith = mix(zenithMorning, zenithMidday, smootherstep(9.0, 12.0, hour));
  } else if (hour < 15.0) {
    zenith = mix(zenithMidday, zenithAfternoon, smootherstep(12.0, 15.0, hour));
  } else if (hour < 17.5) {
    zenith = mix(zenithAfternoon, zenithSunset, smootherstep(15.0, 17.5, hour));
  } else if (hour < 19.0) {
    zenith = mix(zenithSunset, zenithDusk, smootherstep(17.5, 19.0, hour));
  } else if (hour < 21.0) {
    zenith = mix(zenithDusk, zenithTwilight, smootherstep(19.0, 21.0, hour));
  } else {
    zenith = mix(zenithTwilight, zenithNight, smootherstep(21.0, 23.0, hour));
  }

  // HORIZON - from palette[4] colors
  vec3 horizonNight = vec3(0.24, 0.22, 0.31);      // #3c3850
  vec3 horizonPreDawn = vec3(0.48, 0.38, 0.44);    // #7a6070
  vec3 horizonDawn = vec3(0.60, 0.47, 0.53);       // #987888
  vec3 horizonSunrise = vec3(0.94, 0.69, 0.69);    // #f0b0b0
  vec3 horizonMorning = vec3(0.97, 0.85, 0.60);    // #f8d898
  vec3 horizonDay = vec3(0.91, 0.94, 0.94);        // #e8f0f0
  vec3 horizonAfternoon = vec3(0.97, 0.88, 0.63);  // #f8e0a0
  vec3 horizonSunset = vec3(0.94, 0.63, 0.50);     // #f0a080
  vec3 horizonDusk = vec3(0.69, 0.53, 0.53);       // #b08888
  vec3 horizonTwilight = vec3(0.35, 0.35, 0.37);   // #5a545a

  vec3 horizon = horizonNight;
  if (hour < 5.0) {
    horizon = mix(horizonNight, horizonPreDawn, smootherstep(4.0, 5.0, hour));
  } else if (hour < 6.0) {
    horizon = mix(horizonPreDawn, horizonDawn, smootherstep(5.0, 6.0, hour));
  } else if (hour < 7.0) {
    horizon = mix(horizonDawn, horizonSunrise, smootherstep(6.0, 7.0, hour));
  } else if (hour < 8.0) {
    horizon = mix(horizonSunrise, horizonMorning, smootherstep(7.0, 8.0, hour));
  } else if (hour < 10.0) {
    horizon = mix(horizonMorning, horizonDay, smootherstep(8.0, 10.0, hour));
  } else if (hour < 15.0) {
    horizon = mix(horizonDay, horizonAfternoon, smootherstep(12.0, 15.0, hour));
  } else if (hour < 17.0) {
    horizon = mix(horizonAfternoon, horizonSunset, smootherstep(15.0, 17.0, hour));
  } else if (hour < 18.5) {
    // Peak sunset - intensify the orange
    float peak = 1.0 - abs(hour - 17.5) / 1.0;
    horizon = mix(horizonSunset, vec3(0.98, 0.55, 0.40), peak * 0.3);
  } else if (hour < 20.0) {
    horizon = mix(horizonSunset, horizonDusk, smootherstep(18.0, 20.0, hour));
  } else if (hour < 22.0) {
    horizon = mix(horizonDusk, horizonTwilight, smootherstep(20.0, 22.0, hour));
  } else {
    horizon = mix(horizonTwilight, horizonNight, smootherstep(22.0, 24.0, hour));
  }

  // MID SKY - from palette[2] colors
  vec3 midNight = vec3(0.10, 0.13, 0.22);          // #1a2438
  vec3 midPreDawn = vec3(0.25, 0.31, 0.38);        // #405060
  vec3 midDawn = vec3(0.31, 0.38, 0.44);           // #506070
  vec3 midSunrise = vec3(0.75, 0.85, 0.91);        // #c0d8e8
  vec3 midMorning = vec3(0.60, 0.85, 0.97);        // #98d8f8
  vec3 midDay = vec3(0.53, 0.82, 0.94);            // #88d0f0
  vec3 midAfternoon = vec3(0.69, 0.78, 0.78);      // #b0c8c8
  vec3 midSunset = vec3(0.85, 0.78, 0.65);         // #d8c8a0
  vec3 midDusk = vec3(0.56, 0.56, 0.63);           // #9090a0
  vec3 midTwilight = vec3(0.25, 0.28, 0.34);       // #404858

  vec3 mid = midNight;
  if (hour < 5.0) {
    mid = mix(midNight, midPreDawn, smootherstep(4.0, 5.0, hour));
  } else if (hour < 6.0) {
    mid = mix(midPreDawn, midDawn, smootherstep(5.0, 6.0, hour));
  } else if (hour < 7.0) {
    mid = mix(midDawn, midSunrise, smootherstep(6.0, 7.0, hour));
  } else if (hour < 9.0) {
    mid = mix(midSunrise, midMorning, smootherstep(7.0, 9.0, hour));
  } else if (hour < 12.0) {
    mid = mix(midMorning, midDay, smootherstep(9.0, 12.0, hour));
  } else if (hour < 15.0) {
    mid = mix(midDay, midAfternoon, smootherstep(12.0, 15.0, hour));
  } else if (hour < 17.5) {
    mid = mix(midAfternoon, midSunset, smootherstep(15.0, 17.5, hour));
  } else if (hour < 19.0) {
    mid = mix(midSunset, midDusk, smootherstep(17.5, 19.0, hour));
  } else if (hour < 21.0) {
    mid = mix(midDusk, midTwilight, smootherstep(19.0, 21.0, hour));
  } else {
    mid = mix(midTwilight, midNight, smootherstep(21.0, 23.0, hour));
  }

  // GROUND (below horizon)
  vec3 groundDay = horizon * 0.5;
  vec3 groundNight = vec3(0.03, 0.02, 0.04);
  vec3 ground = mix(groundDay, groundNight, night);

  // === BUILD GRADIENT ===
  vec3 skyColor;

  // Use non-linear interpolation for more natural gradient
  // More horizon color near bottom, faster transition to zenith
  float horizonBlend = pow(1.0 - t, 2.0); // Strong at bottom
  float midBlend = sin(t * 3.14159) * 0.8; // Peaks in middle
  float zenithBlend = pow(t, 1.5); // Strong at top

  // Normalize
  float total = horizonBlend + midBlend + zenithBlend;
  horizonBlend /= total;
  midBlend /= total;
  zenithBlend /= total;

  skyColor = horizon * horizonBlend + mid * midBlend + zenith * zenithBlend;

  // Add extra warm glow at horizon during golden hour
  if (goldenHour > 0.1 && t < 0.4) {
    float glowAmount = (1.0 - t / 0.4) * goldenHour * 0.5;
    vec3 glowColor = goldenMorning > goldenEvening
      ? vec3(1.0, 0.75, 0.45)  // Morning: more yellow-gold
      : vec3(1.0, 0.50, 0.30); // Evening: more orange-red
    skyColor = mix(skyColor, glowColor, glowAmount);
  }

  // Blend to ground below horizon
  if (belowHorizon > 0.0) {
    skyColor = mix(skyColor, ground, belowHorizon);
  }

  gl_FragColor = vec4(skyColor, 1.0);
}
`;

interface SkyMeshProps {
  hour: number;
  horizonOffset: number;
  gradientScale: number;
}

function SkyMesh({ hour, horizonOffset, gradientScale }: SkyMeshProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const hourRef = useRef(hour);
  const offsetRef = useRef(horizonOffset);
  const scaleRef = useRef(gradientScale);

  useEffect(() => {
    hourRef.current = hour;
  }, [hour]);

  useEffect(() => {
    offsetRef.current = horizonOffset;
  }, [horizonOffset]);

  useEffect(() => {
    scaleRef.current = gradientScale;
  }, [gradientScale]);

  const uniforms = useRef({
    hour: { value: hour },
    horizonOffset: { value: horizonOffset },
    gradientScale: { value: gradientScale },
  });

  useFrame(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.hour.value = hourRef.current;
      materialRef.current.uniforms.horizonOffset.value = offsetRef.current;
      materialRef.current.uniforms.gradientScale.value = scaleRef.current;
    }
  });

  return (
    <mesh>
      <sphereGeometry args={[500, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms.current}
        side={THREE.BackSide}
      />
    </mesh>
  );
}

interface SkyShaderProps {
  hour: number;
  horizonOffset?: number;
  gradientScale?: number;
}

export default function SkyShader({ hour, horizonOffset = 0.5, gradientScale = 1.0 }: SkyShaderProps) {
  return (
    <div className="absolute inset-0" style={{ zIndex: 0 }}>
      <Canvas
        camera={{
          position: [0, 0, 0.01],
          fov: 100,
          near: 0.1,
          far: 1000,
        }}
        gl={{ antialias: true, alpha: false }}
      >
        <SkyMesh hour={hour} horizonOffset={horizonOffset} gradientScale={gradientScale} />
      </Canvas>
    </div>
  );
}
