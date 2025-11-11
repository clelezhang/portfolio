// WebGL shader for gradient rendering with grain

export const gradientVertexShader = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  
  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

export const gradientFragmentShader = `
  precision highp float;
  
  uniform vec2 u_resolution;
  uniform vec3 u_color1;
  uniform vec3 u_color2;
  uniform vec3 u_color3;
  uniform float u_stop1;
  uniform float u_stop2;
  uniform float u_stop3;
  uniform int u_numStops;
  uniform int u_type; // 0 = linear, 1 = radial, 2 = blobby
  uniform float u_angle;
  uniform vec2 u_center;
  uniform float u_scale;
  uniform float u_grain;
  uniform float u_seed;
  uniform float u_opacity;
  
  varying vec2 v_uv;
  
  // Hash function for noise
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  
  // Smooth noise
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  
  // Multi-octave noise
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    for (int i = 0; i < 4; i++) {
      value += amplitude * noise(p * frequency);
      frequency *= 2.0;
      amplitude *= 0.5;
    }
    
    return value;
  }
  
  // Smooth color interpolation
  vec3 mixColors(float t) {
    if (u_numStops == 2) {
      return mix(u_color1, u_color2, smoothstep(u_stop1, u_stop2, t));
    } else {
      if (t < u_stop2) {
        float localT = (t - u_stop1) / (u_stop2 - u_stop1);
        return mix(u_color1, u_color2, smoothstep(0.0, 1.0, localT));
      } else {
        float localT = (t - u_stop2) / (u_stop3 - u_stop2);
        return mix(u_color2, u_color3, smoothstep(0.0, 1.0, localT));
      }
    }
  }
  
  void main() {
    vec2 uv = v_uv;
    vec2 pos = uv * u_resolution;
    
    float t = 0.0;
    
    if (u_type == 0) {
      // Linear gradient
      float rad = radians(u_angle);
      vec2 dir = vec2(cos(rad), sin(rad));
      t = dot(uv - 0.5, dir) + 0.5;
      
    } else if (u_type == 1) {
      // Radial gradient
      vec2 center = u_center;
      float dist = length(uv - center) * u_scale;
      t = dist;
      
    } else if (u_type == 2) {
      // Blobby gradient with offset center
      vec2 center = u_center + vec2(0.2, 0.15);
      float dist = length(uv - center) * u_scale * 1.5;
      
      // Add organic distortion
      float distortion = fbm(uv * 3.0 + u_seed) * 0.3;
      t = dist + distortion;
    }
    
    t = clamp(t, 0.0, 1.0);
    
    // Get gradient color
    vec3 color = mixColors(t);
    
    // Add grain
    float grainValue = hash(pos + u_seed * 1000.0) * 2.0 - 1.0;
    color += grainValue * u_grain * 0.15;
    
    color = clamp(color, 0.0, 1.0);
    
    gl_FragColor = vec4(color, u_opacity);
  }
`;

export function createGradientShaderCanvas(
  width: number,
  height: number,
  subtype: 'linear' | 'radial' | 'blobby',
  stops: { color: string; pos: number }[],
  angle: number,
  centerX: number,
  centerY: number,
  scale: number,
  grain: number,
  seed: number,
  opacity: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true });
  if (!gl) {
    console.error('WebGL not supported');
    return canvas;
  }
  
  // Create shaders
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, gradientVertexShader);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, gradientFragmentShader);
  
  if (!vertexShader || !fragmentShader) {
    return canvas;
  }
  
  // Create program
  const program = createProgram(gl, vertexShader, fragmentShader);
  if (!program) {
    return canvas;
  }
  
  gl.useProgram(program);
  
  // Set up position buffer (full screen quad)
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]),
    gl.STATIC_DRAW
  );
  
  const positionLocation = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  
  // Set uniforms
  gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), width, height);
  
  // Parse and set color stops
  const numStops = Math.min(stops.length, 3);
  gl.uniform1i(gl.getUniformLocation(program, 'u_numStops'), numStops);
  
  for (let i = 0; i < numStops; i++) {
    const color = parseColor(stops[i].color);
    gl.uniform3f(
      gl.getUniformLocation(program, `u_color${i + 1}`),
      color.r,
      color.g,
      color.b
    );
    gl.uniform1f(gl.getUniformLocation(program, `u_stop${i + 1}`), stops[i].pos);
  }
  
  // Fill remaining slots if less than 3 stops
  for (let i = numStops; i < 3; i++) {
    gl.uniform3f(gl.getUniformLocation(program, `u_color${i + 1}`), 0, 0, 0);
    gl.uniform1f(gl.getUniformLocation(program, `u_stop${i + 1}`), 1.0);
  }
  
  // Gradient type
  const typeMap = { linear: 0, radial: 1, blobby: 2 };
  gl.uniform1i(gl.getUniformLocation(program, 'u_type'), typeMap[subtype]);
  
  gl.uniform1f(gl.getUniformLocation(program, 'u_angle'), angle);
  gl.uniform2f(gl.getUniformLocation(program, 'u_center'), centerX, centerY);
  gl.uniform1f(gl.getUniformLocation(program, 'u_scale'), scale);
  gl.uniform1f(gl.getUniformLocation(program, 'u_grain'), grain);
  gl.uniform1f(gl.getUniformLocation(program, 'u_seed'), seed);
  gl.uniform1f(gl.getUniformLocation(program, 'u_opacity'), opacity);
  
  // Enable blending
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  
  // Clear and draw
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  
  return canvas;
}

function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  
  return shader;
}

function createProgram(
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
): WebGLProgram | null {
  const program = gl.createProgram();
  if (!program) return null;
  
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  
  return program;
}

function parseColor(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0, g: 0, b: 0 };
}

