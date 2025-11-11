// WebGL ASCII shader inspired by Godot ASCII shader approach

export const asciiVertexShader = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  
  void main() {
    v_texCoord = a_texCoord;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

export const asciiFragmentShader = `
  precision highp float;
  
  uniform sampler2D u_image;          // Source image
  uniform sampler2D u_charAtlas;      // ASCII character atlas texture
  uniform vec2 u_resolution;          // Canvas size
  uniform vec2 u_cellSize;            // Size of each ASCII cell
  uniform vec2 u_atlasSize;           // Character atlas dimensions
  uniform int u_numChars;             // Number of characters in set
  uniform vec3 u_color;               // Text color
  uniform float u_brightness;         // Brightness adjustment
  uniform float u_contrast;           // Contrast adjustment
  
  varying vec2 v_texCoord;
  
  // Calculate luminance from RGB
  float getLuminance(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
  }
  
  void main() {
    vec2 pixelCoord = v_texCoord * u_resolution;
    
    // Calculate which cell we're in
    vec2 cellCoord = floor(pixelCoord / u_cellSize);
    
    // Position within the cell (0-1)
    vec2 cellUV = fract(pixelCoord / u_cellSize);
    
    // Calculate the center position of this cell in the source image
    vec2 samplePos = (cellCoord * u_cellSize + u_cellSize * 0.5) / u_resolution;
    
    // Sample the source image at this cell's center
    vec4 imageColor = texture2D(u_image, samplePos);
    
    // Calculate luminance
    float lum = getLuminance(imageColor.rgb);
    
    // Apply brightness and contrast
    lum += u_brightness;
    lum = (lum - 0.5) * (1.0 + u_contrast) + 0.5;
    lum = clamp(lum, 0.0, 1.0);
    
    // Map luminance to character index
    int charIndex = int(lum * float(u_numChars - 1));
    
    // Calculate atlas UV coordinates
    float charsPerRow = u_atlasSize.x;
    float charRow = floor(float(charIndex) / charsPerRow);
    float charCol = mod(float(charIndex), charsPerRow);
    
    // Calculate UV in the atlas
    vec2 atlasUV = vec2(
      (charCol + cellUV.x) / charsPerRow,
      (charRow + cellUV.y) / (u_atlasSize.y / charsPerRow)
    );
    
    // Sample the character from the atlas
    vec4 charColor = texture2D(u_charAtlas, atlasUV);
    
    // Apply text color
    vec3 finalColor = u_color * charColor.rgb;
    
    gl_FragColor = vec4(finalColor, charColor.a * imageColor.a);
  }
`;

// Generate character atlas texture from AS Thermal font
export async function generateCharacterAtlas(
  chars: string,
  fontSize: number,
  fontFamily: string = 'AS Thermal Regular'
): Promise<HTMLCanvasElement> {
  const charCount = chars.length;
  const charsPerRow = Math.ceil(Math.sqrt(charCount));
  const rows = Math.ceil(charCount / charsPerRow);
  
  // Create canvas for atlas - use larger cells for better quality
  const canvas = document.createElement('canvas');
  const cellSize = Math.max(fontSize * 3, 64); // Much larger for crisp rendering
  canvas.width = charsPerRow * cellSize;
  canvas.height = rows * cellSize;
  
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) throw new Error('Could not get 2D context');
  
  // Wait for font to load
  await document.fonts.load(`${fontSize * 2}px "${fontFamily}"`);
  
  // Clear to transparent
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // High quality text rendering
  ctx.fillStyle = '#ffffff';
  ctx.font = `${fontSize * 2}px "${fontFamily}"`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.imageSmoothingEnabled = false;
  
  // Render each character to the atlas
  for (let i = 0; i < charCount; i++) {
    const char = chars[i];
    const col = i % charsPerRow;
    const row = Math.floor(i / charsPerRow);
    
    const x = col * cellSize + cellSize / 2;
    const y = row * cellSize + cellSize / 2;
    
    ctx.fillText(char, x, y);
  }
  
  return canvas;
}

export async function createAsciiShaderCanvas(
  sourceImage: HTMLImageElement,
  width: number,
  height: number,
  charSet: string,
  charSize: number,
  color: string,
  brightness: number,
  contrast: number,
  opacity: number
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true });
  if (!gl) {
    console.error('WebGL not supported for ASCII shader');
    return canvas;
  }
  
  // Generate character atlas
  const atlasCanvas = await generateCharacterAtlas(charSet, charSize);
  
  // Create shaders
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, asciiVertexShader);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, asciiFragmentShader);
  
  if (!vertexShader || !fragmentShader) {
    return canvas;
  }
  
  // Create program
  const program = createProgram(gl, vertexShader, fragmentShader);
  if (!program) {
    return canvas;
  }
  
  gl.useProgram(program);
  
  // Set up geometry (full screen quad)
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1, -1,  0, 0,
       1, -1,  1, 0,
      -1,  1,  0, 1,
      -1,  1,  0, 1,
       1, -1,  1, 0,
       1,  1,  1, 1,
    ]),
    gl.STATIC_DRAW
  );
  
  const positionLocation = gl.getAttribLocation(program, 'a_position');
  const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
  
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(texCoordLocation);
  gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 16, 8);
  
  // Create and bind source image texture
  const imageTexture = createTexture(gl, sourceImage);
  const atlasTexture = createTexture(gl, atlasCanvas);
  
  // Set uniforms
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, imageTexture);
  gl.uniform1i(gl.getUniformLocation(program, 'u_image'), 0);
  
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
  gl.uniform1i(gl.getUniformLocation(program, 'u_charAtlas'), 1);
  
  gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), width, height);
  gl.uniform2f(gl.getUniformLocation(program, 'u_cellSize'), charSize, charSize);
  
  const charsPerRow = Math.ceil(Math.sqrt(charSet.length));
  gl.uniform2f(gl.getUniformLocation(program, 'u_atlasSize'), charsPerRow, charsPerRow);
  gl.uniform1i(gl.getUniformLocation(program, 'u_numChars'), charSet.length);
  
  const colorRGB = parseColor(color);
  gl.uniform3f(gl.getUniformLocation(program, 'u_color'), colorRGB.r, colorRGB.g, colorRGB.b);
  gl.uniform1f(gl.getUniformLocation(program, 'u_brightness'), brightness / 100);
  gl.uniform1f(gl.getUniformLocation(program, 'u_contrast'), contrast / 100);
  
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

function createTexture(gl: WebGLRenderingContext, source: TexImageSource): WebGLTexture | null {
  const texture = gl.createTexture();
  if (!texture) return null;
  
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  
  // Use nearest neighbor for crisp pixel-perfect characters
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  
  return texture;
}

function parseColor(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 1, g: 1, b: 1 };
}

