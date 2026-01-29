# Wiggle/Distort Filter Learnings

This document captures learnings about the SVG-based wiggle/distortion effect used in the draw page.

## Overview

The wiggle effect creates an organic, hand-drawn feel by subtly displacing pixels based on procedural noise. It uses two SVG filters working together:
1. `feTurbulence` - generates Perlin noise
2. `feDisplacementMap` - shifts pixels based on that noise

## How the SVG Filter Works

```xml
<filter id="wobbleFilter">
  <feTurbulence
    type="turbulence"
    baseFrequency="0.03"
    numOctaves="2"
    seed={seed}
    result="noise"
  />
  <feDisplacementMap
    in="SourceGraphic"
    in2="noise"
    scale={distortionAmount}
    xChannelSelector="R"
    yChannelSelector="G"
  />
</filter>
```

### feTurbulence

Generates procedural noise using the Perlin turbulence function.

| Property | Our Value | Description |
|----------|-----------|-------------|
| `type` | `"turbulence"` | Creates more chaotic noise vs `"fractalNoise"` which is smoother |
| `baseFrequency` | `0.03` | Controls "zoom level" of noise (higher = more detail, lower = smoother blobs) |
| `numOctaves` | `2` | Layers of detail (more = finer details but more expensive) |
| `seed` | varies | Integer that changes the noise pattern - **this is what we animate** |
| `result` | `"noise"` | Name to reference this output in other filters |

### feDisplacementMap

Displaces pixels in the source image based on the noise.

| Property | Our Value | Description |
|----------|-----------|-------------|
| `in` | `"SourceGraphic"` | The image to distort (the canvas content) |
| `in2` | `"noise"` | The noise map from feTurbulence |
| `scale` | `distortionAmount` | How many pixels to displace (0-30 range in our app) |
| `xChannelSelector` | `"R"` | Use red channel of noise for X displacement |
| `yChannelSelector` | `"G"` | Use green channel of noise for Y displacement |

## The Wiggle Animation

To create the "wiggle" effect, we rapidly change the `seed` value. Each seed produces a completely different noise pattern, so cycling through seeds creates an animated distortion.

### Parameters

| Setting | Default | Range | Description |
|---------|---------|-------|-------------|
| `distortionAmount` | 2 | 0-30 | Pixel displacement intensity |
| `wiggleSpeed` | 270ms | 50-500ms | Interval between seed changes |

## Performance Issue: React State Updates

### The Problem

The original implementation used React state for the seed:

```javascript
const [filterSeed, setFilterSeed] = useState(1);

useEffect(() => {
  if (distortionAmount === 0) return;
  const interval = setInterval(() => {
    setFilterSeed((prev) => (prev % 100) + 1);  // Triggers React re-render!
  }, wiggleSpeed);
  return () => clearInterval(interval);
}, [distortionAmount, wiggleSpeed]);
```

**Impact**: With `wiggleSpeed=270ms`, this triggers ~3.7 React re-renders per second, **even when the user is idle**. Each re-render:
- Runs the entire component function
- Diffs the virtual DOM
- Updates any dependent children
- Causes React DevTools Profiler to show constant activity

### The Solution: Direct DOM Manipulation

Since changing the `seed` attribute doesn't require React to know about it (it's purely visual), we can bypass React entirely:

```javascript
const turbulenceRef = useRef<SVGFETurbulenceElement>(null);

useEffect(() => {
  if (distortionAmount === 0) return;
  let seed = 1;
  const interval = setInterval(() => {
    seed = (seed % 100) + 1;
    turbulenceRef.current?.setAttribute('seed', String(seed));
  }, wiggleSpeed);
  return () => clearInterval(interval);
}, [distortionAmount, wiggleSpeed]);

// In JSX:
<feTurbulence ref={turbulenceRef} seed="1" ... />
```

**Benefits**:
- Zero React re-renders from the wiggle animation
- Same visual effect
- Animation still respects `distortionAmount` and `wiggleSpeed` settings
- Significantly reduced CPU usage when idle

## Safari Performance Optimizations

Safari has significantly worse performance with SVG filters compared to Chrome. Here's what we do:

### Browser Detection

```javascript
const isSafari = typeof navigator !== 'undefined' &&
  /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
```

### Safari-Specific Adjustments

| Optimization | Chrome | Safari | Why |
|--------------|--------|--------|-----|
| `numOctaves` | 2 | 1 | Halves computation (each octave doubles work) |
| `baseFrequency` | 0.03 | 0.02 | Larger noise blobs = less work |
| Min `wiggleSpeed` | 270ms | 400ms | Fewer filter recalculations per second |
| Filter region | 120% | 120% | Reduced from 140% to shrink render area |

### Hardware Acceleration

Elements with the filter applied get GPU compositing hints:

```javascript
style={{
  filter: 'url(#wobbleFilter)',
  willChange: 'filter',
  transform: 'translateZ(0)', // Force GPU layer
}}
```

### Tab Visibility

The wiggle animation pauses when the tab is not visible (using Page Visibility API):

```javascript
const [isTabVisible, setIsTabVisible] = useState(true);
useEffect(() => {
  const handleVisibilityChange = () => setIsTabVisible(!document.hidden);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, []);

useEffect(() => {
  if (distortionAmount === 0 || !isTabVisible) return;
  // ... animation logic
}, [distortionAmount, wiggleSpeed, isTabVisible]);
```

This saves CPU when the user switches tabs.

### Disable Filter During Pan/Zoom

Applying SVG filters to elements that are being transformed (pan/zoom) is extremely expensive. The filter must be recalculated on every frame during the transform.

**Solution**: Temporarily disable the filter application during pan/zoom gestures:

```javascript
// In the style prop:
...(distortionAmount > 0 && !isPanning && !isTouchGesture ? {
  filter: 'url(#wobbleFilter)',
  willChange: 'filter',
  transform: 'translateZ(0)',
} : {}),
```

The wiggle animation continues running in the background (seed keeps changing), but the visual filter effect is disabled during the gesture. When the user stops panning/zooming, the filter instantly re-applies with the current seed value.

### CSS Containment for Transforms

Adding CSS containment and `will-change` to the transform wrapper reduces repaint scope:

```javascript
style={{
  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
  transformOrigin: 'center center',
  willChange: isPanning || isTouchGesture ? 'transform' : 'auto',
  contain: 'layout style paint',
}}
```

- `contain: layout style paint` - Tells browser this element's rendering is independent of the rest of the page
- `willChange: 'transform'` - Hints that transforms will happen (only during gestures to avoid memory overhead)

### Safari Detection (Hydration-Safe)

The Safari check must run client-side only to avoid hydration mismatches:

```javascript
const [isSafari, setIsSafari] = useState(false);
useEffect(() => {
  setIsSafari(/^((?!chrome|android).)*safari/i.test(navigator.userAgent));
}, []);
```

## Key Learnings

1. **Not everything needs to be in React state** - If a value is purely visual and doesn't affect other parts of the app, consider using refs + direct DOM manipulation.

2. **SVG filter seed creates deterministic noise** - The same seed always produces the same pattern, which is why changing it creates the animation.

3. **feTurbulence is computationally expensive** - Higher `numOctaves` and larger filter regions (controlled by `x`, `y`, `width`, `height` on the filter element) increase cost.

4. **Safari compatibility** - We avoid `filterUnits="userSpaceOnUse"` as it can cause issues in Safari. The default `objectBoundingBox` works better.

5. **Safari is ~2-3x slower with SVG filters** - Always test filter effects in Safari. Reduce complexity (numOctaves, filter region size) and animation speed for acceptable performance.

6. **Hardware acceleration matters** - `will-change: filter` and `transform: translateZ(0)` can help the browser optimize filter rendering by promoting elements to GPU layers.

## Alternatives to SVG Filters

### Option 1: Single Container Filter (Current Best)
Apply filter to ONE wrapper instead of multiple layers. Each filtered element multiplies the work.

**Before** (expensive):
```jsx
<div style={{ filter: 'url(#wobbleFilter)' }}> {/* Background */} </div>
<svg style={{ filter: 'url(#wobbleFilter)' }}> {/* Drawings */} </svg>
```

**After** (cheaper):
```jsx
<div style={{ filter: 'url(#wobbleFilter)' }}>
  <div> {/* Background */} </div>
  <svg> {/* Drawings */} </svg>
</div>
```

### Option 2: CSS Keyframe Animation
Pre-define wiggle frames with CSS transforms instead of filter recalculation:

```css
@keyframes wiggle {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  25% { transform: translate(1px, -1px) rotate(0.5deg); }
  50% { transform: translate(-1px, 1px) rotate(-0.5deg); }
  75% { transform: translate(1px, 1px) rotate(0.3deg); }
}

.wiggle {
  animation: wiggle 0.3s ease-in-out infinite;
}
```

**Pros**: Very cheap, GPU-accelerated
**Cons**: Less organic feel, no actual distortion

### Option 3: Path-Based Wiggle (No Filter)
Add noise directly to SVG path points in JavaScript:

```javascript
function wigglePath(d: string, amount: number, seed: number): string {
  // Parse path, add Perlin noise to each point
  return modifiedPath;
}
```

**Pros**: No filter overhead, works everywhere
**Cons**: Complex to implement, only works on strokes (not background)

### Option 4: Pre-rendered Noise Sprites
Create multiple static noise displacement images, cycle through them with CSS:

```css
.wiggle-frame-1 { background: url(noise1.png); }
.wiggle-frame-2 { background: url(noise2.png); }
/* ... cycle with JS or CSS animation */
```

**Pros**: No runtime filter calculation
**Cons**: Larger file size, less flexible

### Option 5: WebGL Displacement
Use a WebGL shader for GPU-accelerated displacement:

**Pros**: True GPU acceleration, smooth on all browsers
**Cons**: Significant implementation complexity, requires WebGL context

### Option 6: Reduce to Strokes Only
Only apply filter to the SVG strokes, not the background:

```jsx
<div> {/* Background - no filter */} </div>
<svg style={{ filter: 'url(#wobbleFilter)' }}> {/* Strokes only */} </svg>
```

**Pros**: 50% less filter work
**Cons**: Background doesn't wiggle

### Recommendation Priority
1. **Single container** - Easy refactor, ~50% perf gain
2. **Strokes only** - If background wiggle isn't critical
3. **CSS keyframes** - If organic distortion isn't critical
4. **Path-based** - For maximum control without filters

## References

- [MDN feTurbulence](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feTurbulence)
- [MDN feDisplacementMap](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feDisplacementMap)
- [SVG Filter Effects Playground](https://yoksel.github.io/svg-filters/)
