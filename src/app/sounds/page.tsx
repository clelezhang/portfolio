'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import './sounds.css';

// ============================================================
// Audio Engine
// ============================================================

let ctx: AudioContext | null = null;
let analyserNode: AnalyserNode | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function getAnalyser(): AnalyserNode {
  if (!analyserNode) {
    const c = getCtx();
    analyserNode = c.createAnalyser();
    analyserNode.fftSize = 2048;
    analyserNode.connect(c.destination);
  }
  return analyserNode;
}

interface ToneOptions {
  type: OscillatorType;
  frequency: number;
  duration: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  pitchStart?: number;
  pitchEnd?: number;
  filterType?: BiquadFilterType;
  filterFreq?: number;
  filterQ?: number;
  volume?: number;
}

function playTone(opts: ToneOptions) {
  const c = getCtx();
  const now = c.currentTime;
  const vol = opts.volume ?? 0.3;

  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = opts.type;

  // Pitch
  const startFreq = opts.pitchStart ?? opts.frequency;
  const endFreq = opts.pitchEnd ?? opts.frequency;
  osc.frequency.setValueAtTime(Math.max(startFreq, 1), now);
  if (endFreq !== startFreq) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(endFreq, 1),
      now + opts.duration
    );
  }

  // ADSR
  const atkEnd = now + opts.attack;
  const decEnd = atkEnd + opts.decay;
  const relStart = now + opts.duration;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(vol, atkEnd);
  gain.gain.linearRampToValueAtTime(vol * opts.sustain, decEnd);
  if (relStart > decEnd) {
    gain.gain.setValueAtTime(vol * opts.sustain, relStart);
  }
  gain.gain.linearRampToValueAtTime(0.0001, relStart + opts.release);

  osc.connect(gain);

  let output: AudioNode = gain;

  // Filter
  if (opts.filterType && opts.filterFreq) {
    const filter = c.createBiquadFilter();
    filter.type = opts.filterType;
    filter.frequency.setValueAtTime(opts.filterFreq, now);
    filter.Q.setValueAtTime(opts.filterQ ?? 1, now);
    gain.connect(filter);
    output = filter;
  }

  output.connect(getAnalyser());

  osc.start(now);
  osc.stop(relStart + opts.release + 0.05);
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}

function createNoiseBuffer(
  c: AudioContext,
  type: 'white' | 'pink' | 'brown',
  duration: number
): AudioBuffer {
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

function playNoise(
  type: 'white' | 'pink' | 'brown',
  duration: number,
  filterType?: BiquadFilterType,
  filterFreq?: number,
  filterQ?: number
) {
  const c = getCtx();
  const now = c.currentTime;
  const buf = createNoiseBuffer(c, type, duration);
  const src = c.createBufferSource();
  src.buffer = buf;

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.linearRampToValueAtTime(0.0001, now + duration);
  src.connect(gain);

  let output: AudioNode = gain;

  if (filterType && filterFreq) {
    const filter = c.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, now);
    filter.Q.setValueAtTime(filterQ ?? 1, now);
    gain.connect(filter);
    output = filter;
  }

  output.connect(getAnalyser());
  src.start(now);
  src.stop(now + duration);
  src.onended = () => {
    src.disconnect();
    gain.disconnect();
  };
}

function playFMTone(opts: {
  carrier: number;
  modFreq: number;
  modDepth: number;
  duration: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}) {
  const c = getCtx();
  const now = c.currentTime;

  const carrierOsc = c.createOscillator();
  const modOsc = c.createOscillator();
  const modGain = c.createGain();
  const masterGain = c.createGain();

  modOsc.frequency.setValueAtTime(opts.modFreq, now);
  modGain.gain.setValueAtTime(opts.modDepth, now);
  // Decay the modulation for bell-like sounds
  modGain.gain.exponentialRampToValueAtTime(1, now + opts.duration);

  carrierOsc.frequency.setValueAtTime(opts.carrier, now);

  modOsc.connect(modGain);
  modGain.connect(carrierOsc.frequency);

  const atkEnd = now + opts.attack;
  const decEnd = atkEnd + opts.decay;
  const relStart = now + opts.duration;
  masterGain.gain.setValueAtTime(0.0001, now);
  masterGain.gain.linearRampToValueAtTime(0.3, atkEnd);
  masterGain.gain.linearRampToValueAtTime(0.3 * opts.sustain, decEnd);
  if (relStart > decEnd) masterGain.gain.setValueAtTime(0.3 * opts.sustain, relStart);
  masterGain.gain.linearRampToValueAtTime(0.0001, relStart + opts.release);

  carrierOsc.connect(masterGain);
  masterGain.connect(getAnalyser());

  carrierOsc.start(now);
  modOsc.start(now);
  carrierOsc.stop(relStart + opts.release + 0.05);
  modOsc.stop(relStart + opts.release + 0.05);
  carrierOsc.onended = () => {
    carrierOsc.disconnect();
    modOsc.disconnect();
    modGain.disconnect();
    masterGain.disconnect();
  };
}

// ============================================================
// Presets
// ============================================================

interface Preset {
  name: string;
  desc: string;
  technique: string;
  play: () => void;
  code: string;
}

const presets: Record<string, Preset[]> = {
  'Taps': [
        {
      name: 'Snap',
      desc: 'Tiny noise click',
      technique: 'noise burst, highpass, 8ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const buf = createNoiseBuffer(c, 'white', 0.008);
        const src = c.createBufferSource(); src.buffer = buf;
        const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.setValueAtTime(4000, now);
        const g = c.createGain(); g.gain.setValueAtTime(0.4, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.008);
        src.connect(hp); hp.connect(g); g.connect(getAnalyser()); src.start(now);
      },
      code: `const ctx = new AudioContext();
const now = ctx.currentTime;
const sr = ctx.sampleRate;
const buf = ctx.createBuffer(1, sr * 0.008, sr);
const data = buf.getChannelData(0);
for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
const src = ctx.createBufferSource();
src.buffer = buf;
const hp = ctx.createBiquadFilter();
hp.type = 'highpass';
hp.frequency.setValueAtTime(4000, now);
const gain = ctx.createGain();
gain.gain.setValueAtTime(0.4, now);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.008);
src.connect(hp); hp.connect(gain); gain.connect(ctx.destination);
src.start();`,
    },
        {
      name: 'Tick',
      desc: 'Barely-there selection',
      technique: 'sine, 10ms, very quiet',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const o = c.createOscillator(); const g = c.createGain();
        o.connect(g); g.connect(getAnalyser());
        o.frequency.setValueAtTime(600, now);
        g.gain.setValueAtTime(0.4, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.012);
        o.start(now); o.stop(now + 0.015);
      },
      code: `const ctx = new AudioContext();
const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.connect(gain);
gain.connect(ctx.destination);
osc.frequency.setValueAtTime(600, ctx.currentTime);
gain.gain.setValueAtTime(0.4, ctx.currentTime);
gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.012);
osc.start();
osc.stop(ctx.currentTime + 0.015);`,
    },
        {
      name: 'Soft Tap',
      desc: 'Pencil tip meeting surface',
      technique: 'sine, barely audible, 15ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const o = c.createOscillator(); const g = c.createGain();
        o.type = 'sine';
        o.connect(g); g.connect(getAnalyser());
        o.frequency.setValueAtTime(500, now); o.frequency.exponentialRampToValueAtTime(350, now + 0.015);
        g.gain.setValueAtTime(0.4, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        o.start(now); o.stop(now + 0.025);
      },
      code: `const ctx = new AudioContext();
const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.connect(gain);
gain.connect(ctx.destination);

osc.frequency.setValueAtTime(500, ctx.currentTime);
osc.frequency.exponentialRampToValueAtTime(350, ctx.currentTime + 0.015);
gain.gain.setValueAtTime(0.4, ctx.currentTime);
gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);

osc.start();
osc.stop(ctx.currentTime + 0.025);`,
    },
        {
      name: 'Hover',
      desc: 'Mouse hover hint',
      technique: 'sine + very short',
      play: () => {
        const c = getCtx();
        const now = c.currentTime;
        const o = c.createOscillator();
        const g = c.createGain();
        o.connect(g); g.connect(getAnalyser());
        o.frequency.setValueAtTime(1400, now);
        g.gain.setValueAtTime(0.4, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        o.start(now); o.stop(now + 0.03);
      },
      code: `const ctx = new AudioContext();
const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.connect(gain);
gain.connect(ctx.destination);

osc.frequency.setValueAtTime(1400, ctx.currentTime);
gain.gain.setValueAtTime(0.4, ctx.currentTime);
gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);

osc.start();
osc.stop(ctx.currentTime + 0.03);`,
    },
        {
      name: 'Soft Click',
      desc: 'Subtle tap feedback',
      technique: 'sine + fast decay',
      play: () => {
        const c = getCtx();
        const now = c.currentTime;
        const o = c.createOscillator();
        const g = c.createGain();
        o.connect(g); g.connect(getAnalyser());
        o.frequency.setValueAtTime(1200, now);
        o.frequency.exponentialRampToValueAtTime(800, now + 0.03);
        g.gain.setValueAtTime(0.4, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        o.start(now); o.stop(now + 0.04);
      },
      code: `const ctx = new AudioContext();
const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.connect(gain);
gain.connect(ctx.destination);

osc.frequency.setValueAtTime(1200, ctx.currentTime);
osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.03);
gain.gain.setValueAtTime(0.4, ctx.currentTime);
gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

osc.start();
osc.stop(ctx.currentTime + 0.04);`,
    },
        {
      name: 'Click',
      desc: 'Standard button click',
      technique: 'sine + pitch sweep',
      play: () => {
        const c = getCtx();
        const now = c.currentTime;
        const o = c.createOscillator();
        const g = c.createGain();
        o.connect(g); g.connect(getAnalyser());
        o.frequency.setValueAtTime(800, now);
        o.frequency.exponentialRampToValueAtTime(600, now + 0.05);
        g.gain.setValueAtTime(0.4, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        o.start(now); o.stop(now + 0.06);
      },
      code: `const ctx = new AudioContext();
const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.connect(gain);
gain.connect(ctx.destination);

osc.frequency.setValueAtTime(800, ctx.currentTime);
osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.05);
gain.gain.setValueAtTime(0.4, ctx.currentTime);
gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

osc.start();
osc.stop(ctx.currentTime + 0.06);`,
    },
  ],

  'Tones': [
        {
      name: 'Mark',
      desc: 'Single quiet mark appearing',
      technique: 'sine, very low volume, 25ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const o = c.createOscillator(); const g = c.createGain();
        o.connect(g); g.connect(getAnalyser());
        o.frequency.setValueAtTime(420, now); o.frequency.exponentialRampToValueAtTime(360, now + 0.025);
        g.gain.setValueAtTime(0.4, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        o.start(now); o.stop(now + 0.035);
      },
      code: `const ctx = new AudioContext();
const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.connect(gain);
gain.connect(ctx.destination);

osc.frequency.setValueAtTime(420, ctx.currentTime);
osc.frequency.exponentialRampToValueAtTime(360, ctx.currentTime + 0.025);
gain.gain.setValueAtTime(0.4, ctx.currentTime);
gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

osc.start();
osc.stop(ctx.currentTime + 0.035);`,
    },
        {
      name: 'Dip',
      desc: 'Dipping into a color',
      technique: 'sine, slight pitch shift, 20ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const o = c.createOscillator(); const g = c.createGain();
        o.connect(g); g.connect(getAnalyser());
        o.frequency.setValueAtTime(520, now); o.frequency.exponentialRampToValueAtTime(440, now + 0.02);
        g.gain.setValueAtTime(0.4, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
        o.start(now); o.stop(now + 0.03);
      },
      code: `const ctx = new AudioContext();
const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.connect(gain);
gain.connect(ctx.destination);
osc.frequency.setValueAtTime(520, ctx.currentTime);
osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.02);
gain.gain.setValueAtTime(0.4, ctx.currentTime);
gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.025);
osc.start();
osc.stop(ctx.currentTime + 0.03);`,
    },
        {
      name: 'Settle',
      desc: 'Ink settling into paper',
      technique: 'sine fade, very soft, 40ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const o = c.createOscillator(); const g = c.createGain();
        o.type = 'sine';
        o.connect(g); g.connect(getAnalyser());
        o.frequency.setValueAtTime(380, now); o.frequency.exponentialRampToValueAtTime(280, now + 0.04);
        g.gain.setValueAtTime(0.4, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        o.start(now); o.stop(now + 0.06);
      },
      code: `const ctx = new AudioContext();
const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.connect(gain);
gain.connect(ctx.destination);

osc.frequency.setValueAtTime(380, ctx.currentTime);
osc.frequency.exponentialRampToValueAtTime(280, ctx.currentTime + 0.04);
gain.gain.setValueAtTime(0.4, ctx.currentTime);
gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

osc.start();
osc.stop(ctx.currentTime + 0.06);`,
    },
        {
      name: 'Thud',
      desc: 'Soft low bump',
      technique: 'sine, low, 40ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const o = c.createOscillator(); const g = c.createGain();
        o.connect(g); g.connect(getAnalyser());
        o.frequency.setValueAtTime(180, now); o.frequency.exponentialRampToValueAtTime(120, now + 0.04);
        g.gain.setValueAtTime(0.4, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        o.start(now); o.stop(now + 0.08);
      },
      code: `const ctx = new AudioContext();
const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.connect(gain);
gain.connect(ctx.destination);
osc.frequency.setValueAtTime(180, ctx.currentTime);
osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.04);
gain.gain.setValueAtTime(0.4, ctx.currentTime);
gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
osc.start();
osc.stop(ctx.currentTime + 0.08);`,
    },
        {
      name: 'Pop',
      desc: 'Punchy bubble pop',
      technique: 'sine + deep sweep',
      play: () => {
        const c = getCtx();
        const now = c.currentTime;
        const o = c.createOscillator();
        const g = c.createGain();
        o.connect(g); g.connect(getAnalyser());
        o.frequency.setValueAtTime(400, now);
        o.frequency.exponentialRampToValueAtTime(150, now + 0.08);
        g.gain.setValueAtTime(0.4, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        o.start(now); o.stop(now + 0.1);
      },
      code: `const ctx = new AudioContext();
const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.connect(gain);
gain.connect(ctx.destination);

osc.frequency.setValueAtTime(400, ctx.currentTime);
osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.08);
gain.gain.setValueAtTime(0.4, ctx.currentTime);
gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

osc.start();
osc.stop(ctx.currentTime + 0.1);`,
    },
        {
      name: 'Closer',
      desc: 'Leaning in to look',
      technique: 'sine, very slow rise, 60ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const o = c.createOscillator(); const g = c.createGain();
        o.connect(g); g.connect(getAnalyser());
        o.frequency.setValueAtTime(280, now); o.frequency.exponentialRampToValueAtTime(340, now + 0.06);
        g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.4, now + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        o.start(now); o.stop(now + 0.08);
      },
      code: `const ctx = new AudioContext();
const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.connect(gain);
gain.connect(ctx.destination);
osc.frequency.setValueAtTime(280, ctx.currentTime);
osc.frequency.exponentialRampToValueAtTime(340, ctx.currentTime + 0.06);
gain.gain.setValueAtTime(0, ctx.currentTime);
gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.02);
gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
osc.start();
osc.stop(ctx.currentTime + 0.08);`,
    },
        {
      name: 'Away',
      desc: 'Pulling back to see the whole',
      technique: 'sine, slow fall, 60ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const o = c.createOscillator(); const g = c.createGain();
        o.connect(g); g.connect(getAnalyser());
        o.frequency.setValueAtTime(380, now); o.frequency.exponentialRampToValueAtTime(300, now + 0.06);
        g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.4, now + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        o.start(now); o.stop(now + 0.08);
      },
      code: `const ctx = new AudioContext();
const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.connect(gain);
gain.connect(ctx.destination);
osc.frequency.setValueAtTime(380, ctx.currentTime);
osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.06);
gain.gain.setValueAtTime(0, ctx.currentTime);
gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.02);
gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
osc.start();
osc.stop(ctx.currentTime + 0.08);`,
    },
  ],

  'Textures': [
        {
      name: 'Grain',
      desc: 'Paper grain texture on contact',
      technique: 'brown noise, lowpass, 18ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const buf = createNoiseBuffer(c, 'brown', 0.018);
        const src = c.createBufferSource(); src.buffer = buf;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(1200, now);
        const g = c.createGain(); g.gain.setValueAtTime(1.5, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.018);
        src.connect(lp); lp.connect(g); g.connect(getAnalyser()); src.start(now);
      },
      code: `const ctx = new AudioContext();
const now = ctx.currentTime;
const sr = ctx.sampleRate;
const len = sr * 0.018;
const buf = ctx.createBuffer(1, len, sr);
const data = buf.getChannelData(0);
let last = 0;
for (let i = 0; i < len; i++) {
  const w = Math.random() * 2 - 1;
  data[i] = (last + 0.02 * w) / 1.02;
  last = data[i]; data[i] *= 3.5;
}

const src = ctx.createBufferSource();
src.buffer = buf;
const lp = ctx.createBiquadFilter();
lp.type = 'lowpass';
lp.frequency.setValueAtTime(1200, now);
const gain = ctx.createGain();
gain.gain.setValueAtTime(1.5, now);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);
src.connect(lp);
lp.connect(gain);
gain.connect(ctx.destination);
src.start();`,
    },
        {
      name: 'Paper Touch',
      desc: 'Tiny breath of contact',
      technique: 'filtered noise puff, 20ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const buf = createNoiseBuffer(c, 'white', 0.02);
        const src = c.createBufferSource(); src.buffer = buf;
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(2500, now); bp.Q.setValueAtTime(0.7, now);
        const g = c.createGain(); g.gain.setValueAtTime(1, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        src.connect(bp); bp.connect(g); g.connect(getAnalyser()); src.start(now);
      },
      code: `const ctx = new AudioContext();
const sr = ctx.sampleRate;
const buf = ctx.createBuffer(1, sr * 0.02, sr);
const data = buf.getChannelData(0);
for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

const src = ctx.createBufferSource();
src.buffer = buf;
const bp = ctx.createBiquadFilter();
bp.type = 'bandpass';
bp.frequency.setValueAtTime(2500, ctx.currentTime);
bp.Q.setValueAtTime(0.7, ctx.currentTime);
const gain = ctx.createGain();
gain.gain.setValueAtTime(1, ctx.currentTime);
gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);
src.connect(bp);
bp.connect(gain);
gain.connect(ctx.destination);
src.start();`,
    },
        {
      name: 'Grab',
      desc: 'Hand gripping the canvas',
      technique: 'brown noise, tight bandpass, 20ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const buf = createNoiseBuffer(c, 'brown', 0.02);
        const src = c.createBufferSource(); src.buffer = buf;
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(500, now); bp.Q.setValueAtTime(1.2, now);
        const g = c.createGain(); g.gain.setValueAtTime(1.2, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        src.connect(bp); bp.connect(g); g.connect(getAnalyser()); src.start(now);
      },
      code: `const ctx = new AudioContext();
const now = ctx.currentTime;
const sr = ctx.sampleRate;
const len = sr * 0.02;
const buf = ctx.createBuffer(1, len, sr);
const data = buf.getChannelData(0);
let last = 0;
for (let i = 0; i < len; i++) {
  const w = Math.random() * 2 - 1;
  data[i] = (last + 0.02 * w) / 1.02;
  last = data[i]; data[i] *= 3.5;
}
const src = ctx.createBufferSource();
src.buffer = buf;
const bp = ctx.createBiquadFilter();
bp.type = 'bandpass';
bp.frequency.setValueAtTime(500, now);
bp.Q.setValueAtTime(1.2, now);
const gain = ctx.createGain();
gain.gain.setValueAtTime(1.2, now);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
src.connect(bp); bp.connect(gain); gain.connect(ctx.destination);
src.start();`,
    },
        {
      name: 'Nudge',
      desc: 'Quiet low-end nudge',
      technique: 'brown noise, lowpass, 40ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const buf = createNoiseBuffer(c, 'brown', 0.04);
        const src = c.createBufferSource(); src.buffer = buf;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(400, now);
        const g = c.createGain(); g.gain.setValueAtTime(1.2, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        src.connect(lp); lp.connect(g); g.connect(getAnalyser()); src.start(now);
      },
      code: `const ctx = new AudioContext();
const now = ctx.currentTime;
const sr = ctx.sampleRate;
const len = sr * 0.04;
const buf = ctx.createBuffer(1, len, sr);
const data = buf.getChannelData(0);
let last = 0;
for (let i = 0; i < len; i++) {
  const w = Math.random() * 2 - 1;
  data[i] = (last + 0.02 * w) / 1.02;
  last = data[i]; data[i] *= 3.5;
}
const src = ctx.createBufferSource();
src.buffer = buf;
const lp = ctx.createBiquadFilter();
lp.type = 'lowpass';
lp.frequency.setValueAtTime(400, now);
const gain = ctx.createGain();
gain.gain.setValueAtTime(1.2, now);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
src.connect(lp); lp.connect(gain); gain.connect(ctx.destination);
src.start();`,
    },
        {
      name: 'Graphite',
      desc: 'Soft graphite drag on paper',
      technique: 'brown noise, lowpass sweep, 50ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const buf = createNoiseBuffer(c, 'brown', 0.05);
        const src = c.createBufferSource(); src.buffer = buf;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass';
        lp.frequency.setValueAtTime(600, now); lp.frequency.exponentialRampToValueAtTime(1000, now + 0.04);
        const g = c.createGain(); g.gain.setValueAtTime(1, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        src.connect(lp); lp.connect(g); g.connect(getAnalyser()); src.start(now);
      },
      code: `const ctx = new AudioContext();
const now = ctx.currentTime;
const sr = ctx.sampleRate;
const len = sr * 0.05;
const buf = ctx.createBuffer(1, len, sr);
const data = buf.getChannelData(0);
let last = 0;
for (let i = 0; i < len; i++) {
  const w = Math.random() * 2 - 1;
  data[i] = (last + 0.02 * w) / 1.02;
  last = data[i]; data[i] *= 3.5;
}
const src = ctx.createBufferSource();
src.buffer = buf;
const lp = ctx.createBiquadFilter();
lp.type = 'lowpass';
lp.frequency.setValueAtTime(600, now);
lp.frequency.exponentialRampToValueAtTime(1000, now + 0.04);
const gain = ctx.createGain();
gain.gain.setValueAtTime(1, now);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
src.connect(lp); lp.connect(gain); gain.connect(ctx.destination);
src.start();`,
    },
        {
      name: 'Erase',
      desc: 'Undo — soft erasing motion',
      technique: 'brown noise, lowpass, 50ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const buf = createNoiseBuffer(c, 'brown', 0.05);
        const src = c.createBufferSource(); src.buffer = buf;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(1000, now);
        lp.frequency.exponentialRampToValueAtTime(300, now + 0.05);
        const g = c.createGain(); g.gain.setValueAtTime(1, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        src.connect(lp); lp.connect(g); g.connect(getAnalyser()); src.start(now);
      },
      code: `// Undo
const ctx = new AudioContext();
const now = ctx.currentTime;
const sr = ctx.sampleRate;
const len = sr * 0.05;
const buf = ctx.createBuffer(1, len, sr);
const data = buf.getChannelData(0);
let last = 0;
for (let i = 0; i < len; i++) {
  const w = Math.random() * 2 - 1;
  data[i] = (last + 0.02 * w) / 1.02;
  last = data[i]; data[i] *= 3.5;
}
const src = ctx.createBufferSource();
src.buffer = buf;
const lp = ctx.createBiquadFilter();
lp.type = 'lowpass';
lp.frequency.setValueAtTime(1000, now);
lp.frequency.exponentialRampToValueAtTime(300, now + 0.05);
const gain = ctx.createGain();
gain.gain.setValueAtTime(1, now);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
src.connect(lp); lp.connect(gain); gain.connect(ctx.destination);
src.start();`,
    },
        {
      name: 'Fold',
      desc: 'Paper being creased',
      technique: 'brown noise, lowpass squeeze, 80ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const buf = createNoiseBuffer(c, 'brown', 0.08);
        const src = c.createBufferSource(); src.buffer = buf;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass';
        lp.frequency.setValueAtTime(2000, now); lp.frequency.exponentialRampToValueAtTime(300, now + 0.06);
        lp.Q.setValueAtTime(2, now);
        const g = c.createGain(); g.gain.setValueAtTime(0.9, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        src.connect(lp); lp.connect(g); g.connect(getAnalyser()); src.start(now);
      },
      code: `const ctx = new AudioContext();
const now = ctx.currentTime;
const sr = ctx.sampleRate;
const len = sr * 0.08;
const buf = ctx.createBuffer(1, len, sr);
const data = buf.getChannelData(0);
let last = 0;
for (let i = 0; i < len; i++) {
  const w = Math.random() * 2 - 1;
  data[i] = (last + 0.02 * w) / 1.02;
  last = data[i]; data[i] *= 3.5;
}
const src = ctx.createBufferSource();
src.buffer = buf;
const lp = ctx.createBiquadFilter();
lp.type = 'lowpass';
lp.frequency.setValueAtTime(2000, now);
lp.frequency.exponentialRampToValueAtTime(300, now + 0.06);
lp.Q.setValueAtTime(2, now);
const gain = ctx.createGain();
gain.gain.setValueAtTime(0.9, now);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
src.connect(lp); lp.connect(gain); gain.connect(ctx.destination);
src.start();`,
    },
  ],

  'Breaths': [
        {
      name: 'Release',
      desc: 'Quiet air after the mark',
      technique: 'brown noise wisp, 25ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const buf = createNoiseBuffer(c, 'brown', 0.025);
        const src = c.createBufferSource(); src.buffer = buf;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(800, now);
        const g = c.createGain(); g.gain.setValueAtTime(1.5, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
        src.connect(lp); lp.connect(g); g.connect(getAnalyser()); src.start(now);
      },
      code: `const ctx = new AudioContext();
const now = ctx.currentTime;
const sr = ctx.sampleRate;
const len = sr * 0.025;
const buf = ctx.createBuffer(1, len, sr);
const data = buf.getChannelData(0);
let last = 0;
for (let i = 0; i < len; i++) {
  const w = Math.random() * 2 - 1;
  data[i] = (last + 0.02 * w) / 1.02;
  last = data[i]; data[i] *= 3.5;
}
const src = ctx.createBufferSource();
src.buffer = buf;
const lp = ctx.createBiquadFilter();
lp.type = 'lowpass';
lp.frequency.setValueAtTime(800, now);
const gain = ctx.createGain();
gain.gain.setValueAtTime(1.5, now);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
src.connect(lp); lp.connect(gain); gain.connect(ctx.destination);
src.start();`,
    },
        {
      name: 'Lift',
      desc: 'Pencil leaving paper — tiny exhale',
      technique: 'noise breath out, 30ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const buf = createNoiseBuffer(c, 'pink', 0.03);
        const src = c.createBufferSource(); src.buffer = buf;
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(1800, now);
        bp.frequency.exponentialRampToValueAtTime(3000, now + 0.03); bp.Q.setValueAtTime(0.5, now);
        const g = c.createGain(); g.gain.setValueAtTime(1.2, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        src.connect(bp); bp.connect(g); g.connect(getAnalyser()); src.start(now);
      },
      code: `const ctx = new AudioContext();
const now = ctx.currentTime;
const sr = ctx.sampleRate;
const len = sr * 0.03;
const buf = ctx.createBuffer(1, len, sr);
const data = buf.getChannelData(0);
let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
for (let i = 0; i < len; i++) {
  const w = Math.random() * 2 - 1;
  b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
  b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
  b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
  data[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11; b6=w*0.115926;
}
const src = ctx.createBufferSource();
src.buffer = buf;
const bp = ctx.createBiquadFilter();
bp.type = 'bandpass';
bp.frequency.setValueAtTime(1800, now);
bp.frequency.exponentialRampToValueAtTime(3000, now + 0.03);
bp.Q.setValueAtTime(0.5, now);
const gain = ctx.createGain();
gain.gain.setValueAtTime(1.2, now);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
src.connect(bp); bp.connect(gain); gain.connect(ctx.destination);
src.start();`,
    },
        {
      name: 'Let Go',
      desc: 'Releasing the canvas',
      technique: 'noise exhale + sine settle, 30ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const buf = createNoiseBuffer(c, 'brown', 0.03);
        const src = c.createBufferSource(); src.buffer = buf;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(800, now);
        lp.frequency.exponentialRampToValueAtTime(300, now + 0.03);
        const g = c.createGain(); g.gain.setValueAtTime(1.2, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        src.connect(lp); lp.connect(g); g.connect(getAnalyser()); src.start(now);
      },
      code: `const ctx = new AudioContext();
const now = ctx.currentTime;
const sr = ctx.sampleRate;
const len = sr * 0.03;
const buf = ctx.createBuffer(1, len, sr);
const data = buf.getChannelData(0);
let last = 0;
for (let i = 0; i < len; i++) {
  const w = Math.random() * 2 - 1;
  data[i] = (last + 0.02 * w) / 1.02;
  last = data[i]; data[i] *= 3.5;
}
const src = ctx.createBufferSource();
src.buffer = buf;
const lp = ctx.createBiquadFilter();
lp.type = 'lowpass';
lp.frequency.setValueAtTime(800, now);
lp.frequency.exponentialRampToValueAtTime(300, now + 0.03);
const gain = ctx.createGain();
gain.gain.setValueAtTime(1.2, now);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
src.connect(lp); lp.connect(gain); gain.connect(ctx.destination);
src.start();`,
    },
        {
      name: 'Gust',
      desc: 'Brief puff of air',
      technique: 'noise, bandpass sweep up, 100ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const buf = createNoiseBuffer(c, 'white', 0.1);
        const src = c.createBufferSource(); src.buffer = buf;
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.setValueAtTime(0.4, now);
        bp.frequency.setValueAtTime(500, now);
        bp.frequency.exponentialRampToValueAtTime(2500, now + 0.06);
        bp.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
        const g = c.createGain(); g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.4, now + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        src.connect(bp); bp.connect(g); g.connect(getAnalyser()); src.start(now);
      },
      code: `const ctx = new AudioContext();
const now = ctx.currentTime;
const sr = ctx.sampleRate;
const buf = ctx.createBuffer(1, sr * 0.1, sr);
const data = buf.getChannelData(0);
for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
const src = ctx.createBufferSource();
src.buffer = buf;
const bp = ctx.createBiquadFilter();
bp.type = 'bandpass';
bp.Q.setValueAtTime(0.4, now);
bp.frequency.setValueAtTime(500, now);
bp.frequency.exponentialRampToValueAtTime(2500, now + 0.06);
bp.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
const gain = ctx.createGain();
gain.gain.setValueAtTime(0, now);
gain.gain.linearRampToValueAtTime(0.4, now + 0.02);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
src.connect(bp); bp.connect(gain); gain.connect(ctx.destination);
src.start();`,
    },
        {
      name: 'Whisper',
      desc: 'Barely audible air movement',
      technique: 'white noise, very quiet, highpass, 120ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const buf = createNoiseBuffer(c, 'white', 0.12);
        const src = c.createBufferSource(); src.buffer = buf;
        const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.setValueAtTime(3000, now);
        const g = c.createGain(); g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.4, now + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        src.connect(hp); hp.connect(g); g.connect(getAnalyser()); src.start(now);
      },
      code: `const ctx = new AudioContext();
const now = ctx.currentTime;
const sr = ctx.sampleRate;
const buf = ctx.createBuffer(1, sr * 0.12, sr);
const data = buf.getChannelData(0);
for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
const src = ctx.createBufferSource();
src.buffer = buf;
const hp = ctx.createBiquadFilter();
hp.type = 'highpass';
hp.frequency.setValueAtTime(3000, now);
const gain = ctx.createGain();
gain.gain.setValueAtTime(0, now);
gain.gain.linearRampToValueAtTime(0.4, now + 0.03);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
src.connect(hp); hp.connect(gain); gain.connect(ctx.destination);
src.start();`,
    },
        {
      name: 'Exhale',
      desc: 'Soft breath outward',
      technique: 'noise breath, gentle rise, 180ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const buf = createNoiseBuffer(c, 'pink', 0.18);
        const src = c.createBufferSource(); src.buffer = buf;
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.setValueAtTime(0.5, now);
        bp.frequency.setValueAtTime(600, now); bp.frequency.exponentialRampToValueAtTime(1400, now + 0.15);
        const g = c.createGain(); g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.8, now + 0.04); g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        src.connect(bp); bp.connect(g); g.connect(getAnalyser()); src.start(now);
      },
      code: `const ctx = new AudioContext();
const now = ctx.currentTime;
const sr = ctx.sampleRate;
const len = sr * 0.18;
const buf = ctx.createBuffer(1, len, sr);
const data = buf.getChannelData(0);
let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
for (let i = 0; i < len; i++) {
  const w = Math.random() * 2 - 1;
  b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
  b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
  b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
  data[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11; b6=w*0.115926;
}
const src = ctx.createBufferSource();
src.buffer = buf;
const bp = ctx.createBiquadFilter();
bp.type = 'bandpass';
bp.Q.setValueAtTime(0.5, now);
bp.frequency.setValueAtTime(600, now);
bp.frequency.exponentialRampToValueAtTime(1400, now + 0.15);
const gain = ctx.createGain();
gain.gain.setValueAtTime(0, now);
gain.gain.linearRampToValueAtTime(0.8, now + 0.04);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
src.connect(bp); bp.connect(gain); gain.connect(ctx.destination);
src.start();`,
    },
        {
      name: 'Breath',
      desc: 'Single quiet breath',
      technique: 'pink noise, bandpass swell, 250ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const buf = createNoiseBuffer(c, 'pink', 0.25);
        const src = c.createBufferSource(); src.buffer = buf;
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.setValueAtTime(0.3, now);
        bp.frequency.setValueAtTime(500, now);
        bp.frequency.linearRampToValueAtTime(900, now + 0.1);
        bp.frequency.linearRampToValueAtTime(400, now + 0.25);
        const g = c.createGain(); g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.8, now + 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        src.connect(bp); bp.connect(g); g.connect(getAnalyser()); src.start(now);
      },
      code: `const ctx = new AudioContext();
const now = ctx.currentTime;
const sr = ctx.sampleRate;
const len = sr * 0.25;
const buf = ctx.createBuffer(1, len, sr);
const data = buf.getChannelData(0);
let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
for (let i = 0; i < len; i++) {
  const w = Math.random() * 2 - 1;
  b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
  b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
  b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
  data[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11; b6=w*0.115926;
}
const src = ctx.createBufferSource();
src.buffer = buf;
const bp = ctx.createBiquadFilter();
bp.type = 'bandpass';
bp.Q.setValueAtTime(0.3, now);
bp.frequency.setValueAtTime(500, now);
bp.frequency.linearRampToValueAtTime(900, now + 0.1);
bp.frequency.linearRampToValueAtTime(400, now + 0.25);
const gain = ctx.createGain();
gain.gain.setValueAtTime(0, now);
gain.gain.linearRampToValueAtTime(0.8, now + 0.08);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
src.connect(bp); bp.connect(gain); gain.connect(ctx.destination);
src.start();`,
    },
  ],

  'Compound': [
        {
      name: 'Typing',
      desc: 'Keyboard keystroke',
      technique: 'noise burst + click',
      play: () => {
        const c = getCtx();
        const now = c.currentTime;
        // Noise burst
        const buf = createNoiseBuffer(c, 'white', 0.02);
        const src = c.createBufferSource();
        src.buffer = buf;
        const hp = c.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(4000, now);
        const g = c.createGain();
        g.gain.setValueAtTime(0.4, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        src.connect(hp); hp.connect(g); g.connect(getAnalyser());
        src.start(now);
        // Click
        const o = c.createOscillator();
        const g2 = c.createGain();
        o.connect(g2); g2.connect(getAnalyser());
        o.frequency.setValueAtTime(1000, now);
        g2.gain.setValueAtTime(0.25, now);
        g2.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
        o.start(now); o.stop(now + 0.02);
      },
      code: `const ctx = new AudioContext();
const now = ctx.currentTime;

// Noise burst for the "thock"
const sr = ctx.sampleRate;
const buf = ctx.createBuffer(1, sr * 0.02, sr);
const data = buf.getChannelData(0);
for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

const src = ctx.createBufferSource();
src.buffer = buf;
const hp = ctx.createBiquadFilter();
hp.type = 'highpass';
hp.frequency.setValueAtTime(4000, now);
const gain1 = ctx.createGain();
gain1.gain.setValueAtTime(1.0, now);
gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
src.connect(hp);
hp.connect(gain1);
gain1.connect(ctx.destination);
src.start();

// Click overtone
const osc = ctx.createOscillator();
const gain2 = ctx.createGain();
osc.connect(gain2);
gain2.connect(ctx.destination);
osc.frequency.setValueAtTime(1000, now);
gain2.gain.setValueAtTime(0.25, now);
gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
osc.start();
osc.stop(now + 0.02);`,
    },
        {
      name: 'Reset',
      desc: 'Snapping back to default view',
      technique: 'noise + sine, quick settle, 40ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const buf = createNoiseBuffer(c, 'white', 0.015);
        const src = c.createBufferSource(); src.buffer = buf;
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(2000, now); bp.Q.setValueAtTime(0.5, now);
        const g1 = c.createGain(); g1.gain.setValueAtTime(1.0, now); g1.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
        src.connect(bp); bp.connect(g1); g1.connect(getAnalyser()); src.start(now);
        const o = c.createOscillator(); const g2 = c.createGain();
        o.connect(g2); g2.connect(getAnalyser());
        o.frequency.setValueAtTime(400, now + 0.005); o.frequency.exponentialRampToValueAtTime(340, now + 0.035);
        g2.gain.setValueAtTime(0, now); g2.gain.setValueAtTime(0.3, now + 0.005);
        g2.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        o.start(now + 0.005); o.stop(now + 0.05);
      },
      code: `const ctx = new AudioContext();
const now = ctx.currentTime;

// Noise snap
const sr = ctx.sampleRate;
const buf = ctx.createBuffer(1, sr * 0.015, sr);
const data = buf.getChannelData(0);
for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
const src = ctx.createBufferSource();
src.buffer = buf;
const bp = ctx.createBiquadFilter();
bp.type = 'bandpass';
bp.frequency.setValueAtTime(2000, now);
bp.Q.setValueAtTime(0.5, now);
const gain1 = ctx.createGain();
gain1.gain.setValueAtTime(0.4, now);
gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
src.connect(bp); bp.connect(gain1); gain1.connect(ctx.destination);
src.start();

// Sine settle
const osc = ctx.createOscillator();
const gain2 = ctx.createGain();
osc.connect(gain2); gain2.connect(ctx.destination);
osc.frequency.setValueAtTime(400, now + 0.005);
osc.frequency.exponentialRampToValueAtTime(340, now + 0.035);
gain2.gain.setValueAtTime(0, now);
gain2.gain.setValueAtTime(0.3, now + 0.005);
gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
osc.start(now + 0.005);
osc.stop(now + 0.05);`,
    },
        {
      name: 'Land',
      desc: 'Photo landing on a desk',
      technique: 'noise thump + sine weight, 50ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const buf = createNoiseBuffer(c, 'brown', 0.025);
        const src = c.createBufferSource(); src.buffer = buf;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(600, now);
        const g1 = c.createGain(); g1.gain.setValueAtTime(0.4, now); g1.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
        src.connect(lp); lp.connect(g1); g1.connect(getAnalyser()); src.start(now);
        const o = c.createOscillator(); const g2 = c.createGain();
        o.connect(g2); g2.connect(getAnalyser());
        o.frequency.setValueAtTime(200, now); o.frequency.exponentialRampToValueAtTime(140, now + 0.04);
        g2.gain.setValueAtTime(0.4, now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        o.start(now); o.stop(now + 0.06);
      },
      code: `const ctx = new AudioContext();
const now = ctx.currentTime;
const sr = ctx.sampleRate;

// Noise thump
const len = sr * 0.025;
const buf = ctx.createBuffer(1, len, sr);
const data = buf.getChannelData(0);
let last = 0;
for (let i = 0; i < len; i++) {
  const w = Math.random() * 2 - 1;
  data[i] = (last + 0.02 * w) / 1.02;
  last = data[i]; data[i] *= 3.5;
}
const src = ctx.createBufferSource();
src.buffer = buf;
const lp = ctx.createBiquadFilter();
lp.type = 'lowpass';
lp.frequency.setValueAtTime(600, now);
const gain1 = ctx.createGain();
gain1.gain.setValueAtTime(0.4, now);
gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
src.connect(lp); lp.connect(gain1); gain1.connect(ctx.destination);
src.start();

// Sine weight
const osc = ctx.createOscillator();
const gain2 = ctx.createGain();
osc.connect(gain2); gain2.connect(ctx.destination);
osc.frequency.setValueAtTime(200, now);
osc.frequency.exponentialRampToValueAtTime(140, now + 0.04);
gain2.gain.setValueAtTime(0.4, now);
gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
osc.start();
osc.stop(now + 0.06);`,
    },
        {
      name: 'Success',
      desc: 'Task completed',
      technique: 'two ascending tones',
      play: () => {
        const c = getCtx();
        const now = c.currentTime;
        [523, 659].forEach((freq, i) => {
          const o = c.createOscillator();
          const g = c.createGain();
          o.connect(g); g.connect(getAnalyser());
          o.frequency.setValueAtTime(freq, now + i * 0.12);
          g.gain.setValueAtTime(0, now);
          g.gain.setValueAtTime(0.4, now + i * 0.12);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.15);
          o.start(now + i * 0.12);
          o.stop(now + i * 0.12 + 0.16);
        });
      },
      code: `const ctx = new AudioContext();
const now = ctx.currentTime;

[523, 659].forEach((freq, i) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.frequency.setValueAtTime(freq, now + i * 0.12);
  gain.gain.setValueAtTime(0, now);
  gain.gain.setValueAtTime(0.4, now + i * 0.12);
  gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.15);

  osc.start(now + i * 0.12);
  osc.stop(now + i * 0.12 + 0.16);
});`,
    },
        {
      name: 'Notification',
      desc: 'Bell-like alert',
      technique: 'FM synthesis',
      play: () => {
        const c = getCtx();
        const now = c.currentTime;
        const carrier = c.createOscillator();
        const mod = c.createOscillator();
        const modG = c.createGain();
        const g = c.createGain();
        mod.frequency.setValueAtTime(880, now);
        modG.gain.setValueAtTime(200, now);
        modG.gain.exponentialRampToValueAtTime(0.5, now + 0.5);
        carrier.frequency.setValueAtTime(880, now);
        mod.connect(modG); modG.connect(carrier.frequency);
        carrier.connect(g); g.connect(getAnalyser());
        g.gain.setValueAtTime(0.4, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        carrier.start(now); mod.start(now);
        carrier.stop(now + 0.55); mod.stop(now + 0.55);
      },
      code: `const ctx = new AudioContext();
const now = ctx.currentTime;

const carrier = ctx.createOscillator();
const mod = ctx.createOscillator();
const modGain = ctx.createGain();
const gain = ctx.createGain();

// FM: modulator -> modGain -> carrier.frequency
mod.frequency.setValueAtTime(880, now);
modGain.gain.setValueAtTime(200, now);
modGain.gain.exponentialRampToValueAtTime(0.5, now + 0.5);
carrier.frequency.setValueAtTime(880, now);

mod.connect(modGain);
modGain.connect(carrier.frequency);
carrier.connect(gain);
gain.connect(ctx.destination);

gain.gain.setValueAtTime(0.4, now);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

carrier.start(now);
mod.start(now);
carrier.stop(now + 0.55);
mod.stop(now + 0.55);`,
    },
  ],
};

// ============================================================
// Component
// ============================================================

export default function SoundsPlayground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  // Oscillator
  const [waveform, setWaveform] = useState<OscillatorType>('sine');
  const [frequency, setFrequency] = useState(440);
  const [duration, setDuration] = useState(0.3);

  // Pitch envelope
  const [pitchStart, setPitchStart] = useState(440);
  const [pitchEnd, setPitchEnd] = useState(440);
  const [usePitch, setUsePitch] = useState(false);

  // ADSR
  const [attack, setAttack] = useState(0.01);
  const [decay, setDecay] = useState(0.15);
  const [sustain, setSustain] = useState(0.5);
  const [release, setRelease] = useState(0.2);

  // Filter
  const [filterType, setFilterType] = useState<BiquadFilterType>('lowpass');
  const [filterFreq, setFilterFreq] = useState(2000);
  const [filterQ, setFilterQ] = useState(1);
  const [useFilter, setUseFilter] = useState(false);

  // Noise
  const [noiseType, setNoiseType] = useState<'white' | 'pink' | 'brown'>('white');
  const [noiseDuration, setNoiseDuration] = useState(0.5);

  // FM
  const [fmCarrier, setFmCarrier] = useState(440);
  const [fmMod, setFmMod] = useState(200);
  const [fmDepth, setFmDepth] = useState(200);

  // Copied state
  const [copiedPreset, setCopiedPreset] = useState<string | null>(null);

  // Mutable category layout: category name → array of preset names
  const [layout, setLayout] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {};
    for (const [cat, items] of Object.entries(presets)) {
      init[cat] = items.map(p => p.name);
    }
    return init;
  });

  // Comments per preset
  const [comments, setComments] = useState<Record<string, string>>({});

  // Drag state
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOverCat, setDragOverCat] = useState<string | null>(null);

  // Flat lookup map for preset data
  const presetByName = useMemo(() => {
    const map = new Map<string, Preset>();
    for (const items of Object.values(presets)) {
      for (const p of items) map.set(p.name, p);
    }
    return map;
  }, []);

  // Visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const cctx = canvas.getContext('2d');
      if (!cctx) return;

      const w = canvas.width;
      const h = canvas.height;
      cctx.fillStyle = '#0e0e1a';
      cctx.fillRect(0, 0, w, h);

      if (analyserNode) {
        const bufLen = analyserNode.frequencyBinCount;
        const data = new Uint8Array(bufLen);
        analyserNode.getByteTimeDomainData(data);

        cctx.lineWidth = 2;
        cctx.strokeStyle = '#6366f1';
        cctx.beginPath();

        const slice = w / bufLen;
        let x = 0;
        for (let i = 0; i < bufLen; i++) {
          const v = data[i] / 128.0;
          const y = (v * h) / 2;
          if (i === 0) cctx.moveTo(x, y);
          else cctx.lineTo(x, y);
          x += slice;
        }
        cctx.lineTo(w, h / 2);
        cctx.stroke();
      } else {
        // Flat line
        cctx.strokeStyle = '#2a2a3e';
        cctx.lineWidth = 1;
        cctx.beginPath();
        cctx.moveTo(0, h / 2);
        cctx.lineTo(w, h / 2);
        cctx.stroke();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    // Set canvas resolution
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;

    const resizeObs = new ResizeObserver(() => {
      const r = canvas.getBoundingClientRect();
      canvas.width = r.width * 2;
      canvas.height = r.height * 2;
    });
    resizeObs.observe(canvas);

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      resizeObs.disconnect();
    };
  }, []);

  // Play oscillator with current settings
  const handlePlayOsc = useCallback(() => {
    playTone({
      type: waveform,
      frequency,
      duration,
      attack,
      decay,
      sustain,
      release,
      pitchStart: usePitch ? pitchStart : undefined,
      pitchEnd: usePitch ? pitchEnd : undefined,
      filterType: useFilter ? filterType : undefined,
      filterFreq: useFilter ? filterFreq : undefined,
      filterQ: useFilter ? filterQ : undefined,
    });
  }, [waveform, frequency, duration, attack, decay, sustain, release, usePitch, pitchStart, pitchEnd, useFilter, filterType, filterFreq, filterQ]);

  const handlePlayNoise = useCallback(() => {
    playNoise(
      noiseType,
      noiseDuration,
      useFilter ? filterType : undefined,
      useFilter ? filterFreq : undefined,
      useFilter ? filterQ : undefined
    );
  }, [noiseType, noiseDuration, useFilter, filterType, filterFreq, filterQ]);

  const handlePlayFM = useCallback(() => {
    playFMTone({
      carrier: fmCarrier,
      modFreq: fmMod,
      modDepth: fmDepth,
      duration,
      attack,
      decay,
      sustain,
      release,
    });
  }, [fmCarrier, fmMod, fmDepth, duration, attack, decay, sustain, release]);

  const handleCopy = useCallback((name: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedPreset(name);
    setTimeout(() => setCopiedPreset(null), 1500);
  }, []);

  const handleDragStart = useCallback((name: string) => {
    setDragging(name);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, category: string) => {
    e.preventDefault();
    setDragOverCat(category);
  }, []);

  const handleDrop = useCallback((targetCat: string) => {
    if (!dragging) return;
    setLayout(prev => {
      const next = { ...prev };
      // Find and remove from source category
      for (const cat of Object.keys(next)) {
        const idx = next[cat].indexOf(dragging);
        if (idx !== -1) {
          next[cat] = next[cat].filter(n => n !== dragging);
          break;
        }
      }
      // Add to target category
      next[targetCat] = [...next[targetCat], dragging];
      return next;
    });
    setDragging(null);
    setDragOverCat(null);
  }, [dragging]);

  const handleDragEnd = useCallback(() => {
    setDragging(null);
    setDragOverCat(null);
  }, []);

  const setComment = useCallback((name: string, text: string) => {
    setComments(prev => ({ ...prev, [name]: text }));
  }, []);

  const exportArrangement = useCallback(() => {
    const lines: string[] = [];
    for (const [cat, names] of Object.entries(layout)) {
      if (names.length === 0) continue;
      lines.push(`## ${cat}`);
      for (const name of names) {
        const comment = comments[name];
        lines.push(comment ? `- ${name}: "${comment}"` : `- ${name}`);
      }
      lines.push('');
    }
    const text = lines.join('\n');
    navigator.clipboard.writeText(text);
    setCopiedPreset('__export');
    setTimeout(() => setCopiedPreset(null), 1500);
  }, [layout, comments]);

  // ADSR SVG path
  const adsrPath = useCallback(() => {
    const w = 200;
    const h = 60;
    const totalTime = attack + decay + 0.3 + release;
    const ax = (attack / totalTime) * w;
    const dx = ax + (decay / totalTime) * w;
    const sx = dx + (0.3 / totalTime) * w;
    const rx = sx + (release / totalTime) * w;
    const sustainY = h - sustain * h;

    return {
      line: `M 0 ${h} L ${ax} 0 L ${dx} ${sustainY} L ${sx} ${sustainY} L ${rx} ${h}`,
      fill: `M 0 ${h} L ${ax} 0 L ${dx} ${sustainY} L ${sx} ${sustainY} L ${rx} ${h} Z`,
      labels: [
        { x: ax / 2, label: 'A' },
        { x: (ax + dx) / 2, label: 'D' },
        { x: (dx + sx) / 2, label: 'S' },
        { x: (sx + rx) / 2, label: 'R' },
      ],
      divisions: [ax, dx, sx],
    };
  }, [attack, decay, sustain, release]);

  const adsr = adsrPath();

  return (
    <div className="sounds-page">
      <h1>Sound Playground</h1>
      <p className="subtitle">Explore Web Audio API synthesis for UI sound effects</p>

      {/* Visualizer */}
      <div className="visualizer-wrap">
        <canvas ref={canvasRef} />
      </div>

      {/* Sound Designer */}
      <div className="sounds-grid">
        {/* Oscillator */}
        <div className="sound-card">
          <h2>Oscillator</h2>
          <p className="card-desc">Base waveform shape and frequency</p>

          <div className="toggle-row">
            {(['sine', 'square', 'sawtooth', 'triangle'] as OscillatorType[]).map((t) => (
              <button
                key={t}
                className={`toggle-btn ${waveform === t ? 'active' : ''}`}
                onClick={() => setWaveform(t)}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="slider-group">
            <div className="slider-label">
              <span>Frequency</span>
              <span>{frequency} Hz</span>
            </div>
            <input
              type="range"
              min={20}
              max={4000}
              step={1}
              value={frequency}
              onChange={(e) => setFrequency(+e.target.value)}
            />
          </div>

          <div className="slider-group">
            <div className="slider-label">
              <span>Duration</span>
              <span>{duration.toFixed(2)} s</span>
            </div>
            <input
              type="range"
              min={0.02}
              max={2}
              step={0.01}
              value={duration}
              onChange={(e) => setDuration(+e.target.value)}
            />
          </div>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={usePitch}
              onChange={(e) => setUsePitch(e.target.checked)}
            />
            Pitch sweep
          </label>

          {usePitch && (
            <>
              <div className="slider-group">
                <div className="slider-label">
                  <span>Start freq</span>
                  <span>{pitchStart} Hz</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={4000}
                  step={1}
                  value={pitchStart}
                  onChange={(e) => setPitchStart(+e.target.value)}
                />
              </div>
              <div className="slider-group">
                <div className="slider-label">
                  <span>End freq</span>
                  <span>{pitchEnd} Hz</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={4000}
                  step={1}
                  value={pitchEnd}
                  onChange={(e) => setPitchEnd(+e.target.value)}
                />
              </div>
            </>
          )}

          <button className="play-btn" onClick={handlePlayOsc}>
            Play Oscillator
          </button>
        </div>

        {/* Envelope */}
        <div className="sound-card">
          <h2>Envelope (ADSR)</h2>
          <p className="card-desc">Amplitude shape over time</p>

          <svg className="envelope-viz" viewBox="0 0 200 60" preserveAspectRatio="none">
            <path className="fill" d={adsr.fill} />
            <path d={adsr.line} />
            {adsr.divisions.map((x, i) => (
              <line key={i} x1={x} y1={0} x2={x} y2={60} />
            ))}
            {adsr.labels.map((l, i) => (
              <text key={i} x={l.x} y={56} textAnchor="middle">
                {l.label}
              </text>
            ))}
          </svg>

          <div className="adsr-row">
            <div className="slider-group">
              <div className="slider-label">
                <span>Attack</span>
                <span>{attack.toFixed(3)} s</span>
              </div>
              <input
                type="range"
                min={0.001}
                max={1}
                step={0.001}
                value={attack}
                onChange={(e) => setAttack(+e.target.value)}
              />
            </div>
            <div className="slider-group">
              <div className="slider-label">
                <span>Decay</span>
                <span>{decay.toFixed(3)} s</span>
              </div>
              <input
                type="range"
                min={0.001}
                max={1}
                step={0.001}
                value={decay}
                onChange={(e) => setDecay(+e.target.value)}
              />
            </div>
            <div className="slider-group">
              <div className="slider-label">
                <span>Sustain</span>
                <span>{(sustain * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={sustain}
                onChange={(e) => setSustain(+e.target.value)}
              />
            </div>
            <div className="slider-group">
              <div className="slider-label">
                <span>Release</span>
                <span>{release.toFixed(3)} s</span>
              </div>
              <input
                type="range"
                min={0.001}
                max={2}
                step={0.001}
                value={release}
                onChange={(e) => setRelease(+e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="sound-card">
          <h2>Filter</h2>
          <p className="card-desc">Shape the frequency spectrum</p>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={useFilter}
              onChange={(e) => setUseFilter(e.target.checked)}
            />
            Enable filter
          </label>

          {useFilter && (
            <>
              <div className="toggle-row">
                {(['lowpass', 'highpass', 'bandpass', 'notch'] as BiquadFilterType[]).map((t) => (
                  <button
                    key={t}
                    className={`toggle-btn ${filterType === t ? 'active' : ''}`}
                    onClick={() => setFilterType(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="slider-group">
                <div className="slider-label">
                  <span>Cutoff</span>
                  <span>{filterFreq} Hz</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={18000}
                  step={1}
                  value={filterFreq}
                  onChange={(e) => setFilterFreq(+e.target.value)}
                />
              </div>

              <div className="slider-group">
                <div className="slider-label">
                  <span>Resonance (Q)</span>
                  <span>{filterQ.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={20}
                  step={0.1}
                  value={filterQ}
                  onChange={(e) => setFilterQ(+e.target.value)}
                />
              </div>
            </>
          )}

          <button className="play-btn" onClick={handlePlayOsc}>
            Play Filtered Tone
          </button>
        </div>

        {/* FM Synthesis */}
        <div className="sound-card">
          <h2>FM Synthesis</h2>
          <p className="card-desc">Frequency modulation for metallic / bell sounds</p>

          <div className="slider-group">
            <div className="slider-label">
              <span>Carrier</span>
              <span>{fmCarrier} Hz</span>
            </div>
            <input
              type="range"
              min={50}
              max={2000}
              step={1}
              value={fmCarrier}
              onChange={(e) => setFmCarrier(+e.target.value)}
            />
          </div>

          <div className="slider-group">
            <div className="slider-label">
              <span>Modulator</span>
              <span>{fmMod} Hz</span>
            </div>
            <input
              type="range"
              min={1}
              max={2000}
              step={1}
              value={fmMod}
              onChange={(e) => setFmMod(+e.target.value)}
            />
          </div>

          <div className="slider-group">
            <div className="slider-label">
              <span>Mod depth</span>
              <span>{fmDepth}</span>
            </div>
            <input
              type="range"
              min={0}
              max={1000}
              step={1}
              value={fmDepth}
              onChange={(e) => setFmDepth(+e.target.value)}
            />
          </div>

          <button className="play-btn" onClick={handlePlayFM}>
            Play FM Tone
          </button>
        </div>

        {/* Noise */}
        <div className="sound-card full-width">
          <h2>Noise Generator</h2>
          <p className="card-desc">White, pink, and brown noise through optional filter</p>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <div className="toggle-row">
                {(['white', 'pink', 'brown'] as const).map((t) => (
                  <button
                    key={t}
                    className={`toggle-btn ${noiseType === t ? 'active' : ''}`}
                    onClick={() => setNoiseType(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="slider-group" style={{ flex: 1, minWidth: 200 }}>
              <div className="slider-label">
                <span>Duration</span>
                <span>{noiseDuration.toFixed(2)} s</span>
              </div>
              <input
                type="range"
                min={0.05}
                max={2}
                step={0.01}
                value={noiseDuration}
                onChange={(e) => setNoiseDuration(+e.target.value)}
              />
            </div>

            <button className="play-btn" style={{ width: 'auto', padding: '0.6rem 2rem' }} onClick={handlePlayNoise}>
              Play Noise
            </button>
          </div>
        </div>
      </div>

      {/* Presets */}
      <div className="presets-section">
        <h2>UI Sound Presets</h2>
        <p className="section-desc">Click to play, drag to reorganize, add notes then copy arrangement.</p>

        {Object.entries(layout).map(([category, names]) => (
          <div
            key={category}
            onDragOver={(e) => handleDragOver(e, category)}
            onDragLeave={() => setDragOverCat(null)}
            onDrop={() => handleDrop(category)}
          >
            <div className="preset-category">{category}</div>
            <div className={`presets-grid${dragOverCat === category ? ' drag-over' : ''}`}>
              {names.map((name) => {
                const p = presetByName.get(name);
                if (!p) return null;
                return (
                  <div
                    key={name}
                    className={`preset-card${dragging === name ? ' dragging' : ''}`}
                    draggable
                    onDragStart={() => handleDragStart(name)}
                    onDragEnd={handleDragEnd}
                    onClick={p.play}
                  >
                    <button
                      className={`copy-btn ${copiedPreset === name ? 'copied' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(name, p.code);
                      }}
                    >
                      {copiedPreset === name ? 'copied!' : 'copy'}
                    </button>
                    <div className="preset-name">{name}</div>
                    <div className="preset-desc">{p.desc}</div>
                    <div className="preset-technique">{p.technique}</div>
                    <input
                      className="preset-comment"
                      type="text"
                      placeholder="add note..."
                      value={comments[name] || ''}
                      onClick={(e) => e.stopPropagation()}
                      onDragStart={(e) => e.stopPropagation()}
                      onChange={(e) => setComment(name, e.target.value)}
                    />
                  </div>
                );
              })}
              {names.length === 0 && (
                <div className="preset-card empty-drop">drop sounds here</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Code for current settings */}
      <div className="code-panel">
        <div className="code-panel-header">
          <h3>Code for current settings</h3>
          <button
            className={`copy-btn ${copiedPreset === '__custom' ? 'copied' : ''}`}
            style={{ opacity: 1, position: 'static' }}
            onClick={() => handleCopy('__custom', generateCode())}
          >
            {copiedPreset === '__custom' ? 'copied!' : 'copy code'}
          </button>
        </div>
        <pre>{generateCurrentCode()}</pre>
      </div>

      {/* Export bar */}
      <div className="liked-bar">
        <span className="liked-bar-count">
          {Object.values(comments).filter(Boolean).length} note{Object.values(comments).filter(Boolean).length !== 1 ? 's' : ''}
        </span>
        <div className="liked-bar-actions">
          <button
            className={`liked-bar-btn primary${copiedPreset === '__export' ? ' copied' : ''}`}
            onClick={exportArrangement}
          >
            {copiedPreset === '__export' ? 'copied!' : 'copy arrangement'}
          </button>
        </div>
      </div>
    </div>
  );

  function generateCurrentCode(): string {
    let code = `const ctx = new AudioContext();\nconst osc = ctx.createOscillator();\nconst gain = ctx.createGain();\n`;
    code += `osc.type = '${waveform}';\n`;

    if (usePitch) {
      code += `osc.frequency.setValueAtTime(${pitchStart}, ctx.currentTime);\n`;
      code += `osc.frequency.exponentialRampToValueAtTime(${pitchEnd}, ctx.currentTime + ${duration});\n`;
    } else {
      code += `osc.frequency.setValueAtTime(${frequency}, ctx.currentTime);\n`;
    }

    code += `\n// ADSR envelope\n`;
    code += `gain.gain.setValueAtTime(0.0001, ctx.currentTime);\n`;
    code += `gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + ${attack});\n`;
    code += `gain.gain.linearRampToValueAtTime(${(0.3 * sustain).toFixed(4)}, ctx.currentTime + ${(attack + decay).toFixed(4)});\n`;
    code += `gain.gain.setValueAtTime(${(0.3 * sustain).toFixed(4)}, ctx.currentTime + ${duration});\n`;
    code += `gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + ${(duration + release).toFixed(4)});\n`;

    code += `\nosc.connect(gain);\n`;

    if (useFilter) {
      code += `\nconst filter = ctx.createBiquadFilter();\n`;
      code += `filter.type = '${filterType}';\n`;
      code += `filter.frequency.setValueAtTime(${filterFreq}, ctx.currentTime);\n`;
      code += `filter.Q.setValueAtTime(${filterQ}, ctx.currentTime);\n`;
      code += `gain.connect(filter);\n`;
      code += `filter.connect(ctx.destination);\n`;
    } else {
      code += `gain.connect(ctx.destination);\n`;
    }

    code += `\nosc.start();\nosc.stop(ctx.currentTime + ${(duration + release + 0.05).toFixed(4)});`;
    return code;
  }

  function generateCode(): string {
    return generateCurrentCode();
  }
}
