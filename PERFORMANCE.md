# Performance Monitoring Guide

## Quick Performance Check Commands

### 1. Build and Check Bundle Size
```bash
npm run build
```
This shows the size of each page and component after build.

### 2. Analyze Bundle Composition
```bash
npm run analyze
```
Opens an interactive visualization of what's in your JavaScript bundles.

### 3. Run Lighthouse Performance Audit
```bash
# First, start your dev server in one terminal
npm run dev

# In another terminal, run Lighthouse
k```
This creates a `lighthouse-report.html` file you can open in your browser.

## Performance Metrics to Watch

### Core Web Vitals (Target Values)
- **LCP (Largest Contentful Paint)**: < 2.5 seconds
- **FID (First Input Delay)**: < 100 milliseconds  
- **CLS (Cumulative Layout Shift)**: < 0.1

### Bundle Size Guidelines
- Initial page load: < 200KB JavaScript
- Total page weight: < 1MB (including images)

## What We've Already Optimized

✅ **Next.js Config**
- Image formats (AVIF, WebP)
- Compression enabled
- Console removal in production
- Package import optimization

✅ **Image Optimization**a
- Using Next.js Image component with lazy loading
- Sharp installed for server-side optimization
- Proper sizing attributes

✅ **Code Splitting**
- Dynamic imports for heavy components
- PortfolioGrid lazy loaded

✅ **React Optimizations**
- Memoized components (ChatMessage)
- useCallback for event handlers
- Proper key usage in lists

## Ongoing Monitoring

### Check Performance After Changes
After making significant changes, run:
```bash
npm run build
npm run lighthouse
```

### Monitor in Chrome DevTools
1. Open Chrome DevTools (F12)
2. Go to Lighthouse tab
3. Run audit with "Performance" checked
4. Check Network tab for resource sizes

## Image Optimization TODO

Your largest images need optimization:
- Convert `/public/card-images/*.jpg` to WebP format
- Resize images to appropriate dimensions (max 800px width for cards)
- Consider using a CDN when you deploy

## Deployment Performance

When you deploy to Vercel (recommended):
- Automatic image optimization
- Global CDN distribution
- Automatic HTTPS/HTTP2
- Built-in analytics for Core Web Vitals

## Red Flags to Watch For

- Bundle size suddenly increasing
- New dependencies adding > 50KB
- Images over 200KB
- JavaScript execution time > 2 seconds
- Layout shifts when content loads