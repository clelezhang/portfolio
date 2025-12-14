'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Custom sky shader based on Three.js Sky with Rayleigh/Mie scattering
const vertexShader = `
varying vec3 vWorldPosition;
void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform vec3 sunPosition;
uniform float rayleigh;
uniform float turbidity;
uniform float mieCoefficient;
uniform float mieDirectionalG;
uniform float sunIntensity;
uniform float exposure;

varying vec3 vWorldPosition;

// Constants for atmospheric scattering
const vec3 up = vec3(0.0, 1.0, 0.0);
const float e = 2.71828182845904523536028747135266249775724709369995957;
const float pi = 3.141592653589793238462643383279502884197169;

// Wavelengths of RGB in nanometers
const vec3 lambda = vec3(680E-9, 550E-9, 450E-9);
// Refractive index of air
const float n = 1.0003;
// Number of molecules per unit volume at standard atmosphere
const float N = 2.545E25;
// Depolarization factor for standard air
const float pn = 0.035;

// Rayleigh coefficient calculation
vec3 totalRayleigh(vec3 lambda) {
  return (8.0 * pow(pi, 3.0) * pow(pow(n, 2.0) - 1.0, 2.0) * (6.0 + 3.0 * pn)) /
         (3.0 * N * pow(lambda, vec3(4.0)) * (6.0 - 7.0 * pn));
}

// Mie coefficient
const float v = 4.0;
const vec3 K = vec3(0.686, 0.678, 0.666);
vec3 totalMie(vec3 lambda, vec3 K, float T) {
  float c = (0.2 * T) * 10E-18;
  return 0.434 * c * pi * pow((2.0 * pi) / lambda, vec3(v - 2.0)) * K;
}

// Rayleigh phase function
float rayleighPhase(float cosTheta) {
  return (3.0 / (16.0 * pi)) * (1.0 + pow(cosTheta, 2.0));
}

// Henyey-Greenstein phase function for Mie scattering
float hgPhase(float cosTheta, float g) {
  float g2 = pow(g, 2.0);
  float inverse = 1.0 / pow(1.0 - 2.0 * g * cosTheta + g2, 1.5);
  return (1.0 / (4.0 * pi)) * ((1.0 - g2) * inverse);
}

// Sun intensity on horizon
const float sunAngularDiameterCos = 0.999956676946448443553574619906976478926848692873900859324;
const float cutoffAngle = 1.6110731556870734;
const float steepness = 1.5;

float sunIntensityCalc(float zenithAngleCos) {
  zenithAngleCos = clamp(zenithAngleCos, -1.0, 1.0);
  return sunIntensity * max(0.0, 1.0 - pow(e, -((cutoffAngle - acos(zenithAngleCos)) / steepness)));
}

void main() {
  vec3 direction = normalize(vWorldPosition);

  // Sun direction
  vec3 sunDir = normalize(sunPosition);
  float sunE = sunIntensityCalc(dot(sunDir, up));

  // Optical length - distance light travels through atmosphere
  float zenithAngle = acos(max(0.0, dot(up, direction)));
  float inverse = 1.0 / (cos(zenithAngle) + 0.15 * pow(93.885 - ((zenithAngle * 180.0) / pi), -1.253));
  float sR = 8.4E3 * inverse;
  float sM = 1.25E3 * inverse;

  // Combined extinction factor
  vec3 betaR = totalRayleigh(lambda) * rayleigh;
  vec3 betaM = totalMie(lambda, K, turbidity) * mieCoefficient;
  vec3 Fex = exp(-(betaR * sR + betaM * sM));

  // In-scattering
  float cosTheta = dot(direction, sunDir);
  float rPhase = rayleighPhase(cosTheta * 0.5 + 0.5);
  vec3 betaRTheta = betaR * rPhase;

  float mPhase = hgPhase(cosTheta, mieDirectionalG);
  vec3 betaMTheta = betaM * mPhase;

  vec3 Lin = pow(sunE * ((betaRTheta + betaMTheta) / (betaR + betaM)) * (1.0 - Fex), vec3(1.5));
  Lin *= mix(vec3(1.0), pow(sunE * ((betaRTheta + betaMTheta) / (betaR + betaM)) * Fex, vec3(0.5)),
             clamp(pow(1.0 - dot(up, sunDir), 5.0), 0.0, 1.0));

  // Night sky color - darker blue
  vec3 nightColor = vec3(0.02, 0.02, 0.06);
  float nightFactor = smoothstep(-0.2, 0.0, sunDir.y);

  // Compose final color
  vec3 texColor = Lin + nightColor * (1.0 - nightFactor);

  // Sun disk
  float sundisk = smoothstep(sunAngularDiameterCos, sunAngularDiameterCos + 0.00002, cosTheta);
  vec3 sunColor = vec3(1.0, 0.9, 0.7) * sundisk * sunE * 0.04;

  texColor += sunColor;

  // Tone mapping and exposure
  vec3 retColor = pow(texColor * exposure, vec3(1.0 / 2.2));

  gl_FragColor = vec4(retColor, 1.0);
}
`;

interface SkyMeshProps {
  hour: number;
}

function SkyMesh({ hour }: SkyMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Calculate sun position based on hour (winter California timing - earlier sunset)
  const sunPosition = useMemo(() => {
    // Convert hour to sun angle
    // Sunrise ~6am (hour 6), Sunset ~5pm (hour 17) for winter
    // Sun is highest at noon (hour 12)

    // Map hour to angle: 6am = -90deg (horizon), 12pm = 0deg (zenith), 6pm = 90deg (horizon)
    const sunriseHour = 6;
    const sunsetHour = 17;
    const noonHour = 11.5; // Solar noon slightly before clock noon in winter

    let elevation: number;
    let azimuth: number;

    if (hour < sunriseHour || hour > sunsetHour + 1) {
      // Night - sun below horizon
      const nightProgress = hour < sunriseHour
        ? (sunriseHour - hour) / sunriseHour
        : (hour - sunsetHour) / (24 - sunsetHour + sunriseHour);
      elevation = -10 - nightProgress * 30; // Degrees below horizon
      azimuth = hour < 12 ? -90 + hour * 15 : 90 - (hour - 12) * 15;
    } else if (hour <= noonHour) {
      // Morning - sun rising
      const progress = (hour - sunriseHour) / (noonHour - sunriseHour);
      elevation = progress * 45; // Max 45 degrees in winter
      azimuth = -90 + progress * 90; // East to south
    } else {
      // Afternoon - sun setting
      const progress = (hour - noonHour) / (sunsetHour - noonHour);
      elevation = 45 * (1 - progress);
      azimuth = progress * 90; // South to west
    }

    // Convert to radians and calculate position
    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);

    return new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
  }, [hour]);

  // Calculate atmosphere parameters based on time
  const atmosphereParams = useMemo(() => {
    const sunY = sunPosition.y;

    // Turbidity increases at sunrise/sunset for that hazy California look
    const turbidity = sunY < 0.1 ? 10 + (0.1 - sunY) * 50 : 8;

    // Rayleigh scattering - more at midday (bluer sky)
    const rayleigh = sunY > 0.3 ? 2 : 1 + sunY * 3;

    // Mie coefficient - more haze at horizon
    const mieCoefficient = sunY < 0.2 ? 0.01 + (0.2 - sunY) * 0.05 : 0.005;

    // Sun intensity based on elevation
    const sunIntensity = Math.max(0, sunY * 1000 + 100);

    // Exposure adjustment
    const exposure = sunY > 0 ? 0.4 + sunY * 0.2 : 0.3;

    return { turbidity, rayleigh, mieCoefficient, sunIntensity, exposure };
  }, [sunPosition]);

  const uniforms = useMemo(() => ({
    sunPosition: { value: sunPosition },
    rayleigh: { value: atmosphereParams.rayleigh },
    turbidity: { value: atmosphereParams.turbidity },
    mieCoefficient: { value: atmosphereParams.mieCoefficient },
    mieDirectionalG: { value: 0.8 },
    sunIntensity: { value: atmosphereParams.sunIntensity },
    exposure: { value: atmosphereParams.exposure },
  }), [sunPosition, atmosphereParams]);

  // Update uniforms when they change
  useFrame(() => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.sunPosition.value.copy(sunPosition);
      material.uniforms.rayleigh.value = atmosphereParams.rayleigh;
      material.uniforms.turbidity.value = atmosphereParams.turbidity;
      material.uniforms.mieCoefficient.value = atmosphereParams.mieCoefficient;
      material.uniforms.sunIntensity.value = atmosphereParams.sunIntensity;
      material.uniforms.exposure.value = atmosphereParams.exposure;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[450000, 32, 15]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        side={THREE.BackSide}
      />
    </mesh>
  );
}

interface SkyShaderProps {
  hour: number;
}

export default function SkyShader({ hour }: SkyShaderProps) {
  return (
    <div className="absolute inset-0" style={{ zIndex: 0 }}>
      <Canvas
        camera={{
          position: [0, 0, 0.01],
          fov: 60,
          near: 0.1,
          far: 1000000
        }}
        gl={{ antialias: true, alpha: false }}
      >
        <SkyMesh hour={hour} />
      </Canvas>
    </div>
  );
}
