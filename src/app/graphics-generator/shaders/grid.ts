// WebGL shader for grid rendering

export const gridVertexShader = `
  attribute vec2 a_position;
  varying vec2 v_position;
  
  void main() {
    v_position = a_position;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

export const gridFragmentShader = `
  precision mediump float;
  
  uniform vec2 u_resolution;
  uniform vec2 u_gridSize;
  uniform vec3 u_lineColor;
  uniform float u_lineWidth;
  uniform float u_opacity;
  
  varying vec2 v_position;
  
  void main() {
    // Convert from clip space to pixel space
    vec2 pos = (v_position * 0.5 + 0.5) * u_resolution;
    
    // Calculate grid cell size
    vec2 cellSize = u_resolution / u_gridSize;
    
    // Calculate distance to nearest grid line
    vec2 gridPos = mod(pos, cellSize);
    vec2 distToLine = min(gridPos, cellSize - gridPos);
    float minDist = min(distToLine.x, distToLine.y);
    
    // Anti-aliased line
    float alpha = 1.0 - smoothstep(u_lineWidth * 0.5 - 0.5, u_lineWidth * 0.5 + 0.5, minDist);
    alpha *= u_opacity;
    
    gl_FragColor = vec4(u_lineColor, alpha);
  }
`;

export function createGridShaderCanvas(
  width: number,
  height: number,
  columns: number,
  rows: number,
  lineColor: string,
  lineWidth: number,
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
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, gridVertexShader);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, gridFragmentShader);
  
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
  const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
  const gridSizeLocation = gl.getUniformLocation(program, 'u_gridSize');
  const lineColorLocation = gl.getUniformLocation(program, 'u_lineColor');
  const lineWidthLocation = gl.getUniformLocation(program, 'u_lineWidth');
  const opacityLocation = gl.getUniformLocation(program, 'u_opacity');
  
  gl.uniform2f(resolutionLocation, width, height);
  gl.uniform2f(gridSizeLocation, columns, rows);
  
  // Parse color
  const color = parseColor(lineColor);
  gl.uniform3f(lineColorLocation, color.r, color.g, color.b);
  
  gl.uniform1f(lineWidthLocation, lineWidth);
  gl.uniform1f(opacityLocation, opacity);
  
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

