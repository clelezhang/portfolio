// Sound effects for the draw app — extracted from /sounds playground with tuned values
// Pure functions, no React dependency. AudioContext created lazily on first interaction.

type NoiseType = 'white' | 'pink' | 'brown';

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function createNoiseBuffer(c: AudioContext, type: NoiseType, duration: number): AudioBuffer {
  const sr = c.sampleRate;
  const len = sr * duration;
  const buf = c.createBuffer(1, len, sr);
  const data = buf.getChannelData(0);
  if (type === 'white') {
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  } else if (type === 'pink') {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.1538520;
      b3 = 0.86650 * b3 + w * 0.3104856;
      b4 = 0.55000 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  } else {
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      data[i] = (last + 0.02 * w) / 1.02;
      last = data[i];
      data[i] *= 3.5;
    }
  }
  return buf;
}

// --- Tick Sharp family (sine sweep + noise transient) ---

function playTickSharp(freqStart: number, freqEnd: number, dur: number, noise: NoiseType, noiseMix: number, vol: number, hpFreq: number, noiseDur: number) {
  const c = getCtx(); const now = c.currentTime;
  const o = c.createOscillator(); const g = c.createGain();
  o.connect(g); g.connect(c.destination);
  o.frequency.setValueAtTime(freqStart, now);
  o.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 20), now + dur);
  g.gain.setValueAtTime(vol, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + dur + 0.002);
  o.start(now); o.stop(now + dur + 0.004);
  const buf = createNoiseBuffer(c, noise, noiseDur);
  const src = c.createBufferSource(); src.buffer = buf;
  const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.setValueAtTime(hpFreq, now);
  const g2 = c.createGain(); g2.gain.setValueAtTime(noiseMix, now); g2.gain.exponentialRampToValueAtTime(0.001, now + noiseDur);
  src.connect(hp); hp.connect(g2); g2.connect(c.destination); src.start(now);
}

// --- Crisp Pick (bandpass noise burst) ---

function playCrispPick() {
  const c = getCtx(); const now = c.currentTime;
  const dur = 0.006; const vol = 1.7; const filterQ = 2.70;
  const buf = createNoiseBuffer(c, 'white', dur);
  const src = c.createBufferSource(); src.buffer = buf;
  const bp = c.createBiquadFilter(); bp.type = 'bandpass';
  bp.frequency.setValueAtTime(5500, now); bp.Q.setValueAtTime(filterQ, now);
  const g = c.createGain(); g.gain.setValueAtTime(vol, now); g.gain.exponentialRampToValueAtTime(0.001, now + dur);
  src.connect(bp); bp.connect(g); g.connect(c.destination); src.start(now);
}

// --- Exhale (bandpass noise sweep) ---

function playExhale() {
  const c = getCtx(); const now = c.currentTime;
  const dur = 0.27; const vol = 1; const attack = 0.045;
  const buf = createNoiseBuffer(c, 'pink', dur);
  const src = c.createBufferSource(); src.buffer = buf;
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.setValueAtTime(0.40, now);
  bp.frequency.setValueAtTime(600, now);
  bp.frequency.exponentialRampToValueAtTime(2000, now + dur * 0.83);
  const g = c.createGain(); g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(vol, now + attack);
  g.gain.exponentialRampToValueAtTime(0.001, now + dur);
  src.connect(bp); bp.connect(g); g.connect(c.destination); src.start(now);
}

// --- Timer Double (two warm bell dings) ---

function playTimerDouble() {
  const c = getCtx(); const now = c.currentTime;
  const freq = 1050; const gap = 0.22; const vol = 0.25; const dec = 0.5;
  [0, gap].forEach((offset) => {
    const t = now + offset;
    // Bell fundamental
    const o = c.createOscillator(); o.type = 'sine';
    const g = c.createGain(); o.connect(g); g.connect(c.destination);
    o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 0.99, t + dec);
    g.gain.setValueAtTime(0, now); g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dec);
    o.start(t); o.stop(t + dec + 0.02);
    // Inharmonic overtone
    const o2 = c.createOscillator(); o2.type = 'sine';
    const g2 = c.createGain(); o2.connect(g2); g2.connect(c.destination);
    o2.frequency.setValueAtTime(freq * 2.76, t);
    g2.gain.setValueAtTime(0, now); g2.gain.setValueAtTime(0.04, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + dec * 0.3);
    o2.start(t); o2.stop(t + dec * 0.3 + 0.02);
    // Soft strike
    const buf = createNoiseBuffer(c, 'pink', 0.01);
    const src = c.createBufferSource(); src.buffer = buf;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(2000, t); bp.Q.setValueAtTime(1, t);
    const gn = c.createGain(); gn.gain.setValueAtTime(0, now); gn.gain.setValueAtTime(0.1, t); gn.gain.exponentialRampToValueAtTime(0.001, t + 0.008);
    src.connect(bp); bp.connect(gn); gn.connect(c.destination); src.start(t);
  });
}

// --- Palette Tick (accelerating noise tick sequence — dice roll) ---

function playPaletteTick() {
  const c = getCtx(); const now = c.currentTime;

  // Tuned defaults from Palette Tick designer
  const duration = 500; const count = 11; const curve = 0.37;
  const noiseType: NoiseType = 'white';
  const filterType: BiquadFilterType = 'bandpass';
  const filterFreq = 5750; const filterQ = 3.4;
  const landFilterFreq = 4400;
  const startVol = 1.2; const volDecay = 0.08; const landVol = 0.8;
  const tickLen = 6; const landLen = 8;
  const landPause = 80;

  // Compute schedule (ease-in-out curve)
  const times: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const pos = t + curve * Math.sin(2 * Math.PI * t) / (2 * Math.PI);
    times.push(Math.round(pos * duration));
  }
  // Landing pause — compress earlier ticks
  if (landPause > 0 && times.length > 2) {
    const lastTime = times[times.length - 1];
    const pause = Math.min(landPause, lastTime - 1);
    const compressedEnd = lastTime - pause;
    for (let i = 1; i < times.length - 1; i++) {
      times[i] = Math.round(times[i] * (compressedEnd / (lastTime || 1)));
    }
  }

  const n = times.length;
  times.forEach((ms, i) => {
    const at = now + ms / 1000;
    const isLanding = i === n - 1;
    const len = (isLanding ? landLen : tickLen) / 1000;

    const buf = createNoiseBuffer(c, noiseType, len);
    const src = c.createBufferSource(); src.buffer = buf;
    const filt = c.createBiquadFilter(); filt.type = filterType;
    filt.frequency.setValueAtTime(isLanding ? landFilterFreq : filterFreq, at);
    filt.Q.setValueAtTime(filterQ, at);
    const g = c.createGain();
    const vol = isLanding ? landVol : Math.max(0.02, startVol - i * volDecay);
    g.gain.setValueAtTime(vol, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + len);
    src.connect(filt); filt.connect(g); g.connect(c.destination);
    src.start(at);
  });
}

// --- Public API ---

export type SoundRole = 'button-click' | 'stroke-thin' | 'stroke-medium' | 'stroke-thick' | 'color-swatch' | 'clear-canvas' | 'palette-dice' | 'claude-done';

export function playSound(role: SoundRole): void {
  switch (role) {
    case 'button-click':
      // Tick Sharp — mid, with tuned overrides
      playTickSharp(990, 660, 0.010, 'white', 0.06, 1.35, 5000, 0.005);
      break;
    case 'stroke-thin':
      // Tick Sharp High
      playTickSharp(1320, 880, 0.008, 'white', 0.12, 1.35, 6500, 0.004);
      break;
    case 'stroke-medium':
      // Tick Sharp — same as button-click
      playTickSharp(990, 660, 0.010, 'white', 0.06, 1.35, 5000, 0.005);
      break;
    case 'stroke-thick':
      // Tick Sharp Low
      playTickSharp(660, 440, 0.012, 'white', 0.08, 1.5, 3500, 0.006);
      break;
    case 'color-swatch':
      playCrispPick();
      break;
    case 'clear-canvas':
      playExhale();
      break;
    case 'palette-dice':
      playPaletteTick();
      break;
    case 'claude-done':
      playTimerDouble();
      break;
  }
}
