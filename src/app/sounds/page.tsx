'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import './sounds.css';

// ============================================================
// Audio Engine
// ============================================================

let ctx: AudioContext | null = null;
let analyserNode: AnalyserNode | null = null;
let playbackGain: GainNode | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function getPlaybackGain(): GainNode {
  if (!playbackGain) {
    const c = getCtx();
    playbackGain = c.createGain();
    playbackGain.connect(c.destination);
  }
  return playbackGain;
}

function setPlaybackVolume(vol: number) {
  getPlaybackGain().gain.value = vol;
}

function getAnalyser(): AnalyserNode {
  if (!analyserNode) {
    const c = getCtx();
    analyserNode = c.createAnalyser();
    analyserNode.fftSize = 2048;
    analyserNode.connect(getPlaybackGain());
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

interface TunableRange {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  unit?: string;
}

interface TunableSelect {
  key: string;
  label: string;
  type: 'select';
  options: string[];
  default: string;
}

type TunableParam = TunableRange | TunableSelect;

interface Preset {
  name: string;
  desc: string;
  technique: string;
  play: () => void;
  code: string;
  tunables?: TunableParam[];
  playTuned?: (params: Record<string, number | string>) => void;
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
      name: 'Snap Low',
      desc: 'Deeper noise click',
      technique: 'noise burst, highpass 2800Hz, 10ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const buf = createNoiseBuffer(c, 'white', 0.01);
        const src = c.createBufferSource(); src.buffer = buf;
        const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.setValueAtTime(2800, now);
        const g = c.createGain(); g.gain.setValueAtTime(0.4, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.01);
        src.connect(hp); hp.connect(g); g.connect(getAnalyser()); src.start(now);
      },
      code: `const ctx = new AudioContext();
const now = ctx.currentTime;
const sr = ctx.sampleRate;
const buf = ctx.createBuffer(1, sr * 0.01, sr);
const data = buf.getChannelData(0);
for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
const src = ctx.createBufferSource(); src.buffer = buf;
const hp = ctx.createBiquadFilter(); hp.type = 'highpass';
hp.frequency.setValueAtTime(2800, now);
const gain = ctx.createGain();
gain.gain.setValueAtTime(0.4, now);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.01);
src.connect(hp); hp.connect(gain); gain.connect(ctx.destination);
src.start();`,
    },
    {
      name: 'Snap High',
      desc: 'Bright, tight noise click',
      technique: 'noise burst, highpass 5200Hz, 6ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const buf = createNoiseBuffer(c, 'white', 0.006);
        const src = c.createBufferSource(); src.buffer = buf;
        const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.setValueAtTime(5200, now);
        const g = c.createGain(); g.gain.setValueAtTime(0.4, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.006);
        src.connect(hp); hp.connect(g); g.connect(getAnalyser()); src.start(now);
      },
      code: `const ctx = new AudioContext();
const now = ctx.currentTime;
const sr = ctx.sampleRate;
const buf = ctx.createBuffer(1, sr * 0.006, sr);
const data = buf.getChannelData(0);
for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
const src = ctx.createBufferSource(); src.buffer = buf;
const hp = ctx.createBiquadFilter(); hp.type = 'highpass';
hp.frequency.setValueAtTime(5200, now);
const gain = ctx.createGain();
gain.gain.setValueAtTime(0.4, now);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.006);
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
      name: 'Tick Airy',
      desc: 'Breathy, soft tick',
      technique: 'triangle + pink noise wisp, 15ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        // Soft triangle tone
        const o = c.createOscillator(); const g = c.createGain();
        o.type = 'triangle';
        o.connect(g); g.connect(getAnalyser());
        o.frequency.setValueAtTime(480, now);
        g.gain.setValueAtTime(0.25, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
        o.start(now); o.stop(now + 0.02);
        // Pink noise wisp
        const buf = createNoiseBuffer(c, 'pink', 0.012);
        const src = c.createBufferSource(); src.buffer = buf;
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(2200, now); bp.Q.setValueAtTime(0.6, now);
        const g2 = c.createGain(); g2.gain.setValueAtTime(0.12, now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.012);
        src.connect(bp); bp.connect(g2); g2.connect(getAnalyser()); src.start(now);
      },
      code: `// Triangle + pink noise wisp
const ctx = new AudioContext();
const now = ctx.currentTime;
const osc = ctx.createOscillator();
osc.type = 'triangle';
const gain = ctx.createGain();
osc.connect(gain); gain.connect(ctx.destination);
osc.frequency.setValueAtTime(480, now);
gain.gain.setValueAtTime(0.25, now);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
osc.start(now); osc.stop(now + 0.02);`,
    },
    {
      name: 'Tick Sharp',
      desc: 'Crisp, snappy tick',
      technique: 'sine 700Hz + white noise snap, 8ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        // Sharp sine
        const o = c.createOscillator(); const g = c.createGain();
        o.connect(g); g.connect(getAnalyser());
        o.frequency.setValueAtTime(720, now); o.frequency.exponentialRampToValueAtTime(600, now + 0.008);
        g.gain.setValueAtTime(0.35, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.01);
        o.start(now); o.stop(now + 0.012);
        // Tiny noise snap
        const buf = createNoiseBuffer(c, 'white', 0.005);
        const src = c.createBufferSource(); src.buffer = buf;
        const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.setValueAtTime(5000, now);
        const g2 = c.createGain(); g2.gain.setValueAtTime(0.1, now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.005);
        src.connect(hp); hp.connect(g2); g2.connect(getAnalyser()); src.start(now);
      },
      code: `// Sine + white noise snap
const ctx = new AudioContext();
const now = ctx.currentTime;
const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.connect(gain); gain.connect(ctx.destination);
osc.frequency.setValueAtTime(720, now);
osc.frequency.exponentialRampToValueAtTime(600, now + 0.008);
gain.gain.setValueAtTime(0.35, now);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.01);
osc.start(now); osc.stop(now + 0.012);`,
    },
    {
      name: 'Tick Sharp Low',
      desc: 'Low register sharp tick',
      technique: 'sine 504→420Hz + white noise snap, 10ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const o = c.createOscillator(); const g = c.createGain();
        o.connect(g); g.connect(getAnalyser());
        o.frequency.setValueAtTime(504, now); o.frequency.exponentialRampToValueAtTime(420, now + 0.01);
        g.gain.setValueAtTime(0.35, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.012);
        o.start(now); o.stop(now + 0.014);
        const buf = createNoiseBuffer(c, 'white', 0.006);
        const src = c.createBufferSource(); src.buffer = buf;
        const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.setValueAtTime(3500, now);
        const g2 = c.createGain(); g2.gain.setValueAtTime(0.1, now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.006);
        src.connect(hp); hp.connect(g2); g2.connect(getAnalyser()); src.start(now);
      },
      code: `// Low sharp tick — sine + white noise snap
const ctx = new AudioContext();
const now = ctx.currentTime;
const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.connect(gain); gain.connect(ctx.destination);
osc.frequency.setValueAtTime(504, now);
osc.frequency.exponentialRampToValueAtTime(420, now + 0.01);
gain.gain.setValueAtTime(0.35, now);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);
osc.start(now); osc.stop(now + 0.014);`,
    },
    {
      name: 'Tick Sharp High',
      desc: 'High register sharp tick',
      technique: 'sine 936→780Hz + white noise snap, 6ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const o = c.createOscillator(); const g = c.createGain();
        o.connect(g); g.connect(getAnalyser());
        o.frequency.setValueAtTime(936, now); o.frequency.exponentialRampToValueAtTime(780, now + 0.006);
        g.gain.setValueAtTime(0.35, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.008);
        o.start(now); o.stop(now + 0.01);
        const buf = createNoiseBuffer(c, 'white', 0.004);
        const src = c.createBufferSource(); src.buffer = buf;
        const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.setValueAtTime(6500, now);
        const g2 = c.createGain(); g2.gain.setValueAtTime(0.1, now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.004);
        src.connect(hp); hp.connect(g2); g2.connect(getAnalyser()); src.start(now);
      },
      code: `// High sharp tick — sine + white noise snap
const ctx = new AudioContext();
const now = ctx.currentTime;
const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.connect(gain); gain.connect(ctx.destination);
osc.frequency.setValueAtTime(936, now);
osc.frequency.exponentialRampToValueAtTime(780, now + 0.006);
gain.gain.setValueAtTime(0.35, now);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.008);
osc.start(now); osc.stop(now + 0.01);`,
    },
    {
      name: 'Tick Low',
      desc: 'Low register tick',
      technique: 'sine, 420Hz, 12ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const o = c.createOscillator(); const g = c.createGain();
        o.connect(g); g.connect(getAnalyser());
        o.frequency.setValueAtTime(420, now);
        g.gain.setValueAtTime(0.4, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.012);
        o.start(now); o.stop(now + 0.015);
      },
      code: `const ctx = new AudioContext();
const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.connect(gain); gain.connect(ctx.destination);
osc.frequency.setValueAtTime(420, ctx.currentTime);
gain.gain.setValueAtTime(0.4, ctx.currentTime);
gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.012);
osc.start(); osc.stop(ctx.currentTime + 0.015);`,
    },
    {
      name: 'Tick High',
      desc: 'High register tick',
      technique: 'sine, 780Hz, 12ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const o = c.createOscillator(); const g = c.createGain();
        o.connect(g); g.connect(getAnalyser());
        o.frequency.setValueAtTime(780, now);
        g.gain.setValueAtTime(0.4, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.012);
        o.start(now); o.stop(now + 0.015);
      },
      code: `const ctx = new AudioContext();
const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.connect(gain); gain.connect(ctx.destination);
osc.frequency.setValueAtTime(780, ctx.currentTime);
gain.gain.setValueAtTime(0.4, ctx.currentTime);
gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.012);
osc.start(); osc.stop(ctx.currentTime + 0.015);`,
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
      name: 'Dip Warm',
      desc: 'Warmer dip with texture',
      technique: 'triangle + brown noise layer, 25ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        // Triangle tone
        const o = c.createOscillator(); const g = c.createGain();
        o.type = 'triangle';
        o.connect(g); g.connect(getAnalyser());
        o.frequency.setValueAtTime(440, now); o.frequency.exponentialRampToValueAtTime(340, now + 0.025);
        g.gain.setValueAtTime(0.35, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        o.start(now); o.stop(now + 0.035);
        // Noise texture
        const buf = createNoiseBuffer(c, 'brown', 0.02);
        const src = c.createBufferSource(); src.buffer = buf;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(1200, now);
        const g2 = c.createGain(); g2.gain.setValueAtTime(0.15, now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        src.connect(lp); lp.connect(g2); g2.connect(getAnalyser()); src.start(now);
      },
      code: `// Triangle tone + brown noise texture
const ctx = new AudioContext();
const now = ctx.currentTime;
const osc = ctx.createOscillator();
osc.type = 'triangle';
const gain = ctx.createGain();
osc.connect(gain); gain.connect(ctx.destination);
osc.frequency.setValueAtTime(440, now);
osc.frequency.exponentialRampToValueAtTime(340, now + 0.025);
gain.gain.setValueAtTime(0.35, now);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
osc.start(now); osc.stop(now + 0.035);`,
    },
    {
      name: 'Dip Low',
      desc: 'Low register dip',
      technique: 'sine, 364→308Hz, 20ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const o = c.createOscillator(); const g = c.createGain();
        o.connect(g); g.connect(getAnalyser());
        o.frequency.setValueAtTime(364, now); o.frequency.exponentialRampToValueAtTime(308, now + 0.02);
        g.gain.setValueAtTime(0.4, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
        o.start(now); o.stop(now + 0.03);
      },
      code: `const ctx = new AudioContext();
const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.connect(gain); gain.connect(ctx.destination);
osc.frequency.setValueAtTime(364, ctx.currentTime);
osc.frequency.exponentialRampToValueAtTime(308, ctx.currentTime + 0.02);
gain.gain.setValueAtTime(0.4, ctx.currentTime);
gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.025);
osc.start(); osc.stop(ctx.currentTime + 0.03);`,
    },
    {
      name: 'Dip High',
      desc: 'High register dip',
      technique: 'sine, 676→572Hz, 20ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const o = c.createOscillator(); const g = c.createGain();
        o.connect(g); g.connect(getAnalyser());
        o.frequency.setValueAtTime(676, now); o.frequency.exponentialRampToValueAtTime(572, now + 0.02);
        g.gain.setValueAtTime(0.4, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
        o.start(now); o.stop(now + 0.03);
      },
      code: `const ctx = new AudioContext();
const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.connect(gain); gain.connect(ctx.destination);
osc.frequency.setValueAtTime(676, ctx.currentTime);
osc.frequency.exponentialRampToValueAtTime(572, ctx.currentTime + 0.02);
gain.gain.setValueAtTime(0.4, ctx.currentTime);
gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.025);
osc.start(); osc.stop(ctx.currentTime + 0.03);`,
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
    {
      name: 'Exhale Tight',
      desc: 'Compact, focused breath',
      technique: 'brown noise, lowpass sweep, 120ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const buf = createNoiseBuffer(c, 'brown', 0.12);
        const src = c.createBufferSource(); src.buffer = buf;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.setValueAtTime(0.5, now);
        lp.frequency.setValueAtTime(1200, now); lp.frequency.exponentialRampToValueAtTime(300, now + 0.1);
        const g = c.createGain(); g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.7, now + 0.02); g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        src.connect(lp); lp.connect(g); g.connect(getAnalyser()); src.start(now);
      },
      code: `// Compact brown noise exhale
const ctx = new AudioContext();
const now = ctx.currentTime;
const sr = ctx.sampleRate;
const len = sr * 0.12;
const buf = ctx.createBuffer(1, len, sr);
const data = buf.getChannelData(0);
let last = 0;
for (let i = 0; i < len; i++) {
  const w = Math.random() * 2 - 1;
  data[i] = (last + 0.02 * w) / 1.02;
  last = data[i]; data[i] *= 3.5;
}
const src = ctx.createBufferSource(); src.buffer = buf;
const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
lp.frequency.setValueAtTime(1200, now);
lp.frequency.exponentialRampToValueAtTime(300, now + 0.1);
const gain = ctx.createGain();
gain.gain.setValueAtTime(0, now);
gain.gain.linearRampToValueAtTime(0.7, now + 0.02);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
src.connect(lp); lp.connect(gain); gain.connect(ctx.destination);
src.start();`,
    },
    {
      name: 'Exhale Low',
      desc: 'Deep, slow breath out',
      technique: 'noise breath, bandpass 420→980Hz, 200ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const buf = createNoiseBuffer(c, 'pink', 0.2);
        const src = c.createBufferSource(); src.buffer = buf;
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.setValueAtTime(0.5, now);
        bp.frequency.setValueAtTime(420, now); bp.frequency.exponentialRampToValueAtTime(980, now + 0.166);
        const g = c.createGain(); g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.8, now + 0.05); g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        src.connect(bp); bp.connect(g); g.connect(getAnalyser()); src.start(now);
      },
      code: `// Deep exhale
const ctx = new AudioContext();
const now = ctx.currentTime;
const sr = ctx.sampleRate;
const len = sr * 0.2;
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
const src = ctx.createBufferSource(); src.buffer = buf;
const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
bp.Q.setValueAtTime(0.5, now);
bp.frequency.setValueAtTime(420, now);
bp.frequency.exponentialRampToValueAtTime(980, now + 0.166);
const gain = ctx.createGain();
gain.gain.setValueAtTime(0, now);
gain.gain.linearRampToValueAtTime(0.8, now + 0.05);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
src.connect(bp); bp.connect(gain); gain.connect(ctx.destination);
src.start();`,
    },
    {
      name: 'Exhale High',
      desc: 'Light, airy breath',
      technique: 'noise breath, bandpass 780→1820Hz, 160ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const buf = createNoiseBuffer(c, 'pink', 0.16);
        const src = c.createBufferSource(); src.buffer = buf;
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.setValueAtTime(0.5, now);
        bp.frequency.setValueAtTime(780, now); bp.frequency.exponentialRampToValueAtTime(1820, now + 0.133);
        const g = c.createGain(); g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.8, now + 0.03); g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        src.connect(bp); bp.connect(g); g.connect(getAnalyser()); src.start(now);
      },
      code: `// Airy exhale
const ctx = new AudioContext();
const now = ctx.currentTime;
const sr = ctx.sampleRate;
const len = sr * 0.16;
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
const src = ctx.createBufferSource(); src.buffer = buf;
const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
bp.Q.setValueAtTime(0.5, now);
bp.frequency.setValueAtTime(780, now);
bp.frequency.exponentialRampToValueAtTime(1820, now + 0.133);
const gain = ctx.createGain();
gain.gain.setValueAtTime(0, now);
gain.gain.linearRampToValueAtTime(0.8, now + 0.03);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
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
        const g1 = c.createGain(); g1.gain.setValueAtTime(1.0, now); g1.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
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
gain1.gain.setValueAtTime(1.0, now);
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
      name: 'Land Heavy',
      desc: 'Deep, weighty thud',
      technique: 'brown noise + triangle 160→100Hz, 60ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        // Deep noise thump
        const buf = createNoiseBuffer(c, 'brown', 0.035);
        const src = c.createBufferSource(); src.buffer = buf;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(400, now);
        const g1 = c.createGain(); g1.gain.setValueAtTime(1.2, now); g1.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
        src.connect(lp); lp.connect(g1); g1.connect(getAnalyser()); src.start(now);
        // Deep triangle tone
        const o = c.createOscillator(); const g2 = c.createGain();
        o.type = 'triangle';
        o.connect(g2); g2.connect(getAnalyser());
        o.frequency.setValueAtTime(160, now); o.frequency.exponentialRampToValueAtTime(100, now + 0.05);
        g2.gain.setValueAtTime(0.45, now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        o.start(now); o.stop(now + 0.07);
      },
      code: `// Deep noise thump + triangle bass
const ctx = new AudioContext();
const now = ctx.currentTime;
const osc = ctx.createOscillator();
osc.type = 'triangle';
const gain = ctx.createGain();
osc.connect(gain); gain.connect(ctx.destination);
osc.frequency.setValueAtTime(160, now);
osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
gain.gain.setValueAtTime(0.45, now);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
osc.start(now); osc.stop(now + 0.07);`,
    },
    {
      name: 'Land Cushion',
      desc: 'Soft, pillowy landing',
      technique: 'pink noise + sine 240→170Hz, 45ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        // Soft noise cushion
        const buf = createNoiseBuffer(c, 'pink', 0.03);
        const src = c.createBufferSource(); src.buffer = buf;
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(600, now); bp.Q.setValueAtTime(0.4, now);
        const g1 = c.createGain(); g1.gain.setValueAtTime(0.5, now); g1.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        src.connect(bp); bp.connect(g1); g1.connect(getAnalyser()); src.start(now);
        // Gentle sine body
        const o = c.createOscillator(); const g2 = c.createGain();
        o.connect(g2); g2.connect(getAnalyser());
        o.frequency.setValueAtTime(240, now); o.frequency.exponentialRampToValueAtTime(170, now + 0.035);
        g2.gain.setValueAtTime(0.3, now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
        o.start(now); o.stop(now + 0.05);
      },
      code: `// Soft noise cushion + gentle sine
const ctx = new AudioContext();
const now = ctx.currentTime;
const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.connect(gain); gain.connect(ctx.destination);
osc.frequency.setValueAtTime(240, now);
osc.frequency.exponentialRampToValueAtTime(170, now + 0.035);
gain.gain.setValueAtTime(0.3, now);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
osc.start(now); osc.stop(now + 0.05);`,
    },
    {
      name: 'Land Low',
      desc: 'Deep, rumbling landing',
      technique: 'noise thump (lp 420Hz) + sine 140→98Hz, 60ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const buf = createNoiseBuffer(c, 'brown', 0.03);
        const src = c.createBufferSource(); src.buffer = buf;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(420, now);
        const g1 = c.createGain(); g1.gain.setValueAtTime(1.0, now); g1.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        src.connect(lp); lp.connect(g1); g1.connect(getAnalyser()); src.start(now);
        const o = c.createOscillator(); const g2 = c.createGain();
        o.connect(g2); g2.connect(getAnalyser());
        o.frequency.setValueAtTime(140, now); o.frequency.exponentialRampToValueAtTime(98, now + 0.05);
        g2.gain.setValueAtTime(0.4, now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        o.start(now); o.stop(now + 0.07);
      },
      code: `// Deep landing
const ctx = new AudioContext();
const now = ctx.currentTime;
const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.connect(gain); gain.connect(ctx.destination);
osc.frequency.setValueAtTime(140, now);
osc.frequency.exponentialRampToValueAtTime(98, now + 0.05);
gain.gain.setValueAtTime(0.4, now);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
osc.start(now); osc.stop(now + 0.07);`,
    },
    {
      name: 'Land High',
      desc: 'Bright, punchy landing',
      technique: 'noise thump (lp 780Hz) + sine 260→182Hz, 40ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const buf = createNoiseBuffer(c, 'brown', 0.02);
        const src = c.createBufferSource(); src.buffer = buf;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(780, now);
        const g1 = c.createGain(); g1.gain.setValueAtTime(1.0, now); g1.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        src.connect(lp); lp.connect(g1); g1.connect(getAnalyser()); src.start(now);
        const o = c.createOscillator(); const g2 = c.createGain();
        o.connect(g2); g2.connect(getAnalyser());
        o.frequency.setValueAtTime(260, now); o.frequency.exponentialRampToValueAtTime(182, now + 0.03);
        g2.gain.setValueAtTime(0.4, now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        o.start(now); o.stop(now + 0.05);
      },
      code: `// Bright landing
const ctx = new AudioContext();
const now = ctx.currentTime;
const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.connect(gain); gain.connect(ctx.destination);
osc.frequency.setValueAtTime(260, now);
osc.frequency.exponentialRampToValueAtTime(182, now + 0.03);
gain.gain.setValueAtTime(0.4, now);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
osc.start(now); osc.stop(now + 0.05);`,
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
      name: 'Success Low',
      desc: 'Low register completion',
      technique: 'two ascending tones [366, 461]Hz',
      play: () => {
        const c = getCtx();
        const now = c.currentTime;
        [366, 461].forEach((freq, i) => {
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
[366, 461].forEach((freq, i) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.frequency.setValueAtTime(freq, now + i * 0.12);
  gain.gain.setValueAtTime(0, now);
  gain.gain.setValueAtTime(0.4, now + i * 0.12);
  gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.15);
  osc.start(now + i * 0.12);
  osc.stop(now + i * 0.12 + 0.16);
});`,
    },
    {
      name: 'Success High',
      desc: 'Bright completion chime',
      technique: 'two ascending tones [680, 857]Hz',
      play: () => {
        const c = getCtx();
        const now = c.currentTime;
        [680, 857].forEach((freq, i) => {
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
[680, 857].forEach((freq, i) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.frequency.setValueAtTime(freq, now + i * 0.12);
  gain.gain.setValueAtTime(0, now);
  gain.gain.setValueAtTime(0.4, now + i * 0.12);
  gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.15);
  osc.start(now + i * 0.12);
  osc.stop(now + i * 0.12 + 0.16);
});`,
    },
    {
      name: 'Bloom',
      desc: 'Gentle three-note resolve',
      technique: 'triangle chord, staggered, 400ms',
      play: () => {
        const c = getCtx();
        const now = c.currentTime;
        // C5, E5, G5 — major triad blooming upward
        [523, 659, 784].forEach((freq, i) => {
          const o = c.createOscillator();
          o.type = 'triangle';
          const g = c.createGain();
          o.connect(g); g.connect(getAnalyser());
          const t = now + i * 0.09;
          o.frequency.setValueAtTime(freq, t);
          g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(0.25 - i * 0.04, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
          o.start(t);
          o.stop(t + 0.35);
        });
      },
      code: `const ctx = new AudioContext();
const now = ctx.currentTime;

// C5, E5, G5 — major triad blooming upward
[523, 659, 784].forEach((freq, i) => {
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  const t = now + i * 0.09;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.25 - i * 0.04, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  osc.start(t);
  osc.stop(t + 0.35);
});`,
    },
    {
      name: 'Resolve',
      desc: 'Soft downward resolve',
      technique: 'sine pitch drop + noise puff, 200ms',
      play: () => {
        const c = getCtx();
        const now = c.currentTime;
        // Gentle pitch settle
        const o = c.createOscillator();
        const g = c.createGain();
        o.connect(g); g.connect(getAnalyser());
        o.frequency.setValueAtTime(880, now);
        o.frequency.exponentialRampToValueAtTime(440, now + 0.15);
        g.gain.setValueAtTime(0.2, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        o.start(now); o.stop(now + 0.25);
        // Soft landing puff
        const buf = createNoiseBuffer(c, 'pink', 0.04);
        const src = c.createBufferSource(); src.buffer = buf;
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(2000, now + 0.08); bp.Q.setValueAtTime(0.5, now);
        const g2 = c.createGain(); g2.gain.setValueAtTime(0.15, now + 0.08); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        src.connect(bp); bp.connect(g2); g2.connect(getAnalyser()); src.start(now + 0.08);
      },
      code: `const ctx = new AudioContext();
const now = ctx.currentTime;

// Gentle pitch settle
const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.connect(gain); gain.connect(ctx.destination);
osc.frequency.setValueAtTime(880, now);
osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);
gain.gain.setValueAtTime(0.2, now);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
osc.start(now); osc.stop(now + 0.25);

// Soft landing puff
const sr = ctx.sampleRate;
const len = sr * 0.04;
const buf = ctx.createBuffer(1, len, sr);
const data = buf.getChannelData(0);
let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
for (let i = 0; i < len; i++) {
  const w = Math.random() * 2 - 1;
  b0 = 0.99886*b0 + w*0.0555179; b1 = 0.99332*b1 + w*0.0750759;
  b2 = 0.96900*b2 + w*0.1538520; b3 = 0.86650*b3 + w*0.3104856;
  b4 = 0.55000*b4 + w*0.5329522; b5 = -0.7616*b5 - w*0.0168980;
  data[i] = (b0+b1+b2+b3+b4+b5+b6 + w*0.5362) * 0.11;
  b6 = w * 0.115926;
}
const src = ctx.createBufferSource(); src.buffer = buf;
const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
bp.frequency.setValueAtTime(2000, now + 0.08); bp.Q.setValueAtTime(0.5, now);
const gain2 = ctx.createGain();
gain2.gain.setValueAtTime(0.15, now + 0.08);
gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
src.connect(bp); bp.connect(gain2); gain2.connect(ctx.destination);
src.start(now + 0.08);`,
    },
    {
      name: 'Sparkle',
      desc: 'Quick bright shimmer',
      technique: 'high sine cascade, 300ms',
      play: () => {
        const c = getCtx();
        const now = c.currentTime;
        // Descending bright notes — like little stars
        [2093, 1568, 1318, 1047].forEach((freq, i) => {
          const o = c.createOscillator();
          o.type = 'sine';
          const g = c.createGain();
          o.connect(g); g.connect(getAnalyser());
          const t = now + i * 0.06;
          o.frequency.setValueAtTime(freq, t);
          g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(0.12, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
          o.start(t);
          o.stop(t + 0.2);
        });
      },
      code: `const ctx = new AudioContext();
const now = ctx.currentTime;

// Descending bright notes — like little stars
[2093, 1568, 1318, 1047].forEach((freq, i) => {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  const t = now + i * 0.06;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  osc.start(t);
  osc.stop(t + 0.2);
});`,
    },
    {
      name: 'Sparkle Rising',
      desc: 'Ascending shimmer — hopeful',
      technique: 'ascending sine cascade, 300ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        [1047, 1318, 1568, 2093].forEach((freq, i) => {
          const o = c.createOscillator(); o.type = 'sine';
          const g = c.createGain();
          o.connect(g); g.connect(getAnalyser());
          const t = now + i * 0.06;
          o.frequency.setValueAtTime(freq, t);
          g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(0.1 + i * 0.02, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
          o.start(t); o.stop(t + 0.2);
        });
      },
      code: `const ctx = new AudioContext();
const now = ctx.currentTime;
// Ascending bright notes — hopeful lift
[1047, 1318, 1568, 2093].forEach((freq, i) => {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  const t = now + i * 0.06;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.1 + i * 0.02, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  osc.start(t); osc.stop(t + 0.2);
});`,
    },
    {
      name: 'Sparkle Slow',
      desc: 'Dreamy, stretched shimmer',
      technique: 'sine cascade, wide gaps, 600ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        [2093, 1568, 1318, 1047].forEach((freq, i) => {
          const o = c.createOscillator(); o.type = 'sine';
          const g = c.createGain();
          o.connect(g); g.connect(getAnalyser());
          const t = now + i * 0.12;
          o.frequency.setValueAtTime(freq, t);
          g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(0.1, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
          o.start(t); o.stop(t + 0.38);
        });
      },
      code: `const ctx = new AudioContext();
const now = ctx.currentTime;
// Dreamy, stretched sparkle
[2093, 1568, 1318, 1047].forEach((freq, i) => {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  const t = now + i * 0.12;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.1, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  osc.start(t); osc.stop(t + 0.38);
});`,
    },
    {
      name: 'Sparkle Glass',
      desc: 'Glassy triangle shimmer',
      technique: 'triangle cascade, tight + high, 250ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        [2637, 2093, 1760, 1397].forEach((freq, i) => {
          const o = c.createOscillator(); o.type = 'triangle';
          const g = c.createGain();
          o.connect(g); g.connect(getAnalyser());
          const t = now + i * 0.045;
          o.frequency.setValueAtTime(freq, t);
          g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(0.14, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
          o.start(t); o.stop(t + 0.16);
        });
      },
      code: `const ctx = new AudioContext();
const now = ctx.currentTime;
// Glassy triangle shimmer — tighter, higher
[2637, 2093, 1760, 1397].forEach((freq, i) => {
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  const t = now + i * 0.045;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.14, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  osc.start(t); osc.stop(t + 0.16);
});`,
    },
    {
      name: 'Hum',
      desc: 'Warm low completion hum',
      technique: 'sine + triangle, slow fade, 500ms',
      play: () => {
        const c = getCtx();
        const now = c.currentTime;
        // Warm base tone
        const o1 = c.createOscillator();
        o1.type = 'sine';
        o1.frequency.setValueAtTime(220, now);
        o1.frequency.exponentialRampToValueAtTime(262, now + 0.4);
        const g1 = c.createGain();
        g1.gain.setValueAtTime(0, now);
        g1.gain.linearRampToValueAtTime(0.2, now + 0.05);
        g1.gain.setValueAtTime(0.2, now + 0.25);
        g1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        o1.connect(g1); g1.connect(getAnalyser());
        o1.start(now); o1.stop(now + 0.55);
        // Harmonic overlay
        const o2 = c.createOscillator();
        o2.type = 'triangle';
        o2.frequency.setValueAtTime(440, now);
        o2.frequency.exponentialRampToValueAtTime(524, now + 0.4);
        const g2 = c.createGain();
        g2.gain.setValueAtTime(0, now);
        g2.gain.linearRampToValueAtTime(0.08, now + 0.08);
        g2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        o2.connect(g2); g2.connect(getAnalyser());
        o2.start(now); o2.stop(now + 0.5);
      },
      code: `const ctx = new AudioContext();
const now = ctx.currentTime;

// Warm base tone
const osc1 = ctx.createOscillator();
osc1.type = 'sine';
osc1.frequency.setValueAtTime(220, now);
osc1.frequency.exponentialRampToValueAtTime(262, now + 0.4);
const gain1 = ctx.createGain();
gain1.gain.setValueAtTime(0, now);
gain1.gain.linearRampToValueAtTime(0.2, now + 0.05);
gain1.gain.setValueAtTime(0.2, now + 0.25);
gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
osc1.connect(gain1); gain1.connect(ctx.destination);
osc1.start(now); osc1.stop(now + 0.55);

// Harmonic overlay
const osc2 = ctx.createOscillator();
osc2.type = 'triangle';
osc2.frequency.setValueAtTime(440, now);
osc2.frequency.exponentialRampToValueAtTime(524, now + 0.4);
const gain2 = ctx.createGain();
gain2.gain.setValueAtTime(0, now);
gain2.gain.linearRampToValueAtTime(0.08, now + 0.08);
gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
osc2.connect(gain2); gain2.connect(ctx.destination);
osc2.start(now); osc2.stop(now + 0.5);`,
    },
  ],

  'Misc': [],

  'Set: Warm': [
    {
      name: 'Warm Tap',
      desc: 'Muted, padded button press',
      technique: 'triangle 380→300Hz + brown noise, 25ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const o = c.createOscillator(); const g = c.createGain();
        o.type = 'triangle';
        o.connect(g); g.connect(getAnalyser());
        o.frequency.setValueAtTime(380, now); o.frequency.exponentialRampToValueAtTime(300, now + 0.025);
        g.gain.setValueAtTime(0.3, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        o.start(now); o.stop(now + 0.035);
        const buf = createNoiseBuffer(c, 'brown', 0.018);
        const src = c.createBufferSource(); src.buffer = buf;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, now);
        const g2 = c.createGain(); g2.gain.setValueAtTime(0.2, now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.018);
        src.connect(lp); lp.connect(g2); g2.connect(getAnalyser()); src.start(now);
      },
      code: `// Warm padded tap
const ctx = new AudioContext();
const now = ctx.currentTime;
const osc = ctx.createOscillator();
osc.type = 'triangle';
const gain = ctx.createGain();
osc.connect(gain); gain.connect(ctx.destination);
osc.frequency.setValueAtTime(380, now);
osc.frequency.exponentialRampToValueAtTime(300, now + 0.025);
gain.gain.setValueAtTime(0.3, now);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
osc.start(now); osc.stop(now + 0.035);`,
    },
    {
      name: 'Warm Stroke',
      desc: 'Gentle brush contact',
      technique: 'triangle 400Hz + pink noise wisp, 15ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const o = c.createOscillator(); const g = c.createGain();
        o.type = 'triangle';
        o.connect(g); g.connect(getAnalyser());
        o.frequency.setValueAtTime(400, now);
        g.gain.setValueAtTime(0.2, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
        o.start(now); o.stop(now + 0.02);
        const buf = createNoiseBuffer(c, 'pink', 0.01);
        const src = c.createBufferSource(); src.buffer = buf;
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(1200, now); bp.Q.setValueAtTime(0.4, now);
        const g2 = c.createGain(); g2.gain.setValueAtTime(0.08, now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.01);
        src.connect(bp); bp.connect(g2); g2.connect(getAnalyser()); src.start(now);
      },
      code: `// Warm gentle stroke
const ctx = new AudioContext();
const now = ctx.currentTime;
const osc = ctx.createOscillator();
osc.type = 'triangle';
const gain = ctx.createGain();
osc.connect(gain); gain.connect(ctx.destination);
osc.frequency.setValueAtTime(400, now);
gain.gain.setValueAtTime(0.2, now);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
osc.start(now); osc.stop(now + 0.02);`,
    },
    {
      name: 'Warm Thump',
      desc: 'Deep velvet thud',
      technique: 'brown noise (lp 500Hz) + triangle 150→100Hz, 70ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const buf = createNoiseBuffer(c, 'brown', 0.04);
        const src = c.createBufferSource(); src.buffer = buf;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(500, now);
        const g1 = c.createGain(); g1.gain.setValueAtTime(1.0, now); g1.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        src.connect(lp); lp.connect(g1); g1.connect(getAnalyser()); src.start(now);
        const o = c.createOscillator(); const g2 = c.createGain();
        o.type = 'triangle';
        o.connect(g2); g2.connect(getAnalyser());
        o.frequency.setValueAtTime(150, now); o.frequency.exponentialRampToValueAtTime(100, now + 0.06);
        g2.gain.setValueAtTime(0.4, now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        o.start(now); o.stop(now + 0.08);
      },
      code: `// Warm deep thud
const ctx = new AudioContext();
const now = ctx.currentTime;
const osc = ctx.createOscillator();
osc.type = 'triangle';
const gain = ctx.createGain();
osc.connect(gain); gain.connect(ctx.destination);
osc.frequency.setValueAtTime(150, now);
osc.frequency.exponentialRampToValueAtTime(100, now + 0.06);
gain.gain.setValueAtTime(0.4, now);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
osc.start(now); osc.stop(now + 0.08);`,
    },
    {
      name: 'Warm Breath',
      desc: 'Deep sigh release',
      technique: 'brown noise, lowpass 400→800Hz, 220ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const buf = createNoiseBuffer(c, 'brown', 0.22);
        const src = c.createBufferSource(); src.buffer = buf;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.setValueAtTime(0.4, now);
        lp.frequency.setValueAtTime(400, now); lp.frequency.exponentialRampToValueAtTime(800, now + 0.18);
        const g = c.createGain(); g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.7, now + 0.06); g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        src.connect(lp); lp.connect(g); g.connect(getAnalyser()); src.start(now);
      },
      code: `// Warm deep sigh
const ctx = new AudioContext();
const now = ctx.currentTime;
const sr = ctx.sampleRate;
const len = sr * 0.22;
const buf = ctx.createBuffer(1, len, sr);
const data = buf.getChannelData(0);
let last = 0;
for (let i = 0; i < len; i++) {
  const w = Math.random() * 2 - 1;
  data[i] = (last + 0.02 * w) / 1.02;
  last = data[i]; data[i] *= 3.5;
}
const src = ctx.createBufferSource(); src.buffer = buf;
const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
lp.frequency.setValueAtTime(400, now);
lp.frequency.exponentialRampToValueAtTime(800, now + 0.18);
const gain = ctx.createGain();
gain.gain.setValueAtTime(0, now);
gain.gain.linearRampToValueAtTime(0.7, now + 0.06);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
src.connect(lp); lp.connect(gain); gain.connect(ctx.destination);
src.start();`,
    },
    {
      name: 'Warm Touch',
      desc: 'Soft fingertip contact',
      technique: 'pink noise, bandpass 800Hz, 12ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const buf = createNoiseBuffer(c, 'pink', 0.012);
        const src = c.createBufferSource(); src.buffer = buf;
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(800, now); bp.Q.setValueAtTime(0.5, now);
        const g = c.createGain(); g.gain.setValueAtTime(0.35, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.012);
        src.connect(bp); bp.connect(g); g.connect(getAnalyser()); src.start(now);
      },
      code: `// Warm soft touch
const ctx = new AudioContext();
const now = ctx.currentTime;
const sr = ctx.sampleRate;
const len = sr * 0.012;
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
const src = ctx.createBufferSource(); src.buffer = buf;
const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
bp.frequency.setValueAtTime(800, now); bp.Q.setValueAtTime(0.5, now);
const gain = ctx.createGain();
gain.gain.setValueAtTime(0.35, now);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);
src.connect(bp); bp.connect(gain); gain.connect(ctx.destination);
src.start();`,
    },
    {
      name: 'Warm Glow',
      desc: 'Soft ascending resolve',
      technique: 'triangle triad [330, 415, 494]Hz, 400ms',
      play: () => {
        const c = getCtx();
        const now = c.currentTime;
        [330, 415, 494].forEach((freq, i) => {
          const o = c.createOscillator();
          o.type = 'triangle';
          const g = c.createGain();
          o.connect(g); g.connect(getAnalyser());
          const t = now + i * 0.1;
          o.frequency.setValueAtTime(freq, t);
          g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(0.2 - i * 0.03, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
          o.start(t);
          o.stop(t + 0.4);
        });
      },
      code: `// Warm triangle glow
const ctx = new AudioContext();
const now = ctx.currentTime;
[330, 415, 494].forEach((freq, i) => {
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  const t = now + i * 0.1;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.2 - i * 0.03, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  osc.start(t); osc.stop(t + 0.4);
});`,
    },
  ],

  'Set: Crisp': [
    {
      name: 'Crisp Click',
      desc: 'Sharp, defined click',
      technique: 'sine 700→580Hz + white noise snap, 12ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const o = c.createOscillator(); const g = c.createGain();
        o.connect(g); g.connect(getAnalyser());
        o.frequency.setValueAtTime(700, now); o.frequency.exponentialRampToValueAtTime(580, now + 0.012);
        g.gain.setValueAtTime(0.35, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
        o.start(now); o.stop(now + 0.018);
        const buf = createNoiseBuffer(c, 'white', 0.004);
        const src = c.createBufferSource(); src.buffer = buf;
        const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.setValueAtTime(6000, now);
        const g2 = c.createGain(); g2.gain.setValueAtTime(0.15, now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.004);
        src.connect(hp); hp.connect(g2); g2.connect(getAnalyser()); src.start(now);
      },
      code: `// Crisp click
const ctx = new AudioContext();
const now = ctx.currentTime;
const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.connect(gain); gain.connect(ctx.destination);
osc.frequency.setValueAtTime(700, now);
osc.frequency.exponentialRampToValueAtTime(580, now + 0.012);
gain.gain.setValueAtTime(0.35, now);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
osc.start(now); osc.stop(now + 0.018);`,
    },
    {
      name: 'Crisp Line',
      desc: 'Wire-thin mark',
      technique: 'sine 800Hz + bandpass shimmer, 8ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const o = c.createOscillator(); const g = c.createGain();
        o.connect(g); g.connect(getAnalyser());
        o.frequency.setValueAtTime(800, now);
        g.gain.setValueAtTime(0.3, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.008);
        o.start(now); o.stop(now + 0.01);
        const buf = createNoiseBuffer(c, 'white', 0.006);
        const src = c.createBufferSource(); src.buffer = buf;
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(4500, now); bp.Q.setValueAtTime(1.5, now);
        const g2 = c.createGain(); g2.gain.setValueAtTime(0.08, now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.006);
        src.connect(bp); bp.connect(g2); g2.connect(getAnalyser()); src.start(now);
      },
      code: `// Crisp thin line
const ctx = new AudioContext();
const now = ctx.currentTime;
const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.connect(gain); gain.connect(ctx.destination);
osc.frequency.setValueAtTime(800, now);
gain.gain.setValueAtTime(0.3, now);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.008);
osc.start(now); osc.stop(now + 0.01);`,
    },
    {
      name: 'Crisp Drop',
      desc: 'Solid textured impact',
      technique: 'white noise (bp 1200Hz) + sine 240→160Hz, 45ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const buf = createNoiseBuffer(c, 'white', 0.02);
        const src = c.createBufferSource(); src.buffer = buf;
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(1200, now); bp.Q.setValueAtTime(0.8, now);
        const g1 = c.createGain(); g1.gain.setValueAtTime(0.8, now); g1.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        src.connect(bp); bp.connect(g1); g1.connect(getAnalyser()); src.start(now);
        const o = c.createOscillator(); const g2 = c.createGain();
        o.connect(g2); g2.connect(getAnalyser());
        o.frequency.setValueAtTime(240, now); o.frequency.exponentialRampToValueAtTime(160, now + 0.035);
        g2.gain.setValueAtTime(0.35, now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
        o.start(now); o.stop(now + 0.05);
      },
      code: `// Crisp textured impact
const ctx = new AudioContext();
const now = ctx.currentTime;
const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.connect(gain); gain.connect(ctx.destination);
osc.frequency.setValueAtTime(240, now);
osc.frequency.exponentialRampToValueAtTime(160, now + 0.035);
gain.gain.setValueAtTime(0.35, now);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
osc.start(now); osc.stop(now + 0.05);`,
    },
    {
      name: 'Crisp Wash',
      desc: 'Bright sweeping clear',
      technique: 'white noise, bandpass 2000→5000Hz, 150ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const buf = createNoiseBuffer(c, 'white', 0.15);
        const src = c.createBufferSource(); src.buffer = buf;
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.setValueAtTime(0.6, now);
        bp.frequency.setValueAtTime(2000, now); bp.frequency.exponentialRampToValueAtTime(5000, now + 0.12);
        const g = c.createGain(); g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.6, now + 0.025); g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        src.connect(bp); bp.connect(g); g.connect(getAnalyser()); src.start(now);
      },
      code: `// Crisp bright wash
const ctx = new AudioContext();
const now = ctx.currentTime;
const sr = ctx.sampleRate;
const buf = ctx.createBuffer(1, sr * 0.15, sr);
const data = buf.getChannelData(0);
for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
const src = ctx.createBufferSource(); src.buffer = buf;
const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
bp.Q.setValueAtTime(0.6, now);
bp.frequency.setValueAtTime(2000, now);
bp.frequency.exponentialRampToValueAtTime(5000, now + 0.12);
const gain = ctx.createGain();
gain.gain.setValueAtTime(0, now);
gain.gain.linearRampToValueAtTime(0.6, now + 0.025);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
src.connect(bp); bp.connect(gain); gain.connect(ctx.destination);
src.start();`,
    },
    {
      name: 'Crisp Pick',
      desc: 'Precise, bright selection',
      technique: 'white noise, bandpass 5500Hz Q2, 6ms',
      play: () => {
        const c = getCtx(); const now = c.currentTime;
        const buf = createNoiseBuffer(c, 'white', 0.006);
        const src = c.createBufferSource(); src.buffer = buf;
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(5500, now); bp.Q.setValueAtTime(2, now);
        const g = c.createGain(); g.gain.setValueAtTime(0.4, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.006);
        src.connect(bp); bp.connect(g); g.connect(getAnalyser()); src.start(now);
      },
      code: `// Crisp precise pick
const ctx = new AudioContext();
const now = ctx.currentTime;
const sr = ctx.sampleRate;
const buf = ctx.createBuffer(1, sr * 0.006, sr);
const data = buf.getChannelData(0);
for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
const src = ctx.createBufferSource(); src.buffer = buf;
const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
bp.frequency.setValueAtTime(5500, now); bp.Q.setValueAtTime(2, now);
const gain = ctx.createGain();
gain.gain.setValueAtTime(0.4, now);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.006);
src.connect(bp); bp.connect(gain); gain.connect(ctx.destination);
src.start();`,
    },
    {
      name: 'Crisp Chime',
      desc: 'Glassy two-note ring',
      technique: 'sine [698, 880]Hz + shimmer, 300ms',
      play: () => {
        const c = getCtx();
        const now = c.currentTime;
        [698, 880].forEach((freq, i) => {
          const o = c.createOscillator();
          const g = c.createGain();
          o.connect(g); g.connect(getAnalyser());
          o.frequency.setValueAtTime(freq, now + i * 0.1);
          g.gain.setValueAtTime(0, now);
          g.gain.setValueAtTime(0.3, now + i * 0.1);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.2);
          o.start(now + i * 0.1);
          o.stop(now + i * 0.1 + 0.22);
        });
        // Shimmer accent
        const buf = createNoiseBuffer(c, 'white', 0.05);
        const src = c.createBufferSource(); src.buffer = buf;
        const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.setValueAtTime(8000, now + 0.1);
        const gs = c.createGain(); gs.gain.setValueAtTime(0, now); gs.gain.setValueAtTime(0.05, now + 0.1);
        gs.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        src.connect(hp); hp.connect(gs); gs.connect(getAnalyser()); src.start(now + 0.1);
      },
      code: `// Crisp glassy chime
const ctx = new AudioContext();
const now = ctx.currentTime;
[698, 880].forEach((freq, i) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.frequency.setValueAtTime(freq, now + i * 0.1);
  gain.gain.setValueAtTime(0, now);
  gain.gain.setValueAtTime(0.3, now + i * 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.2);
  osc.start(now + i * 0.1);
  osc.stop(now + i * 0.1 + 0.22);
});`,
    },
  ],
};

// Per-preset tuning parameters (only for bucket presets)
function formatTunableValue(val: number | string, t: TunableParam): string {
  if ('type' in t && t.type === 'select') return String(val);
  const n = val as number;
  const r = t as TunableRange;
  if (r.unit === 'Hz') return `${Math.round(n)} Hz`;
  if (r.unit === 's') return `${(n * 1000).toFixed(0)} ms`;
  return n.toFixed(2);
}

// Shorthand to pull a number from mixed params
const N = (v: number | string): number => Number(v);
type NoiseType = 'white' | 'pink' | 'brown';

const presetTunables: Record<string, { tunables: TunableParam[]; playTuned: (p: Record<string, number | string>) => void }> = {
  'Dip': {
    tunables: [
      { key: 'wave', label: 'Waveform', type: 'select', options: ['sine', 'triangle', 'square', 'sawtooth'], default: 'sine' },
      { key: 'freqStart', label: 'Freq start', min: 200, max: 1500, step: 10, default: 520, unit: 'Hz' },
      { key: 'freqEnd', label: 'Freq end', min: 100, max: 1500, step: 10, default: 440, unit: 'Hz' },
      { key: 'dur', label: 'Duration', min: 0.005, max: 0.08, step: 0.001, default: 0.02, unit: 's' },
      { key: 'vol', label: 'Volume', min: 0.05, max: 1, step: 0.05, default: 0.4 },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const o = c.createOscillator(); o.type = String(p.wave) as OscillatorType;
      const g = c.createGain();
      o.connect(g); g.connect(getAnalyser());
      o.frequency.setValueAtTime(N(p.freqStart), now);
      o.frequency.exponentialRampToValueAtTime(Math.max(N(p.freqEnd), 1), now + N(p.dur));
      g.gain.setValueAtTime(N(p.vol), now);
      g.gain.exponentialRampToValueAtTime(0.001, now + N(p.dur) + 0.005);
      o.start(now); o.stop(now + N(p.dur) + 0.01);
    },
  },
  'Soft Tap': {
    tunables: [
      { key: 'wave', label: 'Waveform', type: 'select', options: ['sine', 'triangle', 'square', 'sawtooth'], default: 'sine' },
      { key: 'freqStart', label: 'Freq start', min: 200, max: 1500, step: 10, default: 500, unit: 'Hz' },
      { key: 'freqEnd', label: 'Freq end', min: 100, max: 1500, step: 10, default: 350, unit: 'Hz' },
      { key: 'dur', label: 'Duration', min: 0.005, max: 0.08, step: 0.001, default: 0.015, unit: 's' },
      { key: 'vol', label: 'Volume', min: 0.05, max: 1, step: 0.05, default: 0.4 },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const o = c.createOscillator(); o.type = String(p.wave) as OscillatorType;
      const g = c.createGain();
      o.connect(g); g.connect(getAnalyser());
      o.frequency.setValueAtTime(N(p.freqStart), now);
      o.frequency.exponentialRampToValueAtTime(Math.max(N(p.freqEnd), 1), now + N(p.dur));
      g.gain.setValueAtTime(N(p.vol), now);
      g.gain.exponentialRampToValueAtTime(0.001, now + N(p.dur) + 0.005);
      o.start(now); o.stop(now + N(p.dur) + 0.01);
    },
  },
  'Tick': {
    tunables: [
      { key: 'wave', label: 'Waveform', type: 'select', options: ['sine', 'triangle', 'square', 'sawtooth'], default: 'sine' },
      { key: 'freq', label: 'Frequency', min: 200, max: 2000, step: 10, default: 600, unit: 'Hz' },
      { key: 'dur', label: 'Duration', min: 0.003, max: 0.05, step: 0.001, default: 0.012, unit: 's' },
      { key: 'vol', label: 'Volume', min: 0.05, max: 1, step: 0.05, default: 0.4 },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const o = c.createOscillator(); o.type = String(p.wave) as OscillatorType;
      const g = c.createGain();
      o.connect(g); g.connect(getAnalyser());
      o.frequency.setValueAtTime(N(p.freq), now);
      g.gain.setValueAtTime(N(p.vol), now);
      g.gain.exponentialRampToValueAtTime(0.001, now + N(p.dur));
      o.start(now); o.stop(now + N(p.dur) + 0.003);
    },
  },
  'Snap': {
    tunables: [
      { key: 'noise', label: 'Noise', type: 'select', options: ['white', 'pink', 'brown'], default: 'white' },
      { key: 'filterFreq', label: 'Filter freq', min: 1000, max: 8000, step: 100, default: 4000, unit: 'Hz' },
      { key: 'dur', label: 'Duration', min: 0.003, max: 0.03, step: 0.001, default: 0.008, unit: 's' },
      { key: 'vol', label: 'Volume', min: 0.05, max: 1, step: 0.05, default: 0.4 },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const buf = createNoiseBuffer(c, String(p.noise) as NoiseType, N(p.dur));
      const src = c.createBufferSource(); src.buffer = buf;
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.setValueAtTime(N(p.filterFreq), now);
      const g = c.createGain(); g.gain.setValueAtTime(N(p.vol), now); g.gain.exponentialRampToValueAtTime(0.001, now + N(p.dur));
      src.connect(hp); hp.connect(g); g.connect(getAnalyser()); src.start(now);
    },
  },
  'Paper Touch': {
    tunables: [
      { key: 'noise', label: 'Noise', type: 'select', options: ['white', 'pink', 'brown'], default: 'white' },
      { key: 'filter', label: 'Filter', type: 'select', options: ['bandpass', 'highpass', 'lowpass'], default: 'bandpass' },
      { key: 'filterFreq', label: 'Filter freq', min: 500, max: 6000, step: 100, default: 2500, unit: 'Hz' },
      { key: 'filterQ', label: 'Filter Q', min: 0.1, max: 5, step: 0.1, default: 0.7 },
      { key: 'dur', label: 'Duration', min: 0.005, max: 0.06, step: 0.001, default: 0.02, unit: 's' },
      { key: 'vol', label: 'Volume', min: 0.1, max: 2, step: 0.1, default: 1 },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const buf = createNoiseBuffer(c, String(p.noise) as NoiseType, N(p.dur));
      const src = c.createBufferSource(); src.buffer = buf;
      const f = c.createBiquadFilter(); f.type = String(p.filter) as BiquadFilterType;
      f.frequency.setValueAtTime(N(p.filterFreq), now); f.Q.setValueAtTime(N(p.filterQ), now);
      const g = c.createGain(); g.gain.setValueAtTime(N(p.vol), now); g.gain.exponentialRampToValueAtTime(0.001, now + N(p.dur));
      src.connect(f); f.connect(g); g.connect(getAnalyser()); src.start(now);
    },
  },
  'Lift': {
    tunables: [
      { key: 'noise', label: 'Noise', type: 'select', options: ['white', 'pink', 'brown'], default: 'pink' },
      { key: 'freqStart', label: 'Filter start', min: 500, max: 5000, step: 100, default: 1800, unit: 'Hz' },
      { key: 'freqEnd', label: 'Filter end', min: 1000, max: 8000, step: 100, default: 3000, unit: 'Hz' },
      { key: 'filterQ', label: 'Filter Q', min: 0.1, max: 3, step: 0.1, default: 0.5 },
      { key: 'dur', label: 'Duration', min: 0.01, max: 0.1, step: 0.005, default: 0.03, unit: 's' },
      { key: 'vol', label: 'Volume', min: 0.1, max: 2, step: 0.1, default: 1.2 },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const buf = createNoiseBuffer(c, String(p.noise) as NoiseType, N(p.dur));
      const src = c.createBufferSource(); src.buffer = buf;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass';
      bp.frequency.setValueAtTime(N(p.freqStart), now);
      bp.frequency.exponentialRampToValueAtTime(Math.max(N(p.freqEnd), 1), now + N(p.dur));
      bp.Q.setValueAtTime(N(p.filterQ), now);
      const g = c.createGain(); g.gain.setValueAtTime(N(p.vol), now); g.gain.exponentialRampToValueAtTime(0.001, now + N(p.dur));
      src.connect(bp); bp.connect(g); g.connect(getAnalyser()); src.start(now);
    },
  },
  'Exhale': {
    tunables: [
      { key: 'noise', label: 'Noise', type: 'select', options: ['white', 'pink', 'brown'], default: 'pink' },
      { key: 'freqStart', label: 'Filter start', min: 200, max: 2000, step: 50, default: 600, unit: 'Hz' },
      { key: 'freqEnd', label: 'Filter end', min: 500, max: 4000, step: 50, default: 1400, unit: 'Hz' },
      { key: 'filterQ', label: 'Filter Q', min: 0.1, max: 3, step: 0.1, default: 0.5 },
      { key: 'dur', label: 'Duration', min: 0.05, max: 0.5, step: 0.01, default: 0.18, unit: 's' },
      { key: 'attack', label: 'Attack', min: 0.01, max: 0.1, step: 0.005, default: 0.04, unit: 's' },
      { key: 'vol', label: 'Volume', min: 0.1, max: 2, step: 0.1, default: 0.8 },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const buf = createNoiseBuffer(c, String(p.noise) as NoiseType, N(p.dur));
      const src = c.createBufferSource(); src.buffer = buf;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.setValueAtTime(N(p.filterQ), now);
      bp.frequency.setValueAtTime(N(p.freqStart), now);
      bp.frequency.exponentialRampToValueAtTime(Math.max(N(p.freqEnd), 1), now + N(p.dur) * 0.83);
      const g = c.createGain(); g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(N(p.vol), now + N(p.attack));
      g.gain.exponentialRampToValueAtTime(0.001, now + N(p.dur));
      src.connect(bp); bp.connect(g); g.connect(getAnalyser()); src.start(now);
    },
  },
  'Breath': {
    tunables: [
      { key: 'noise', label: 'Noise', type: 'select', options: ['white', 'pink', 'brown'], default: 'pink' },
      { key: 'freqStart', label: 'Filter start', min: 200, max: 1500, step: 50, default: 500, unit: 'Hz' },
      { key: 'freqPeak', label: 'Filter peak', min: 400, max: 2000, step: 50, default: 900, unit: 'Hz' },
      { key: 'freqEnd', label: 'Filter end', min: 100, max: 1000, step: 50, default: 400, unit: 'Hz' },
      { key: 'filterQ', label: 'Filter Q', min: 0.1, max: 3, step: 0.1, default: 0.3 },
      { key: 'dur', label: 'Duration', min: 0.1, max: 0.6, step: 0.01, default: 0.25, unit: 's' },
      { key: 'attack', label: 'Attack', min: 0.02, max: 0.15, step: 0.005, default: 0.08, unit: 's' },
      { key: 'vol', label: 'Volume', min: 0.1, max: 2, step: 0.1, default: 0.8 },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const buf = createNoiseBuffer(c, String(p.noise) as NoiseType, N(p.dur));
      const src = c.createBufferSource(); src.buffer = buf;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.setValueAtTime(N(p.filterQ), now);
      bp.frequency.setValueAtTime(N(p.freqStart), now);
      bp.frequency.linearRampToValueAtTime(N(p.freqPeak), now + N(p.dur) * 0.4);
      bp.frequency.linearRampToValueAtTime(Math.max(N(p.freqEnd), 1), now + N(p.dur));
      const g = c.createGain(); g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(N(p.vol), now + N(p.attack));
      g.gain.exponentialRampToValueAtTime(0.001, now + N(p.dur));
      src.connect(bp); bp.connect(g); g.connect(getAnalyser()); src.start(now);
    },
  },
  'Land': {
    tunables: [
      { key: 'noise', label: 'Noise', type: 'select', options: ['white', 'pink', 'brown'], default: 'brown' },
      { key: 'wave', label: 'Waveform', type: 'select', options: ['sine', 'triangle', 'square'], default: 'sine' },
      { key: 'noiseFreq', label: 'Thump cutoff', min: 200, max: 1500, step: 50, default: 600, unit: 'Hz' },
      { key: 'noiseVol', label: 'Thump vol', min: 0.1, max: 2, step: 0.1, default: 1 },
      { key: 'noiseDur', label: 'Thump dur', min: 0.01, max: 0.06, step: 0.005, default: 0.025, unit: 's' },
      { key: 'sineStart', label: 'Sine start', min: 80, max: 500, step: 10, default: 200, unit: 'Hz' },
      { key: 'sineEnd', label: 'Sine end', min: 60, max: 400, step: 10, default: 140, unit: 'Hz' },
      { key: 'sineVol', label: 'Sine vol', min: 0.05, max: 1, step: 0.05, default: 0.4 },
      { key: 'sineDur', label: 'Sine dur', min: 0.02, max: 0.1, step: 0.005, default: 0.04, unit: 's' },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const buf = createNoiseBuffer(c, String(p.noise) as NoiseType, N(p.noiseDur));
      const src = c.createBufferSource(); src.buffer = buf;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(N(p.noiseFreq), now);
      const g1 = c.createGain(); g1.gain.setValueAtTime(N(p.noiseVol), now); g1.gain.exponentialRampToValueAtTime(0.001, now + N(p.noiseDur));
      src.connect(lp); lp.connect(g1); g1.connect(getAnalyser()); src.start(now);
      const o = c.createOscillator(); o.type = String(p.wave) as OscillatorType;
      const g2 = c.createGain();
      o.connect(g2); g2.connect(getAnalyser());
      o.frequency.setValueAtTime(N(p.sineStart), now);
      o.frequency.exponentialRampToValueAtTime(Math.max(N(p.sineEnd), 1), now + N(p.sineDur));
      g2.gain.setValueAtTime(N(p.sineVol), now);
      g2.gain.exponentialRampToValueAtTime(0.001, now + N(p.sineDur) + 0.01);
      o.start(now); o.stop(now + N(p.sineDur) + 0.02);
    },
  },
  'Success': {
    tunables: [
      { key: 'wave', label: 'Waveform', type: 'select', options: ['sine', 'triangle', 'square', 'sawtooth'], default: 'sine' },
      { key: 'freq1', label: 'Tone 1', min: 200, max: 1500, step: 10, default: 523, unit: 'Hz' },
      { key: 'freq2', label: 'Tone 2', min: 200, max: 1500, step: 10, default: 659, unit: 'Hz' },
      { key: 'gap', label: 'Gap', min: 0.04, max: 0.3, step: 0.01, default: 0.12, unit: 's' },
      { key: 'vol', label: 'Volume', min: 0.05, max: 1, step: 0.05, default: 0.4 },
      { key: 'decay', label: 'Decay', min: 0.05, max: 0.4, step: 0.01, default: 0.15, unit: 's' },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const gap = N(p.gap); const vol = N(p.vol); const dec = N(p.decay);
      [N(p.freq1), N(p.freq2)].forEach((freq, i) => {
        const o = c.createOscillator(); o.type = String(p.wave) as OscillatorType;
        const g = c.createGain();
        o.connect(g); g.connect(getAnalyser());
        o.frequency.setValueAtTime(freq, now + i * gap);
        g.gain.setValueAtTime(0, now);
        g.gain.setValueAtTime(vol, now + i * gap);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * gap + dec);
        o.start(now + i * gap); o.stop(now + i * gap + dec + 0.01);
      });
    },
  },
  'Bloom': {
    tunables: [
      { key: 'wave', label: 'Waveform', type: 'select', options: ['sine', 'triangle', 'square', 'sawtooth'], default: 'triangle' },
      { key: 'freq1', label: 'Note 1', min: 200, max: 1500, step: 10, default: 523, unit: 'Hz' },
      { key: 'freq2', label: 'Note 2', min: 200, max: 1500, step: 10, default: 659, unit: 'Hz' },
      { key: 'freq3', label: 'Note 3', min: 200, max: 1500, step: 10, default: 784, unit: 'Hz' },
      { key: 'gap', label: 'Gap', min: 0.03, max: 0.2, step: 0.01, default: 0.09, unit: 's' },
      { key: 'vol', label: 'Volume', min: 0.05, max: 0.5, step: 0.01, default: 0.25 },
      { key: 'decay', label: 'Decay', min: 0.1, max: 0.6, step: 0.01, default: 0.3, unit: 's' },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const gap = N(p.gap); const vol = N(p.vol); const dec = N(p.decay);
      [N(p.freq1), N(p.freq2), N(p.freq3)].forEach((freq, i) => {
        const o = c.createOscillator(); o.type = String(p.wave) as OscillatorType;
        const g = c.createGain();
        o.connect(g); g.connect(getAnalyser());
        const t = now + i * gap;
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(Math.max(0.01, vol - i * (vol * 0.16)), t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dec);
        o.start(t); o.stop(t + dec + 0.05);
      });
    },
  },
  'Sparkle': {
    tunables: [
      { key: 'wave', label: 'Waveform', type: 'select', options: ['sine', 'triangle', 'square', 'sawtooth'], default: 'sine' },
      { key: 'freq1', label: 'Note 1', min: 1000, max: 4000, step: 50, default: 2093, unit: 'Hz' },
      { key: 'freq2', label: 'Note 2', min: 800, max: 3000, step: 50, default: 1568, unit: 'Hz' },
      { key: 'freq3', label: 'Note 3', min: 600, max: 2500, step: 50, default: 1318, unit: 'Hz' },
      { key: 'freq4', label: 'Note 4', min: 400, max: 2000, step: 50, default: 1047, unit: 'Hz' },
      { key: 'gap', label: 'Gap', min: 0.02, max: 0.15, step: 0.01, default: 0.06, unit: 's' },
      { key: 'vol', label: 'Volume', min: 0.02, max: 0.3, step: 0.01, default: 0.12 },
      { key: 'decay', label: 'Decay', min: 0.05, max: 0.4, step: 0.01, default: 0.18, unit: 's' },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const gap = N(p.gap); const vol = N(p.vol); const dec = N(p.decay);
      [N(p.freq1), N(p.freq2), N(p.freq3), N(p.freq4)].forEach((freq, i) => {
        const o = c.createOscillator(); o.type = String(p.wave) as OscillatorType;
        const g = c.createGain();
        o.connect(g); g.connect(getAnalyser());
        const t = now + i * gap;
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dec);
        o.start(t); o.stop(t + dec + 0.02);
      });
    },
  },
  'Sparkle Rising': {
    tunables: [
      { key: 'wave', label: 'Waveform', type: 'select', options: ['sine', 'triangle', 'square', 'sawtooth'], default: 'sine' },
      { key: 'freq1', label: 'Note 1', min: 400, max: 2000, step: 50, default: 1047, unit: 'Hz' },
      { key: 'freq2', label: 'Note 2', min: 600, max: 2500, step: 50, default: 1318, unit: 'Hz' },
      { key: 'freq3', label: 'Note 3', min: 800, max: 3000, step: 50, default: 1568, unit: 'Hz' },
      { key: 'freq4', label: 'Note 4', min: 1000, max: 4000, step: 50, default: 2093, unit: 'Hz' },
      { key: 'gap', label: 'Gap', min: 0.02, max: 0.15, step: 0.01, default: 0.06, unit: 's' },
      { key: 'vol', label: 'Volume', min: 0.02, max: 0.3, step: 0.01, default: 0.1 },
      { key: 'decay', label: 'Decay', min: 0.05, max: 0.4, step: 0.01, default: 0.18, unit: 's' },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const gap = N(p.gap); const vol = N(p.vol); const dec = N(p.decay);
      [N(p.freq1), N(p.freq2), N(p.freq3), N(p.freq4)].forEach((freq, i) => {
        const o = c.createOscillator(); o.type = String(p.wave) as OscillatorType;
        const g = c.createGain();
        o.connect(g); g.connect(getAnalyser());
        const t = now + i * gap;
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(vol + i * (vol * 0.2), t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dec);
        o.start(t); o.stop(t + dec + 0.02);
      });
    },
  },
  'Sparkle Slow': {
    tunables: [
      { key: 'wave', label: 'Waveform', type: 'select', options: ['sine', 'triangle', 'square', 'sawtooth'], default: 'sine' },
      { key: 'freq1', label: 'Note 1', min: 1000, max: 4000, step: 50, default: 2093, unit: 'Hz' },
      { key: 'freq2', label: 'Note 2', min: 800, max: 3000, step: 50, default: 1568, unit: 'Hz' },
      { key: 'freq3', label: 'Note 3', min: 600, max: 2500, step: 50, default: 1318, unit: 'Hz' },
      { key: 'freq4', label: 'Note 4', min: 400, max: 2000, step: 50, default: 1047, unit: 'Hz' },
      { key: 'gap', label: 'Gap', min: 0.04, max: 0.25, step: 0.01, default: 0.12, unit: 's' },
      { key: 'vol', label: 'Volume', min: 0.02, max: 0.3, step: 0.01, default: 0.1 },
      { key: 'decay', label: 'Decay', min: 0.1, max: 0.6, step: 0.01, default: 0.35, unit: 's' },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const gap = N(p.gap); const vol = N(p.vol); const dec = N(p.decay);
      [N(p.freq1), N(p.freq2), N(p.freq3), N(p.freq4)].forEach((freq, i) => {
        const o = c.createOscillator(); o.type = String(p.wave) as OscillatorType;
        const g = c.createGain();
        o.connect(g); g.connect(getAnalyser());
        const t = now + i * gap;
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dec);
        o.start(t); o.stop(t + dec + 0.02);
      });
    },
  },
  'Sparkle Glass': {
    tunables: [
      { key: 'wave', label: 'Waveform', type: 'select', options: ['triangle', 'sine', 'square', 'sawtooth'], default: 'triangle' },
      { key: 'freq1', label: 'Note 1', min: 1000, max: 5000, step: 50, default: 2637, unit: 'Hz' },
      { key: 'freq2', label: 'Note 2', min: 1000, max: 4000, step: 50, default: 2093, unit: 'Hz' },
      { key: 'freq3', label: 'Note 3', min: 800, max: 3500, step: 50, default: 1760, unit: 'Hz' },
      { key: 'freq4', label: 'Note 4', min: 600, max: 3000, step: 50, default: 1397, unit: 'Hz' },
      { key: 'gap', label: 'Gap', min: 0.02, max: 0.12, step: 0.005, default: 0.045, unit: 's' },
      { key: 'vol', label: 'Volume', min: 0.02, max: 0.3, step: 0.01, default: 0.14 },
      { key: 'decay', label: 'Decay', min: 0.05, max: 0.3, step: 0.01, default: 0.14, unit: 's' },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const gap = N(p.gap); const vol = N(p.vol); const dec = N(p.decay);
      [N(p.freq1), N(p.freq2), N(p.freq3), N(p.freq4)].forEach((freq, i) => {
        const o = c.createOscillator(); o.type = String(p.wave) as OscillatorType;
        const g = c.createGain();
        o.connect(g); g.connect(getAnalyser());
        const t = now + i * gap;
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dec);
        o.start(t); o.stop(t + dec + 0.02);
      });
    },
  },

  // --- New textured variations ---

  'Dip Warm': {
    tunables: [
      { key: 'wave', label: 'Waveform', type: 'select', options: ['triangle', 'sine', 'square', 'sawtooth'], default: 'triangle' },
      { key: 'freqStart', label: 'Freq start', min: 300, max: 700, step: 10, default: 440, unit: 'Hz' },
      { key: 'freqEnd', label: 'Freq end', min: 200, max: 600, step: 10, default: 340, unit: 'Hz' },
      { key: 'dur', label: 'Duration', min: 0.01, max: 0.06, step: 0.002, default: 0.025, unit: 's' },
      { key: 'noise', label: 'Noise type', type: 'select', options: ['brown', 'pink', 'white'], default: 'brown' },
      { key: 'noiseMix', label: 'Noise mix', min: 0.05, max: 0.4, step: 0.02, default: 0.15 },
      { key: 'vol', label: 'Volume', min: 0.1, max: 0.6, step: 0.02, default: 0.35 },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const o = c.createOscillator(); const g = c.createGain();
      o.type = String(p.wave) as OscillatorType;
      o.connect(g); g.connect(getAnalyser());
      o.frequency.setValueAtTime(N(p.freqStart), now); o.frequency.exponentialRampToValueAtTime(Math.max(N(p.freqEnd), 20), now + N(p.dur));
      g.gain.setValueAtTime(N(p.vol), now); g.gain.exponentialRampToValueAtTime(0.001, now + N(p.dur) + 0.005);
      o.start(now); o.stop(now + N(p.dur) + 0.01);
      const buf = createNoiseBuffer(c, String(p.noise) as NoiseType, 0.02);
      const src = c.createBufferSource(); src.buffer = buf;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(1200, now);
      const g2 = c.createGain(); g2.gain.setValueAtTime(N(p.noiseMix), now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
      src.connect(lp); lp.connect(g2); g2.connect(getAnalyser()); src.start(now);
    },
  },

  'Tick Airy': {
    tunables: [
      { key: 'wave', label: 'Waveform', type: 'select', options: ['triangle', 'sine', 'square', 'sawtooth'], default: 'triangle' },
      { key: 'freq', label: 'Frequency', min: 300, max: 800, step: 10, default: 480, unit: 'Hz' },
      { key: 'dur', label: 'Duration', min: 0.005, max: 0.03, step: 0.002, default: 0.015, unit: 's' },
      { key: 'noise', label: 'Noise type', type: 'select', options: ['pink', 'white', 'brown'], default: 'pink' },
      { key: 'noiseMix', label: 'Noise mix', min: 0.03, max: 0.3, step: 0.02, default: 0.12 },
      { key: 'vol', label: 'Volume', min: 0.1, max: 0.5, step: 0.02, default: 0.25 },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const o = c.createOscillator(); const g = c.createGain();
      o.type = String(p.wave) as OscillatorType;
      o.connect(g); g.connect(getAnalyser());
      o.frequency.setValueAtTime(N(p.freq), now);
      g.gain.setValueAtTime(N(p.vol), now); g.gain.exponentialRampToValueAtTime(0.001, now + N(p.dur));
      o.start(now); o.stop(now + N(p.dur) + 0.005);
      const buf = createNoiseBuffer(c, String(p.noise) as NoiseType, 0.012);
      const src = c.createBufferSource(); src.buffer = buf;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(2200, now); bp.Q.setValueAtTime(0.6, now);
      const g2 = c.createGain(); g2.gain.setValueAtTime(N(p.noiseMix), now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.012);
      src.connect(bp); bp.connect(g2); g2.connect(getAnalyser()); src.start(now);
    },
  },

  'Tick Sharp': {
    tunables: [
      { key: 'freqStart', label: 'Freq start', min: 500, max: 1200, step: 10, default: 720, unit: 'Hz' },
      { key: 'freqEnd', label: 'Freq end', min: 300, max: 900, step: 10, default: 600, unit: 'Hz' },
      { key: 'dur', label: 'Duration', min: 0.003, max: 0.02, step: 0.001, default: 0.008, unit: 's' },
      { key: 'noise', label: 'Noise type', type: 'select', options: ['white', 'pink', 'brown'], default: 'white' },
      { key: 'noiseMix', label: 'Noise mix', min: 0.03, max: 0.25, step: 0.01, default: 0.1 },
      { key: 'vol', label: 'Volume', min: 0.1, max: 0.6, step: 0.02, default: 0.35 },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const o = c.createOscillator(); const g = c.createGain();
      o.connect(g); g.connect(getAnalyser());
      o.frequency.setValueAtTime(N(p.freqStart), now); o.frequency.exponentialRampToValueAtTime(Math.max(N(p.freqEnd), 20), now + N(p.dur));
      g.gain.setValueAtTime(N(p.vol), now); g.gain.exponentialRampToValueAtTime(0.001, now + N(p.dur) + 0.002);
      o.start(now); o.stop(now + N(p.dur) + 0.004);
      const buf = createNoiseBuffer(c, String(p.noise) as NoiseType, 0.005);
      const src = c.createBufferSource(); src.buffer = buf;
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.setValueAtTime(5000, now);
      const g2 = c.createGain(); g2.gain.setValueAtTime(N(p.noiseMix), now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.005);
      src.connect(hp); hp.connect(g2); g2.connect(getAnalyser()); src.start(now);
    },
  },
  'Tick Sharp Low': {
    tunables: [
      { key: 'freqStart', label: 'Freq start', min: 300, max: 800, step: 10, default: 504, unit: 'Hz' },
      { key: 'freqEnd', label: 'Freq end', min: 200, max: 600, step: 10, default: 420, unit: 'Hz' },
      { key: 'dur', label: 'Duration', min: 0.004, max: 0.025, step: 0.001, default: 0.01, unit: 's' },
      { key: 'noise', label: 'Noise type', type: 'select', options: ['white', 'pink', 'brown'], default: 'white' },
      { key: 'noiseMix', label: 'Noise mix', min: 0.03, max: 0.25, step: 0.01, default: 0.1 },
      { key: 'vol', label: 'Volume', min: 0.1, max: 0.6, step: 0.02, default: 0.35 },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const o = c.createOscillator(); const g = c.createGain();
      o.connect(g); g.connect(getAnalyser());
      o.frequency.setValueAtTime(N(p.freqStart), now); o.frequency.exponentialRampToValueAtTime(Math.max(N(p.freqEnd), 20), now + N(p.dur));
      g.gain.setValueAtTime(N(p.vol), now); g.gain.exponentialRampToValueAtTime(0.001, now + N(p.dur) + 0.002);
      o.start(now); o.stop(now + N(p.dur) + 0.004);
      const buf = createNoiseBuffer(c, String(p.noise) as NoiseType, 0.006);
      const src = c.createBufferSource(); src.buffer = buf;
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.setValueAtTime(3500, now);
      const g2 = c.createGain(); g2.gain.setValueAtTime(N(p.noiseMix), now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.006);
      src.connect(hp); hp.connect(g2); g2.connect(getAnalyser()); src.start(now);
    },
  },
  'Tick Sharp High': {
    tunables: [
      { key: 'freqStart', label: 'Freq start', min: 600, max: 1500, step: 10, default: 936, unit: 'Hz' },
      { key: 'freqEnd', label: 'Freq end', min: 400, max: 1200, step: 10, default: 780, unit: 'Hz' },
      { key: 'dur', label: 'Duration', min: 0.002, max: 0.015, step: 0.001, default: 0.006, unit: 's' },
      { key: 'noise', label: 'Noise type', type: 'select', options: ['white', 'pink', 'brown'], default: 'white' },
      { key: 'noiseMix', label: 'Noise mix', min: 0.03, max: 0.25, step: 0.01, default: 0.1 },
      { key: 'vol', label: 'Volume', min: 0.1, max: 0.6, step: 0.02, default: 0.35 },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const o = c.createOscillator(); const g = c.createGain();
      o.connect(g); g.connect(getAnalyser());
      o.frequency.setValueAtTime(N(p.freqStart), now); o.frequency.exponentialRampToValueAtTime(Math.max(N(p.freqEnd), 20), now + N(p.dur));
      g.gain.setValueAtTime(N(p.vol), now); g.gain.exponentialRampToValueAtTime(0.001, now + N(p.dur) + 0.002);
      o.start(now); o.stop(now + N(p.dur) + 0.004);
      const buf = createNoiseBuffer(c, String(p.noise) as NoiseType, 0.004);
      const src = c.createBufferSource(); src.buffer = buf;
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.setValueAtTime(6500, now);
      const g2 = c.createGain(); g2.gain.setValueAtTime(N(p.noiseMix), now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.004);
      src.connect(hp); hp.connect(g2); g2.connect(getAnalyser()); src.start(now);
    },
  },

  'Land Heavy': {
    tunables: [
      { key: 'wave', label: 'Waveform', type: 'select', options: ['triangle', 'sine', 'square', 'sawtooth'], default: 'triangle' },
      { key: 'noise', label: 'Noise type', type: 'select', options: ['brown', 'pink', 'white'], default: 'brown' },
      { key: 'freqStart', label: 'Freq start', min: 80, max: 300, step: 5, default: 160, unit: 'Hz' },
      { key: 'freqEnd', label: 'Freq end', min: 50, max: 200, step: 5, default: 100, unit: 'Hz' },
      { key: 'thumpVol', label: 'Thump vol', min: 0.3, max: 2.0, step: 0.1, default: 1.2 },
      { key: 'toneVol', label: 'Tone vol', min: 0.1, max: 0.8, step: 0.05, default: 0.45 },
      { key: 'dur', label: 'Duration', min: 0.03, max: 0.1, step: 0.005, default: 0.06, unit: 's' },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const buf = createNoiseBuffer(c, String(p.noise) as NoiseType, 0.035);
      const src = c.createBufferSource(); src.buffer = buf;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(400, now);
      const g1 = c.createGain(); g1.gain.setValueAtTime(N(p.thumpVol), now); g1.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      src.connect(lp); lp.connect(g1); g1.connect(getAnalyser()); src.start(now);
      const o = c.createOscillator(); const g2 = c.createGain();
      o.type = String(p.wave) as OscillatorType;
      o.connect(g2); g2.connect(getAnalyser());
      o.frequency.setValueAtTime(N(p.freqStart), now); o.frequency.exponentialRampToValueAtTime(Math.max(N(p.freqEnd), 20), now + N(p.dur) - 0.01);
      g2.gain.setValueAtTime(N(p.toneVol), now); g2.gain.exponentialRampToValueAtTime(0.001, now + N(p.dur));
      o.start(now); o.stop(now + N(p.dur) + 0.01);
    },
  },

  'Land Cushion': {
    tunables: [
      { key: 'noise', label: 'Noise type', type: 'select', options: ['pink', 'brown', 'white'], default: 'pink' },
      { key: 'freqStart', label: 'Freq start', min: 120, max: 400, step: 10, default: 240, unit: 'Hz' },
      { key: 'freqEnd', label: 'Freq end', min: 80, max: 300, step: 10, default: 170, unit: 'Hz' },
      { key: 'cushionVol', label: 'Cushion vol', min: 0.1, max: 1.0, step: 0.05, default: 0.5 },
      { key: 'toneVol', label: 'Tone vol', min: 0.1, max: 0.6, step: 0.05, default: 0.3 },
      { key: 'dur', label: 'Duration', min: 0.02, max: 0.08, step: 0.005, default: 0.045, unit: 's' },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const buf = createNoiseBuffer(c, String(p.noise) as NoiseType, 0.03);
      const src = c.createBufferSource(); src.buffer = buf;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(600, now); bp.Q.setValueAtTime(0.4, now);
      const g1 = c.createGain(); g1.gain.setValueAtTime(N(p.cushionVol), now); g1.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      src.connect(bp); bp.connect(g1); g1.connect(getAnalyser()); src.start(now);
      const o = c.createOscillator(); const g2 = c.createGain();
      o.connect(g2); g2.connect(getAnalyser());
      o.frequency.setValueAtTime(N(p.freqStart), now); o.frequency.exponentialRampToValueAtTime(Math.max(N(p.freqEnd), 20), now + N(p.dur) - 0.01);
      g2.gain.setValueAtTime(N(p.toneVol), now); g2.gain.exponentialRampToValueAtTime(0.001, now + N(p.dur));
      o.start(now); o.stop(now + N(p.dur) + 0.005);
    },
  },

  'Exhale Tight': {
    tunables: [
      { key: 'noise', label: 'Noise type', type: 'select', options: ['brown', 'pink', 'white'], default: 'brown' },
      { key: 'filterStart', label: 'Filter start', min: 400, max: 2500, step: 50, default: 1200, unit: 'Hz' },
      { key: 'filterEnd', label: 'Filter end', min: 100, max: 800, step: 25, default: 300, unit: 'Hz' },
      { key: 'dur', label: 'Duration', min: 0.06, max: 0.25, step: 0.01, default: 0.12, unit: 's' },
      { key: 'vol', label: 'Volume', min: 0.2, max: 1.2, step: 0.05, default: 0.7 },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const dur = N(p.dur);
      const buf = createNoiseBuffer(c, String(p.noise) as NoiseType, dur);
      const src = c.createBufferSource(); src.buffer = buf;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.setValueAtTime(0.5, now);
      lp.frequency.setValueAtTime(N(p.filterStart), now); lp.frequency.exponentialRampToValueAtTime(Math.max(N(p.filterEnd), 20), now + dur * 0.85);
      const g = c.createGain(); g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(N(p.vol), now + 0.02); g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      src.connect(lp); lp.connect(g); g.connect(getAnalyser()); src.start(now);
    },
  },

  // --- Pitch variants (Low/High share parent's playTuned shape with shifted defaults) ---

  'Dip Low': {
    tunables: [
      { key: 'wave', label: 'Waveform', type: 'select', options: ['sine', 'triangle', 'square', 'sawtooth'], default: 'sine' },
      { key: 'freqStart', label: 'Freq start', min: 200, max: 1500, step: 10, default: 364, unit: 'Hz' },
      { key: 'freqEnd', label: 'Freq end', min: 100, max: 1500, step: 10, default: 308, unit: 'Hz' },
      { key: 'dur', label: 'Duration', min: 0.005, max: 0.08, step: 0.001, default: 0.02, unit: 's' },
      { key: 'vol', label: 'Volume', min: 0.05, max: 1, step: 0.05, default: 0.4 },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const o = c.createOscillator(); o.type = String(p.wave) as OscillatorType;
      const g = c.createGain();
      o.connect(g); g.connect(getAnalyser());
      o.frequency.setValueAtTime(N(p.freqStart), now);
      o.frequency.exponentialRampToValueAtTime(Math.max(N(p.freqEnd), 1), now + N(p.dur));
      g.gain.setValueAtTime(N(p.vol), now);
      g.gain.exponentialRampToValueAtTime(0.001, now + N(p.dur) + 0.005);
      o.start(now); o.stop(now + N(p.dur) + 0.01);
    },
  },
  'Dip High': {
    tunables: [
      { key: 'wave', label: 'Waveform', type: 'select', options: ['sine', 'triangle', 'square', 'sawtooth'], default: 'sine' },
      { key: 'freqStart', label: 'Freq start', min: 200, max: 1500, step: 10, default: 676, unit: 'Hz' },
      { key: 'freqEnd', label: 'Freq end', min: 100, max: 1500, step: 10, default: 572, unit: 'Hz' },
      { key: 'dur', label: 'Duration', min: 0.005, max: 0.08, step: 0.001, default: 0.02, unit: 's' },
      { key: 'vol', label: 'Volume', min: 0.05, max: 1, step: 0.05, default: 0.4 },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const o = c.createOscillator(); o.type = String(p.wave) as OscillatorType;
      const g = c.createGain();
      o.connect(g); g.connect(getAnalyser());
      o.frequency.setValueAtTime(N(p.freqStart), now);
      o.frequency.exponentialRampToValueAtTime(Math.max(N(p.freqEnd), 1), now + N(p.dur));
      g.gain.setValueAtTime(N(p.vol), now);
      g.gain.exponentialRampToValueAtTime(0.001, now + N(p.dur) + 0.005);
      o.start(now); o.stop(now + N(p.dur) + 0.01);
    },
  },
  'Tick Low': {
    tunables: [
      { key: 'wave', label: 'Waveform', type: 'select', options: ['sine', 'triangle', 'square', 'sawtooth'], default: 'sine' },
      { key: 'freq', label: 'Frequency', min: 200, max: 2000, step: 10, default: 420, unit: 'Hz' },
      { key: 'dur', label: 'Duration', min: 0.003, max: 0.05, step: 0.001, default: 0.012, unit: 's' },
      { key: 'vol', label: 'Volume', min: 0.05, max: 1, step: 0.05, default: 0.4 },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const o = c.createOscillator(); o.type = String(p.wave) as OscillatorType;
      const g = c.createGain();
      o.connect(g); g.connect(getAnalyser());
      o.frequency.setValueAtTime(N(p.freq), now);
      g.gain.setValueAtTime(N(p.vol), now);
      g.gain.exponentialRampToValueAtTime(0.001, now + N(p.dur));
      o.start(now); o.stop(now + N(p.dur) + 0.003);
    },
  },
  'Tick High': {
    tunables: [
      { key: 'wave', label: 'Waveform', type: 'select', options: ['sine', 'triangle', 'square', 'sawtooth'], default: 'sine' },
      { key: 'freq', label: 'Frequency', min: 200, max: 2000, step: 10, default: 780, unit: 'Hz' },
      { key: 'dur', label: 'Duration', min: 0.003, max: 0.05, step: 0.001, default: 0.012, unit: 's' },
      { key: 'vol', label: 'Volume', min: 0.05, max: 1, step: 0.05, default: 0.4 },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const o = c.createOscillator(); o.type = String(p.wave) as OscillatorType;
      const g = c.createGain();
      o.connect(g); g.connect(getAnalyser());
      o.frequency.setValueAtTime(N(p.freq), now);
      g.gain.setValueAtTime(N(p.vol), now);
      g.gain.exponentialRampToValueAtTime(0.001, now + N(p.dur));
      o.start(now); o.stop(now + N(p.dur) + 0.003);
    },
  },
  'Snap Low': {
    tunables: [
      { key: 'noise', label: 'Noise', type: 'select', options: ['white', 'pink', 'brown'], default: 'white' },
      { key: 'filterFreq', label: 'Filter freq', min: 1000, max: 8000, step: 100, default: 2800, unit: 'Hz' },
      { key: 'dur', label: 'Duration', min: 0.003, max: 0.03, step: 0.001, default: 0.01, unit: 's' },
      { key: 'vol', label: 'Volume', min: 0.05, max: 1, step: 0.05, default: 0.4 },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const buf = createNoiseBuffer(c, String(p.noise) as NoiseType, N(p.dur));
      const src = c.createBufferSource(); src.buffer = buf;
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.setValueAtTime(N(p.filterFreq), now);
      const g = c.createGain(); g.gain.setValueAtTime(N(p.vol), now); g.gain.exponentialRampToValueAtTime(0.001, now + N(p.dur));
      src.connect(hp); hp.connect(g); g.connect(getAnalyser()); src.start(now);
    },
  },
  'Snap High': {
    tunables: [
      { key: 'noise', label: 'Noise', type: 'select', options: ['white', 'pink', 'brown'], default: 'white' },
      { key: 'filterFreq', label: 'Filter freq', min: 1000, max: 8000, step: 100, default: 5200, unit: 'Hz' },
      { key: 'dur', label: 'Duration', min: 0.003, max: 0.03, step: 0.001, default: 0.006, unit: 's' },
      { key: 'vol', label: 'Volume', min: 0.05, max: 1, step: 0.05, default: 0.4 },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const buf = createNoiseBuffer(c, String(p.noise) as NoiseType, N(p.dur));
      const src = c.createBufferSource(); src.buffer = buf;
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.setValueAtTime(N(p.filterFreq), now);
      const g = c.createGain(); g.gain.setValueAtTime(N(p.vol), now); g.gain.exponentialRampToValueAtTime(0.001, now + N(p.dur));
      src.connect(hp); hp.connect(g); g.connect(getAnalyser()); src.start(now);
    },
  },
  'Land Low': {
    tunables: [
      { key: 'noise', label: 'Noise', type: 'select', options: ['white', 'pink', 'brown'], default: 'brown' },
      { key: 'wave', label: 'Waveform', type: 'select', options: ['sine', 'triangle', 'square'], default: 'sine' },
      { key: 'noiseFreq', label: 'Thump cutoff', min: 200, max: 1500, step: 50, default: 420, unit: 'Hz' },
      { key: 'noiseVol', label: 'Thump vol', min: 0.1, max: 2, step: 0.1, default: 1 },
      { key: 'noiseDur', label: 'Thump dur', min: 0.01, max: 0.06, step: 0.005, default: 0.03, unit: 's' },
      { key: 'sineStart', label: 'Sine start', min: 80, max: 500, step: 10, default: 140, unit: 'Hz' },
      { key: 'sineEnd', label: 'Sine end', min: 60, max: 400, step: 10, default: 98, unit: 'Hz' },
      { key: 'sineVol', label: 'Sine vol', min: 0.05, max: 1, step: 0.05, default: 0.4 },
      { key: 'sineDur', label: 'Sine dur', min: 0.02, max: 0.1, step: 0.005, default: 0.05, unit: 's' },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const buf = createNoiseBuffer(c, String(p.noise) as NoiseType, N(p.noiseDur));
      const src = c.createBufferSource(); src.buffer = buf;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(N(p.noiseFreq), now);
      const g1 = c.createGain(); g1.gain.setValueAtTime(N(p.noiseVol), now); g1.gain.exponentialRampToValueAtTime(0.001, now + N(p.noiseDur));
      src.connect(lp); lp.connect(g1); g1.connect(getAnalyser()); src.start(now);
      const o = c.createOscillator(); o.type = String(p.wave) as OscillatorType;
      const g2 = c.createGain();
      o.connect(g2); g2.connect(getAnalyser());
      o.frequency.setValueAtTime(N(p.sineStart), now);
      o.frequency.exponentialRampToValueAtTime(Math.max(N(p.sineEnd), 1), now + N(p.sineDur));
      g2.gain.setValueAtTime(N(p.sineVol), now);
      g2.gain.exponentialRampToValueAtTime(0.001, now + N(p.sineDur) + 0.01);
      o.start(now); o.stop(now + N(p.sineDur) + 0.02);
    },
  },
  'Land High': {
    tunables: [
      { key: 'noise', label: 'Noise', type: 'select', options: ['white', 'pink', 'brown'], default: 'brown' },
      { key: 'wave', label: 'Waveform', type: 'select', options: ['sine', 'triangle', 'square'], default: 'sine' },
      { key: 'noiseFreq', label: 'Thump cutoff', min: 200, max: 1500, step: 50, default: 780, unit: 'Hz' },
      { key: 'noiseVol', label: 'Thump vol', min: 0.1, max: 2, step: 0.1, default: 1 },
      { key: 'noiseDur', label: 'Thump dur', min: 0.01, max: 0.06, step: 0.005, default: 0.02, unit: 's' },
      { key: 'sineStart', label: 'Sine start', min: 80, max: 500, step: 10, default: 260, unit: 'Hz' },
      { key: 'sineEnd', label: 'Sine end', min: 60, max: 400, step: 10, default: 182, unit: 'Hz' },
      { key: 'sineVol', label: 'Sine vol', min: 0.05, max: 1, step: 0.05, default: 0.4 },
      { key: 'sineDur', label: 'Sine dur', min: 0.02, max: 0.1, step: 0.005, default: 0.03, unit: 's' },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const buf = createNoiseBuffer(c, String(p.noise) as NoiseType, N(p.noiseDur));
      const src = c.createBufferSource(); src.buffer = buf;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(N(p.noiseFreq), now);
      const g1 = c.createGain(); g1.gain.setValueAtTime(N(p.noiseVol), now); g1.gain.exponentialRampToValueAtTime(0.001, now + N(p.noiseDur));
      src.connect(lp); lp.connect(g1); g1.connect(getAnalyser()); src.start(now);
      const o = c.createOscillator(); o.type = String(p.wave) as OscillatorType;
      const g2 = c.createGain();
      o.connect(g2); g2.connect(getAnalyser());
      o.frequency.setValueAtTime(N(p.sineStart), now);
      o.frequency.exponentialRampToValueAtTime(Math.max(N(p.sineEnd), 1), now + N(p.sineDur));
      g2.gain.setValueAtTime(N(p.sineVol), now);
      g2.gain.exponentialRampToValueAtTime(0.001, now + N(p.sineDur) + 0.01);
      o.start(now); o.stop(now + N(p.sineDur) + 0.02);
    },
  },
  'Exhale Low': {
    tunables: [
      { key: 'noise', label: 'Noise', type: 'select', options: ['white', 'pink', 'brown'], default: 'pink' },
      { key: 'freqStart', label: 'Filter start', min: 200, max: 2000, step: 50, default: 420, unit: 'Hz' },
      { key: 'freqEnd', label: 'Filter end', min: 500, max: 4000, step: 50, default: 980, unit: 'Hz' },
      { key: 'filterQ', label: 'Filter Q', min: 0.1, max: 3, step: 0.1, default: 0.5 },
      { key: 'dur', label: 'Duration', min: 0.05, max: 0.5, step: 0.01, default: 0.2, unit: 's' },
      { key: 'attack', label: 'Attack', min: 0.01, max: 0.1, step: 0.005, default: 0.05, unit: 's' },
      { key: 'vol', label: 'Volume', min: 0.1, max: 2, step: 0.1, default: 0.8 },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const buf = createNoiseBuffer(c, String(p.noise) as NoiseType, N(p.dur));
      const src = c.createBufferSource(); src.buffer = buf;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.setValueAtTime(N(p.filterQ), now);
      bp.frequency.setValueAtTime(N(p.freqStart), now);
      bp.frequency.exponentialRampToValueAtTime(Math.max(N(p.freqEnd), 1), now + N(p.dur) * 0.83);
      const g = c.createGain(); g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(N(p.vol), now + N(p.attack));
      g.gain.exponentialRampToValueAtTime(0.001, now + N(p.dur));
      src.connect(bp); bp.connect(g); g.connect(getAnalyser()); src.start(now);
    },
  },
  'Exhale High': {
    tunables: [
      { key: 'noise', label: 'Noise', type: 'select', options: ['white', 'pink', 'brown'], default: 'pink' },
      { key: 'freqStart', label: 'Filter start', min: 200, max: 2000, step: 50, default: 780, unit: 'Hz' },
      { key: 'freqEnd', label: 'Filter end', min: 500, max: 4000, step: 50, default: 1820, unit: 'Hz' },
      { key: 'filterQ', label: 'Filter Q', min: 0.1, max: 3, step: 0.1, default: 0.5 },
      { key: 'dur', label: 'Duration', min: 0.05, max: 0.5, step: 0.01, default: 0.16, unit: 's' },
      { key: 'attack', label: 'Attack', min: 0.01, max: 0.1, step: 0.005, default: 0.03, unit: 's' },
      { key: 'vol', label: 'Volume', min: 0.1, max: 2, step: 0.1, default: 0.8 },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const buf = createNoiseBuffer(c, String(p.noise) as NoiseType, N(p.dur));
      const src = c.createBufferSource(); src.buffer = buf;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.setValueAtTime(N(p.filterQ), now);
      bp.frequency.setValueAtTime(N(p.freqStart), now);
      bp.frequency.exponentialRampToValueAtTime(Math.max(N(p.freqEnd), 1), now + N(p.dur) * 0.83);
      const g = c.createGain(); g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(N(p.vol), now + N(p.attack));
      g.gain.exponentialRampToValueAtTime(0.001, now + N(p.dur));
      src.connect(bp); bp.connect(g); g.connect(getAnalyser()); src.start(now);
    },
  },
  'Success Low': {
    tunables: [
      { key: 'wave', label: 'Waveform', type: 'select', options: ['sine', 'triangle', 'square', 'sawtooth'], default: 'sine' },
      { key: 'freq1', label: 'Tone 1', min: 200, max: 1500, step: 10, default: 366, unit: 'Hz' },
      { key: 'freq2', label: 'Tone 2', min: 200, max: 1500, step: 10, default: 461, unit: 'Hz' },
      { key: 'gap', label: 'Gap', min: 0.04, max: 0.3, step: 0.01, default: 0.12, unit: 's' },
      { key: 'vol', label: 'Volume', min: 0.05, max: 1, step: 0.05, default: 0.4 },
      { key: 'decay', label: 'Decay', min: 0.05, max: 0.4, step: 0.01, default: 0.15, unit: 's' },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const gap = N(p.gap); const vol = N(p.vol); const dec = N(p.decay);
      [N(p.freq1), N(p.freq2)].forEach((freq, i) => {
        const o = c.createOscillator(); o.type = String(p.wave) as OscillatorType;
        const g = c.createGain();
        o.connect(g); g.connect(getAnalyser());
        o.frequency.setValueAtTime(freq, now + i * gap);
        g.gain.setValueAtTime(0, now);
        g.gain.setValueAtTime(vol, now + i * gap);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * gap + dec);
        o.start(now + i * gap); o.stop(now + i * gap + dec + 0.01);
      });
    },
  },
  'Success High': {
    tunables: [
      { key: 'wave', label: 'Waveform', type: 'select', options: ['sine', 'triangle', 'square', 'sawtooth'], default: 'sine' },
      { key: 'freq1', label: 'Tone 1', min: 200, max: 1500, step: 10, default: 680, unit: 'Hz' },
      { key: 'freq2', label: 'Tone 2', min: 200, max: 1500, step: 10, default: 857, unit: 'Hz' },
      { key: 'gap', label: 'Gap', min: 0.04, max: 0.3, step: 0.01, default: 0.12, unit: 's' },
      { key: 'vol', label: 'Volume', min: 0.05, max: 1, step: 0.05, default: 0.4 },
      { key: 'decay', label: 'Decay', min: 0.05, max: 0.4, step: 0.01, default: 0.15, unit: 's' },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const gap = N(p.gap); const vol = N(p.vol); const dec = N(p.decay);
      [N(p.freq1), N(p.freq2)].forEach((freq, i) => {
        const o = c.createOscillator(); o.type = String(p.wave) as OscillatorType;
        const g = c.createGain();
        o.connect(g); g.connect(getAnalyser());
        o.frequency.setValueAtTime(freq, now + i * gap);
        g.gain.setValueAtTime(0, now);
        g.gain.setValueAtTime(vol, now + i * gap);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * gap + dec);
        o.start(now + i * gap); o.stop(now + i * gap + dec + 0.01);
      });
    },
  },

  // --- Set: Warm tunables ---

  'Warm Tap': {
    tunables: [
      { key: 'wave', label: 'Waveform', type: 'select', options: ['triangle', 'sine', 'square', 'sawtooth'], default: 'triangle' },
      { key: 'freqStart', label: 'Freq start', min: 200, max: 700, step: 10, default: 380, unit: 'Hz' },
      { key: 'freqEnd', label: 'Freq end', min: 100, max: 600, step: 10, default: 300, unit: 'Hz' },
      { key: 'dur', label: 'Duration', min: 0.01, max: 0.06, step: 0.002, default: 0.025, unit: 's' },
      { key: 'noise', label: 'Noise type', type: 'select', options: ['brown', 'pink', 'white'], default: 'brown' },
      { key: 'noiseMix', label: 'Noise mix', min: 0.05, max: 0.4, step: 0.02, default: 0.2 },
      { key: 'vol', label: 'Volume', min: 0.1, max: 0.6, step: 0.02, default: 0.3 },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const o = c.createOscillator(); const g = c.createGain();
      o.type = String(p.wave) as OscillatorType;
      o.connect(g); g.connect(getAnalyser());
      o.frequency.setValueAtTime(N(p.freqStart), now); o.frequency.exponentialRampToValueAtTime(Math.max(N(p.freqEnd), 20), now + N(p.dur));
      g.gain.setValueAtTime(N(p.vol), now); g.gain.exponentialRampToValueAtTime(0.001, now + N(p.dur) + 0.005);
      o.start(now); o.stop(now + N(p.dur) + 0.01);
      const buf = createNoiseBuffer(c, String(p.noise) as NoiseType, 0.018);
      const src = c.createBufferSource(); src.buffer = buf;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, now);
      const g2 = c.createGain(); g2.gain.setValueAtTime(N(p.noiseMix), now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.018);
      src.connect(lp); lp.connect(g2); g2.connect(getAnalyser()); src.start(now);
    },
  },
  'Warm Stroke': {
    tunables: [
      { key: 'wave', label: 'Waveform', type: 'select', options: ['triangle', 'sine', 'square', 'sawtooth'], default: 'triangle' },
      { key: 'freq', label: 'Frequency', min: 200, max: 800, step: 10, default: 400, unit: 'Hz' },
      { key: 'dur', label: 'Duration', min: 0.005, max: 0.03, step: 0.002, default: 0.015, unit: 's' },
      { key: 'noise', label: 'Noise type', type: 'select', options: ['pink', 'brown', 'white'], default: 'pink' },
      { key: 'noiseMix', label: 'Noise mix', min: 0.02, max: 0.2, step: 0.01, default: 0.08 },
      { key: 'vol', label: 'Volume', min: 0.05, max: 0.5, step: 0.02, default: 0.2 },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const o = c.createOscillator(); const g = c.createGain();
      o.type = String(p.wave) as OscillatorType;
      o.connect(g); g.connect(getAnalyser());
      o.frequency.setValueAtTime(N(p.freq), now);
      g.gain.setValueAtTime(N(p.vol), now); g.gain.exponentialRampToValueAtTime(0.001, now + N(p.dur));
      o.start(now); o.stop(now + N(p.dur) + 0.005);
      const buf = createNoiseBuffer(c, String(p.noise) as NoiseType, 0.01);
      const src = c.createBufferSource(); src.buffer = buf;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(1200, now); bp.Q.setValueAtTime(0.4, now);
      const g2 = c.createGain(); g2.gain.setValueAtTime(N(p.noiseMix), now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.01);
      src.connect(bp); bp.connect(g2); g2.connect(getAnalyser()); src.start(now);
    },
  },
  'Warm Thump': {
    tunables: [
      { key: 'wave', label: 'Waveform', type: 'select', options: ['triangle', 'sine', 'square'], default: 'triangle' },
      { key: 'noise', label: 'Noise', type: 'select', options: ['brown', 'pink', 'white'], default: 'brown' },
      { key: 'freqStart', label: 'Freq start', min: 80, max: 300, step: 5, default: 150, unit: 'Hz' },
      { key: 'freqEnd', label: 'Freq end', min: 50, max: 200, step: 5, default: 100, unit: 'Hz' },
      { key: 'thumpVol', label: 'Thump vol', min: 0.3, max: 2.0, step: 0.1, default: 1.0 },
      { key: 'toneVol', label: 'Tone vol', min: 0.1, max: 0.8, step: 0.05, default: 0.4 },
      { key: 'dur', label: 'Duration', min: 0.03, max: 0.12, step: 0.005, default: 0.07, unit: 's' },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const buf = createNoiseBuffer(c, String(p.noise) as NoiseType, 0.04);
      const src = c.createBufferSource(); src.buffer = buf;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(500, now);
      const g1 = c.createGain(); g1.gain.setValueAtTime(N(p.thumpVol), now); g1.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      src.connect(lp); lp.connect(g1); g1.connect(getAnalyser()); src.start(now);
      const o = c.createOscillator(); const g2 = c.createGain();
      o.type = String(p.wave) as OscillatorType;
      o.connect(g2); g2.connect(getAnalyser());
      o.frequency.setValueAtTime(N(p.freqStart), now); o.frequency.exponentialRampToValueAtTime(Math.max(N(p.freqEnd), 20), now + N(p.dur) - 0.01);
      g2.gain.setValueAtTime(N(p.toneVol), now); g2.gain.exponentialRampToValueAtTime(0.001, now + N(p.dur));
      o.start(now); o.stop(now + N(p.dur) + 0.01);
    },
  },
  'Warm Breath': {
    tunables: [
      { key: 'noise', label: 'Noise type', type: 'select', options: ['brown', 'pink', 'white'], default: 'brown' },
      { key: 'filterStart', label: 'Filter start', min: 200, max: 1200, step: 50, default: 400, unit: 'Hz' },
      { key: 'filterEnd', label: 'Filter end', min: 400, max: 2000, step: 50, default: 800, unit: 'Hz' },
      { key: 'dur', label: 'Duration', min: 0.1, max: 0.4, step: 0.01, default: 0.22, unit: 's' },
      { key: 'attack', label: 'Attack', min: 0.02, max: 0.12, step: 0.005, default: 0.06, unit: 's' },
      { key: 'vol', label: 'Volume', min: 0.2, max: 1.2, step: 0.05, default: 0.7 },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const dur = N(p.dur);
      const buf = createNoiseBuffer(c, String(p.noise) as NoiseType, dur);
      const src = c.createBufferSource(); src.buffer = buf;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.setValueAtTime(0.4, now);
      lp.frequency.setValueAtTime(N(p.filterStart), now); lp.frequency.exponentialRampToValueAtTime(Math.max(N(p.filterEnd), 20), now + dur * 0.82);
      const g = c.createGain(); g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(N(p.vol), now + N(p.attack)); g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      src.connect(lp); lp.connect(g); g.connect(getAnalyser()); src.start(now);
    },
  },
  'Warm Touch': {
    tunables: [
      { key: 'noise', label: 'Noise', type: 'select', options: ['pink', 'brown', 'white'], default: 'pink' },
      { key: 'filterFreq', label: 'Filter freq', min: 300, max: 2000, step: 50, default: 800, unit: 'Hz' },
      { key: 'filterQ', label: 'Filter Q', min: 0.1, max: 3, step: 0.1, default: 0.5 },
      { key: 'dur', label: 'Duration', min: 0.005, max: 0.03, step: 0.001, default: 0.012, unit: 's' },
      { key: 'vol', label: 'Volume', min: 0.1, max: 0.8, step: 0.05, default: 0.35 },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const buf = createNoiseBuffer(c, String(p.noise) as NoiseType, N(p.dur));
      const src = c.createBufferSource(); src.buffer = buf;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(N(p.filterFreq), now); bp.Q.setValueAtTime(N(p.filterQ), now);
      const g = c.createGain(); g.gain.setValueAtTime(N(p.vol), now); g.gain.exponentialRampToValueAtTime(0.001, now + N(p.dur));
      src.connect(bp); bp.connect(g); g.connect(getAnalyser()); src.start(now);
    },
  },
  'Warm Glow': {
    tunables: [
      { key: 'wave', label: 'Waveform', type: 'select', options: ['triangle', 'sine', 'square', 'sawtooth'], default: 'triangle' },
      { key: 'freq1', label: 'Note 1', min: 200, max: 800, step: 10, default: 330, unit: 'Hz' },
      { key: 'freq2', label: 'Note 2', min: 200, max: 800, step: 10, default: 415, unit: 'Hz' },
      { key: 'freq3', label: 'Note 3', min: 200, max: 800, step: 10, default: 494, unit: 'Hz' },
      { key: 'gap', label: 'Gap', min: 0.04, max: 0.2, step: 0.01, default: 0.1, unit: 's' },
      { key: 'vol', label: 'Volume', min: 0.05, max: 0.5, step: 0.02, default: 0.2 },
      { key: 'decay', label: 'Decay', min: 0.1, max: 0.6, step: 0.02, default: 0.35, unit: 's' },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const gap = N(p.gap); const vol = N(p.vol); const dec = N(p.decay);
      [N(p.freq1), N(p.freq2), N(p.freq3)].forEach((freq, i) => {
        const o = c.createOscillator(); o.type = String(p.wave) as OscillatorType;
        const g = c.createGain();
        o.connect(g); g.connect(getAnalyser());
        const t = now + i * gap;
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(vol - i * 0.03, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dec);
        o.start(t); o.stop(t + dec + 0.05);
      });
    },
  },

  // --- Set: Crisp tunables ---

  'Crisp Click': {
    tunables: [
      { key: 'freqStart', label: 'Freq start', min: 400, max: 1200, step: 10, default: 700, unit: 'Hz' },
      { key: 'freqEnd', label: 'Freq end', min: 300, max: 900, step: 10, default: 580, unit: 'Hz' },
      { key: 'dur', label: 'Duration', min: 0.005, max: 0.025, step: 0.001, default: 0.012, unit: 's' },
      { key: 'noise', label: 'Noise type', type: 'select', options: ['white', 'pink', 'brown'], default: 'white' },
      { key: 'noiseMix', label: 'Noise mix', min: 0.03, max: 0.3, step: 0.01, default: 0.15 },
      { key: 'vol', label: 'Volume', min: 0.1, max: 0.6, step: 0.02, default: 0.35 },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const o = c.createOscillator(); const g = c.createGain();
      o.connect(g); g.connect(getAnalyser());
      o.frequency.setValueAtTime(N(p.freqStart), now); o.frequency.exponentialRampToValueAtTime(Math.max(N(p.freqEnd), 20), now + N(p.dur));
      g.gain.setValueAtTime(N(p.vol), now); g.gain.exponentialRampToValueAtTime(0.001, now + N(p.dur) + 0.003);
      o.start(now); o.stop(now + N(p.dur) + 0.006);
      const buf = createNoiseBuffer(c, String(p.noise) as NoiseType, 0.004);
      const src = c.createBufferSource(); src.buffer = buf;
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.setValueAtTime(6000, now);
      const g2 = c.createGain(); g2.gain.setValueAtTime(N(p.noiseMix), now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.004);
      src.connect(hp); hp.connect(g2); g2.connect(getAnalyser()); src.start(now);
    },
  },
  'Crisp Line': {
    tunables: [
      { key: 'wave', label: 'Waveform', type: 'select', options: ['sine', 'triangle', 'square', 'sawtooth'], default: 'sine' },
      { key: 'freq', label: 'Frequency', min: 400, max: 1500, step: 10, default: 800, unit: 'Hz' },
      { key: 'dur', label: 'Duration', min: 0.003, max: 0.02, step: 0.001, default: 0.008, unit: 's' },
      { key: 'noise', label: 'Noise type', type: 'select', options: ['white', 'pink', 'brown'], default: 'white' },
      { key: 'noiseMix', label: 'Noise mix', min: 0.02, max: 0.2, step: 0.01, default: 0.08 },
      { key: 'vol', label: 'Volume', min: 0.1, max: 0.6, step: 0.02, default: 0.3 },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const o = c.createOscillator(); const g = c.createGain();
      o.type = String(p.wave) as OscillatorType;
      o.connect(g); g.connect(getAnalyser());
      o.frequency.setValueAtTime(N(p.freq), now);
      g.gain.setValueAtTime(N(p.vol), now); g.gain.exponentialRampToValueAtTime(0.001, now + N(p.dur));
      o.start(now); o.stop(now + N(p.dur) + 0.002);
      const buf = createNoiseBuffer(c, String(p.noise) as NoiseType, 0.006);
      const src = c.createBufferSource(); src.buffer = buf;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(4500, now); bp.Q.setValueAtTime(1.5, now);
      const g2 = c.createGain(); g2.gain.setValueAtTime(N(p.noiseMix), now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.006);
      src.connect(bp); bp.connect(g2); g2.connect(getAnalyser()); src.start(now);
    },
  },
  'Crisp Drop': {
    tunables: [
      { key: 'noise', label: 'Noise', type: 'select', options: ['white', 'pink', 'brown'], default: 'white' },
      { key: 'filterFreq', label: 'Noise filter', min: 500, max: 3000, step: 50, default: 1200, unit: 'Hz' },
      { key: 'filterQ', label: 'Noise Q', min: 0.2, max: 3, step: 0.1, default: 0.8 },
      { key: 'freqStart', label: 'Sine start', min: 100, max: 500, step: 10, default: 240, unit: 'Hz' },
      { key: 'freqEnd', label: 'Sine end', min: 60, max: 300, step: 10, default: 160, unit: 'Hz' },
      { key: 'dur', label: 'Duration', min: 0.02, max: 0.08, step: 0.005, default: 0.045, unit: 's' },
      { key: 'vol', label: 'Sine vol', min: 0.1, max: 0.6, step: 0.05, default: 0.35 },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const buf = createNoiseBuffer(c, String(p.noise) as NoiseType, 0.02);
      const src = c.createBufferSource(); src.buffer = buf;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(N(p.filterFreq), now); bp.Q.setValueAtTime(N(p.filterQ), now);
      const g1 = c.createGain(); g1.gain.setValueAtTime(0.8, now); g1.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
      src.connect(bp); bp.connect(g1); g1.connect(getAnalyser()); src.start(now);
      const o = c.createOscillator(); const g2 = c.createGain();
      o.connect(g2); g2.connect(getAnalyser());
      o.frequency.setValueAtTime(N(p.freqStart), now); o.frequency.exponentialRampToValueAtTime(Math.max(N(p.freqEnd), 20), now + N(p.dur) - 0.01);
      g2.gain.setValueAtTime(N(p.vol), now); g2.gain.exponentialRampToValueAtTime(0.001, now + N(p.dur));
      o.start(now); o.stop(now + N(p.dur) + 0.005);
    },
  },
  'Crisp Wash': {
    tunables: [
      { key: 'noise', label: 'Noise', type: 'select', options: ['white', 'pink', 'brown'], default: 'white' },
      { key: 'freqStart', label: 'Filter start', min: 500, max: 5000, step: 100, default: 2000, unit: 'Hz' },
      { key: 'freqEnd', label: 'Filter end', min: 2000, max: 8000, step: 100, default: 5000, unit: 'Hz' },
      { key: 'filterQ', label: 'Filter Q', min: 0.1, max: 3, step: 0.1, default: 0.6 },
      { key: 'dur', label: 'Duration', min: 0.05, max: 0.3, step: 0.01, default: 0.15, unit: 's' },
      { key: 'attack', label: 'Attack', min: 0.01, max: 0.06, step: 0.005, default: 0.025, unit: 's' },
      { key: 'vol', label: 'Volume', min: 0.1, max: 1, step: 0.05, default: 0.6 },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const dur = N(p.dur);
      const buf = createNoiseBuffer(c, String(p.noise) as NoiseType, dur);
      const src = c.createBufferSource(); src.buffer = buf;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.setValueAtTime(N(p.filterQ), now);
      bp.frequency.setValueAtTime(N(p.freqStart), now);
      bp.frequency.exponentialRampToValueAtTime(Math.max(N(p.freqEnd), 1), now + dur * 0.8);
      const g = c.createGain(); g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(N(p.vol), now + N(p.attack));
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      src.connect(bp); bp.connect(g); g.connect(getAnalyser()); src.start(now);
    },
  },
  'Crisp Pick': {
    tunables: [
      { key: 'noise', label: 'Noise', type: 'select', options: ['white', 'pink', 'brown'], default: 'white' },
      { key: 'filterFreq', label: 'Filter freq', min: 2000, max: 8000, step: 100, default: 5500, unit: 'Hz' },
      { key: 'filterQ', label: 'Filter Q', min: 0.5, max: 5, step: 0.1, default: 2 },
      { key: 'dur', label: 'Duration', min: 0.003, max: 0.02, step: 0.001, default: 0.006, unit: 's' },
      { key: 'vol', label: 'Volume', min: 0.1, max: 0.8, step: 0.05, default: 0.4 },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const buf = createNoiseBuffer(c, String(p.noise) as NoiseType, N(p.dur));
      const src = c.createBufferSource(); src.buffer = buf;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(N(p.filterFreq), now); bp.Q.setValueAtTime(N(p.filterQ), now);
      const g = c.createGain(); g.gain.setValueAtTime(N(p.vol), now); g.gain.exponentialRampToValueAtTime(0.001, now + N(p.dur));
      src.connect(bp); bp.connect(g); g.connect(getAnalyser()); src.start(now);
    },
  },
  'Crisp Chime': {
    tunables: [
      { key: 'wave', label: 'Waveform', type: 'select', options: ['sine', 'triangle', 'square', 'sawtooth'], default: 'sine' },
      { key: 'freq1', label: 'Tone 1', min: 400, max: 1500, step: 10, default: 698, unit: 'Hz' },
      { key: 'freq2', label: 'Tone 2', min: 400, max: 1500, step: 10, default: 880, unit: 'Hz' },
      { key: 'gap', label: 'Gap', min: 0.04, max: 0.2, step: 0.01, default: 0.1, unit: 's' },
      { key: 'vol', label: 'Volume', min: 0.05, max: 0.6, step: 0.05, default: 0.3 },
      { key: 'decay', label: 'Decay', min: 0.05, max: 0.4, step: 0.01, default: 0.2, unit: 's' },
    ],
    playTuned: (p) => {
      const c = getCtx(); const now = c.currentTime;
      const gap = N(p.gap); const vol = N(p.vol); const dec = N(p.decay);
      [N(p.freq1), N(p.freq2)].forEach((freq, i) => {
        const o = c.createOscillator(); o.type = String(p.wave) as OscillatorType;
        const g = c.createGain();
        o.connect(g); g.connect(getAnalyser());
        o.frequency.setValueAtTime(freq, now + i * gap);
        g.gain.setValueAtTime(0, now);
        g.gain.setValueAtTime(vol, now + i * gap);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * gap + dec);
        o.start(now + i * gap); o.stop(now + i * gap + dec + 0.02);
      });
      // Shimmer accent on second tone
      const buf = createNoiseBuffer(c, 'white', 0.05);
      const src = c.createBufferSource(); src.buffer = buf;
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.setValueAtTime(8000, now + gap);
      const gs = c.createGain(); gs.gain.setValueAtTime(0, now); gs.gain.setValueAtTime(0.05, now + gap);
      gs.gain.exponentialRampToValueAtTime(0.001, now + gap + 0.05);
      src.connect(hp); hp.connect(gs); gs.connect(getAnalyser()); src.start(now + gap);
    },
  },
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

  // Palette tick designer — slow→fast→slow curve
  const [tickDuration, setTickDuration] = useState(500);
  const [tickCount, setTickCount] = useState(12);
  const [tickCurve, setTickCurve] = useState(0.33);
  const [tickNoiseType, setTickNoiseType] = useState<'white' | 'pink' | 'brown'>('white');
  const [tickFilterType, setTickFilterType] = useState<'highpass' | 'bandpass'>('bandpass');
  const [tickFilterFreq, setTickFilterFreq] = useState(5250);
  const [tickFilterQ, setTickFilterQ] = useState(0.2);
  const [tickLandFilterFreq, setTickLandFilterFreq] = useState(700);
  const [tickStartVol, setTickStartVol] = useState(0.4);
  const [tickVolDecay, setTickVolDecay] = useState(0.08);
  const [tickLandVol, setTickLandVol] = useState(0.36);
  const [tickLen, setTickLen] = useState(11);
  const [tickLandLen, setTickLandLen] = useState(13);

  // Liked presets
  const [likedPresets, setLikedPresets] = useState<Set<string>>(new Set());
  const toggleLike = useCallback((name: string) => {
    setLikedPresets(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  // Sound buckets — drag presets in, pick one as the "go-to"
  const SOUND_ROLES = [
    { id: 'button-click', label: 'Button Click', desc: 'Tool switches, keyboard shortcuts' },
    { id: 'stroke-thin', label: 'Stroke Thin', desc: 'Thin brush size' },
    { id: 'stroke-medium', label: 'Stroke Medium', desc: 'Medium brush size' },
    { id: 'stroke-thick', label: 'Stroke Thick', desc: 'Thick brush size' },
    { id: 'clear-canvas', label: 'Clear Canvas', desc: 'Wipe the board' },
    { id: 'palette-dice', label: 'Palette Dice', desc: 'Uses Palette Tick designer above' },
    { id: 'color-swatch', label: 'Color Swatch', desc: 'Pick a color' },
    { id: 'claude-done', label: 'Claude Done', desc: 'Claude finishes drawing' },
  ] as const;
  type RoleId = typeof SOUND_ROLES[number]['id'];

  type Bucket = { presets: string[]; selected: string | null; volume: number };
  const [buckets, setBuckets] = useState<Record<RoleId, Bucket>>({
    'button-click': { presets: ['Tick', 'Dip Low', 'Dip', 'Dip High', 'Crisp Click', 'Crisp Line', 'Crisp Drop', 'Tick Sharp'], selected: 'Tick', volume: 1 },
    'stroke-thin': { presets: ['Tick High'], selected: 'Tick High', volume: 1 },
    'stroke-medium': { presets: ['Tick'], selected: 'Tick', volume: 1 },
    'stroke-thick': { presets: ['Tick Low'], selected: 'Tick Low', volume: 1 },
    'clear-canvas': { presets: ['Exhale Low', 'Exhale', 'Exhale High'], selected: 'Exhale', volume: 1 },
    'palette-dice': { presets: [], selected: null, volume: 1 },
    'color-swatch': { presets: ['Snap Low', 'Snap', 'Snap High'], selected: 'Snap', volume: 1 },
    'claude-done': { presets: ['Success Low', 'Success', 'Success High'], selected: 'Success', volume: 1 },
  });

  // Drag state (shared by preset grid and buckets)
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOverCat, setDragOverCat] = useState<string | null>(null);
  const [dragOverBucket, setDragOverBucket] = useState<RoleId | null>(null);

  // Per-bucket parameter overrides (tuning sliders)
  const [bucketOverrides, setBucketOverrides] = useState<Record<string, Record<string, number | string>>>({});

  // Per-bucket tuning notes
  const [bucketNotes, setBucketNotes] = useState<Record<string, string>>({});

  const handleBucketDragOver = useCallback((e: React.DragEvent, roleId: RoleId) => {
    e.preventDefault();
    setDragOverBucket(roleId);
  }, []);

  const handleBucketDrop = useCallback((roleId: RoleId) => {
    if (!dragging) return;
    setBuckets(prev => {
      const next = { ...prev };
      // Remove from any bucket it's already in
      for (const key of Object.keys(next) as RoleId[]) {
        if (next[key].presets.includes(dragging)) {
          next[key] = {
            ...next[key],
            presets: next[key].presets.filter(n => n !== dragging),
            selected: next[key].selected === dragging ? null : next[key].selected,
          };
        }
      }
      // Add to target bucket
      if (!next[roleId].presets.includes(dragging)) {
        const newPresets = [...next[roleId].presets, dragging];
        next[roleId] = {
          ...next[roleId],
          presets: newPresets,
          selected: next[roleId].selected ?? dragging, // auto-select first
        };
      }
      return next;
    });
    setDragging(null);
    setDragOverBucket(null);
  }, [dragging]);

  const handleBucketDragLeave = useCallback(() => {
    setDragOverBucket(null);
  }, []);

  const setBucketSelected = useCallback((roleId: RoleId, presetName: string) => {
    setBuckets(prev => ({
      ...prev,
      [roleId]: { ...prev[roleId], selected: presetName },
    }));
  }, []);

  const removeBucketPreset = useCallback((roleId: RoleId, presetName: string) => {
    setBuckets(prev => {
      const bucket = prev[roleId];
      const newPresets = bucket.presets.filter(n => n !== presetName);
      return {
        ...prev,
        [roleId]: {
          ...bucket,
          presets: newPresets,
          selected: bucket.selected === presetName ? (newPresets[0] ?? null) : bucket.selected,
        },
      };
    });
  }, []);

  // Mutable category layout: category name → array of preset names
  const [layout, setLayout] = useState<Record<string, string[]>>({
    'Taps': ['Snap', 'Snap Low', 'Snap High', 'Typing', 'Paper Touch', 'Lift'],
    'Tones': ['Mark', 'Settle', 'Pop', 'Soft Tap', 'Tick', 'Tick Low', 'Tick High', 'Dip', 'Dip Low', 'Dip High', 'Dip Warm'],
    'Textures': ['Grab', 'Graphite', 'Fold', 'Let Go', 'Erase', 'Grain', 'Release'],
    'Breaths': ['Gust', 'Exhale', 'Exhale Low', 'Exhale High', 'Exhale Tight', 'Breath'],
    'Compound': ['Reset', 'Land', 'Land Low', 'Land High', 'Land Heavy', 'Land Cushion', 'Success', 'Success Low', 'Success High', 'Bloom', 'Sparkle', 'Sparkle Rising', 'Sparkle Slow', 'Sparkle Glass'],
    'Misc': ['Closer', 'Away', 'Hum', 'Resolve', 'Tick Airy', 'Tick Sharp', 'Tick Sharp Low', 'Tick Sharp High'],
    'Set: Warm': ['Warm Tap', 'Warm Stroke', 'Warm Thump', 'Warm Breath', 'Warm Touch', 'Warm Glow'],
    'Set: Crisp': ['Crisp Click', 'Crisp Line', 'Crisp Drop', 'Crisp Wash', 'Crisp Pick', 'Crisp Chime'],
  });

  // Comments per preset
  const [comments, setComments] = useState<Record<string, string>>({});

  // Flat lookup map for preset data (merged with tunables)
  const presetByName = useMemo(() => {
    const map = new Map<string, Preset>();
    for (const items of Object.values(presets)) {
      for (const p of items) {
        const tuning = presetTunables[p.name];
        map.set(p.name, tuning ? { ...p, ...tuning } : p);
      }
    }
    return map;
  }, []);

  // Set of preset names currently assigned to any bucket
  const usedPresets = useMemo(() => {
    const s = new Set<string>();
    for (const b of Object.values(buckets)) {
      for (const name of b.presets) s.add(name);
    }
    return s;
  }, [buckets]);

  // Play the go-to sound for a role (applies tuning overrides if any)
  const playRoleSound = useCallback((roleId: RoleId) => {
    const bucket = buckets[roleId];
    if (!bucket.selected) return;
    setPlaybackVolume(bucket.volume);
    const p = presetByName.get(bucket.selected);
    if (!p) return;
    const overrides = bucketOverrides[roleId];
    if (p.playTuned && p.tunables && overrides && Object.keys(overrides).length > 0) {
      const defaults: Record<string, number | string> = {};
      for (const t of p.tunables) defaults[t.key] = t.default;
      p.playTuned({ ...defaults, ...overrides });
    } else {
      p.play();
    }
  }, [buckets, presetByName, bucketOverrides]);

  // Play a preset directly (from preset cards) — always full volume
  const playPresetDirect = useCallback((preset: Preset) => {
    setPlaybackVolume(1);
    preset.play();
  }, []);

  // Set volume for a bucket
  const setBucketVolume = useCallback((roleId: RoleId, volume: number) => {
    setBuckets(prev => ({
      ...prev,
      [roleId]: { ...prev[roleId], volume },
    }));
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

    // Sound mapping buckets
    lines.push('# Sound Mapping');
    for (const role of SOUND_ROLES) {
      const bucket = buckets[role.id];
      if (role.id === 'palette-dice') {
        lines.push(`- **${role.label}**: Palette Tick (designer)`);
        continue;
      }
      const go = bucket.selected;
      const others = bucket.presets.filter(n => n !== go);
      const note = bucketNotes[role.id];
      if (go) {
        const extra = others.length > 0 ? ` (also: ${others.join(', ')})` : '';
        const overrides = bucketOverrides[role.id];
        let line = `- **${role.label}**: ${go}${extra}`;
        if (overrides && Object.keys(overrides).length > 0) {
          const preset = presetByName.get(go);
          const tunings = (preset?.tunables || [])
            .filter(t => overrides[t.key] !== undefined)
            .map(t => `${t.label}: ${formatTunableValue(overrides[t.key], t)}`)
            .join(', ');
          if (tunings) line += ` [${tunings}]`;
        }
        if (note) line += ` — "${note}"`;
        lines.push(line);
      } else if (bucket.presets.length > 0) {
        lines.push(`- **${role.label}**: ${bucket.presets.join(', ')} (no go-to)`);
      } else {
        lines.push(`- **${role.label}**: —`);
      }
    }
    lines.push('');

    // Preset categories
    lines.push('# Presets');
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
  }, [layout, comments, buckets, bucketOverrides, bucketNotes, presetByName]);

  // Tick schedule: slow→fast→slow using sine curve
  // tickCurve controls bunching: 0 = even spacing, 1 = max bunching in middle
  const tickSchedule = useMemo(() => {
    const times: number[] = [];
    for (let i = 0; i < tickCount; i++) {
      const t = i / (tickCount - 1); // 0 to 1
      const pos = t + tickCurve * Math.sin(2 * Math.PI * t) / (2 * Math.PI);
      times.push(Math.round(pos * tickDuration));
    }
    return times;
  }, [tickDuration, tickCount, tickCurve]);

  const handlePlayTick = useCallback(() => {
    const c = getCtx();
    const now = c.currentTime;
    const n = tickSchedule.length;

    tickSchedule.forEach((ms, i) => {
      const at = now + ms / 1000;
      const isLanding = i === n - 1;
      const len = (isLanding ? tickLandLen : tickLen) / 1000;

      // Create noise buffer for this tick
      const buf = createNoiseBuffer(c, tickNoiseType, len);
      const src = c.createBufferSource();
      src.buffer = buf;

      // Filter
      const filt = c.createBiquadFilter();
      filt.type = tickFilterType;
      const freq = isLanding ? tickLandFilterFreq : tickFilterFreq;
      filt.frequency.setValueAtTime(freq, at);
      filt.Q.setValueAtTime(tickFilterQ, at);

      // Gain envelope
      const g = c.createGain();
      const vol = isLanding ? tickLandVol : Math.max(0.02, tickStartVol - i * tickVolDecay);
      g.gain.setValueAtTime(vol, at);
      g.gain.exponentialRampToValueAtTime(0.001, at + len);

      src.connect(filt);
      filt.connect(g);
      g.connect(getAnalyser());
      src.start(at);
    });
  }, [tickSchedule, tickNoiseType, tickFilterType, tickFilterFreq, tickFilterQ, tickLandFilterFreq, tickStartVol, tickVolDecay, tickLandVol, tickLen, tickLandLen]);

  const tickCode = useMemo(() => {
    const noiseFunc = tickNoiseType === 'white'
      ? 'for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;'
      : tickNoiseType === 'pink'
        ? `let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;\nfor (let i = 0; i < data.length; i++) {\n  const w = Math.random() * 2 - 1;\n  b0 = 0.99886*b0 + w*0.0555179; b1 = 0.99332*b1 + w*0.0750759;\n  b2 = 0.969*b2 + w*0.153852; b3 = 0.8665*b3 + w*0.3104856;\n  b4 = 0.55*b4 + w*0.5329522; b5 = -0.7616*b5 - w*0.016898;\n  data[i] = (b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11; b6 = w*0.115926;\n}`
        : `let last = 0;\nfor (let i = 0; i < data.length; i++) {\n  const w = Math.random() * 2 - 1;\n  data[i] = (last + 0.02 * w) / 1.02; last = data[i]; data[i] *= 3.5;\n}`;

    const lines = [
      `const ctx = new AudioContext();`,
      `const now = ctx.currentTime;`,
      `const sr = ctx.sampleRate;`,
      ``,
      `// Decelerating tick schedule (ms)`,
      `const ticks = [${tickSchedule.map(t => Math.round(t)).join(', ')}];`,
      ``,
      `function makeNoise(duration) {`,
      `  const buf = ctx.createBuffer(1, sr * duration, sr);`,
      `  const data = buf.getChannelData(0);`,
      `  ${noiseFunc}`,
      `  return buf;`,
      `}`,
      ``,
      `ticks.forEach((ms, i) => {`,
      `  const at = now + ms / 1000;`,
      `  const isLanding = i === ticks.length - 1;`,
      `  const len = isLanding ? ${tickLandLen / 1000} : ${tickLen / 1000};`,
      ``,
      `  const src = ctx.createBufferSource();`,
      `  src.buffer = makeNoise(len);`,
      `  const filt = ctx.createBiquadFilter();`,
      `  filt.type = '${tickFilterType}';`,
      `  filt.frequency.setValueAtTime(isLanding ? ${tickLandFilterFreq} : ${tickFilterFreq}, at);`,
      `  filt.Q.setValueAtTime(${tickFilterQ}, at);`,
      `  const g = ctx.createGain();`,
      `  g.gain.setValueAtTime(isLanding ? ${tickLandVol} : Math.max(0.02, ${tickStartVol} - i * ${tickVolDecay}), at);`,
      `  g.gain.exponentialRampToValueAtTime(0.001, at + len);`,
      ``,
      `  src.connect(filt); filt.connect(g); g.connect(ctx.destination);`,
      `  src.start(at);`,
      `});`,
    ];
    return lines.join('\n');
  }, [tickSchedule, tickNoiseType, tickFilterType, tickFilterFreq, tickFilterQ, tickLandFilterFreq, tickStartVol, tickVolDecay, tickLandVol, tickLen, tickLandLen]);

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

        {/* Palette Tick Designer */}
        <div className="sound-card full-width">
          <h2>Palette Tick</h2>
          <p className="card-desc">Noise ticks with slow→fast→slow timing for color palette reel</p>

          {/* Timeline visualization */}
          <div className="tick-timeline">
            <svg viewBox={`0 0 ${tickDuration + 20} 40`} preserveAspectRatio="none">
              {/* Base line */}
              <line x1="0" y1="30" x2={tickDuration} y2="30" stroke="#2a2a3e" strokeWidth="1" />
              {/* Tick markers */}
              {tickSchedule.map((ms, i) => {
                const isLanding = i === tickSchedule.length - 1;
                const vol = isLanding ? tickLandVol : Math.max(0.02, tickStartVol - i * tickVolDecay);
                const h = 4 + (vol / Math.max(tickStartVol, tickLandVol)) * 20;
                return (
                  <g key={i}>
                    <line
                      x1={ms} y1={30 - h} x2={ms} y2={30}
                      stroke={isLanding ? '#22c55e' : '#6366f1'}
                      strokeWidth={isLanding ? 3 : 2}
                      strokeLinecap="round"
                    />
                    <circle
                      cx={ms} cy={30 - h}
                      r={isLanding ? 3 : 2}
                      fill={isLanding ? '#22c55e' : '#6366f1'}
                    />
                  </g>
                );
              })}
              {/* Time labels */}
              <text x="0" y="39" fill="#555" fontSize="8" fontFamily="monospace">0</text>
              <text x={tickDuration} y="39" fill="#555" fontSize="8" fontFamily="monospace" textAnchor="end">{tickDuration}ms</text>
            </svg>
            <div className="tick-timeline-label">{tickSchedule.length} ticks &middot; gaps: {tickSchedule.slice(1).map((ms, i) => ms - tickSchedule[i]).join(', ')}ms</div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <div>
              <div className="slider-label" style={{ marginBottom: '0.35rem' }}><span>Noise</span></div>
              <div className="toggle-row" style={{ marginBottom: 0 }}>
                {(['white', 'pink', 'brown'] as const).map((t) => (
                  <button key={t} className={`toggle-btn ${tickNoiseType === t ? 'active' : ''}`} onClick={() => setTickNoiseType(t)}>{t}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="slider-label" style={{ marginBottom: '0.35rem' }}><span>Filter</span></div>
              <div className="toggle-row" style={{ marginBottom: 0 }}>
                {(['highpass', 'bandpass'] as const).map((t) => (
                  <button key={t} className={`toggle-btn ${tickFilterType === t ? 'active' : ''}`} onClick={() => setTickFilterType(t)}>{t}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="adsr-row">
            <div className="slider-group">
              <div className="slider-label">
                <span>Duration</span>
                <span>{tickDuration} ms</span>
              </div>
              <input type="range" min={200} max={1200} step={10} value={tickDuration} onChange={(e) => setTickDuration(+e.target.value)} />
            </div>
            <div className="slider-group">
              <div className="slider-label">
                <span>Ticks</span>
                <span>{tickCount}</span>
              </div>
              <input type="range" min={4} max={20} step={1} value={tickCount} onChange={(e) => setTickCount(+e.target.value)} />
            </div>
            <div className="slider-group">
              <div className="slider-label">
                <span>Curve</span>
                <span>{tickCurve.toFixed(2)}</span>
              </div>
              <input type="range" min={0} max={0.95} step={0.01} value={tickCurve} onChange={(e) => setTickCurve(+e.target.value)} />
            </div>
            <div className="slider-group">
              <div className="slider-label">
                <span>Filter freq</span>
                <span>{tickFilterFreq} Hz</span>
              </div>
              <input type="range" min={500} max={8000} step={50} value={tickFilterFreq} onChange={(e) => setTickFilterFreq(+e.target.value)} />
            </div>
            <div className="slider-group">
              <div className="slider-label">
                <span>Filter Q</span>
                <span>{tickFilterQ.toFixed(1)}</span>
              </div>
              <input type="range" min={0.1} max={5} step={0.1} value={tickFilterQ} onChange={(e) => setTickFilterQ(+e.target.value)} />
            </div>
            <div className="slider-group">
              <div className="slider-label">
                <span>Landing filter freq</span>
                <span>{tickLandFilterFreq} Hz</span>
              </div>
              <input type="range" min={200} max={6000} step={50} value={tickLandFilterFreq} onChange={(e) => setTickLandFilterFreq(+e.target.value)} />
            </div>
            <div className="slider-group">
              <div className="slider-label">
                <span>Start volume</span>
                <span>{tickStartVol.toFixed(2)}</span>
              </div>
              <input type="range" min={0.05} max={1.5} step={0.01} value={tickStartVol} onChange={(e) => setTickStartVol(+e.target.value)} />
            </div>
            <div className="slider-group">
              <div className="slider-label">
                <span>Vol decay/tick</span>
                <span>{tickVolDecay.toFixed(3)}</span>
              </div>
              <input type="range" min={0} max={0.15} step={0.002} value={tickVolDecay} onChange={(e) => setTickVolDecay(+e.target.value)} />
            </div>
            <div className="slider-group">
              <div className="slider-label">
                <span>Landing volume</span>
                <span>{tickLandVol.toFixed(2)}</span>
              </div>
              <input type="range" min={0.05} max={1.5} step={0.01} value={tickLandVol} onChange={(e) => setTickLandVol(+e.target.value)} />
            </div>
            <div className="slider-group">
              <div className="slider-label">
                <span>Tick length</span>
                <span>{tickLen} ms</span>
              </div>
              <input type="range" min={2} max={30} step={1} value={tickLen} onChange={(e) => setTickLen(+e.target.value)} />
            </div>
            <div className="slider-group">
              <div className="slider-label">
                <span>Landing length</span>
                <span>{tickLandLen} ms</span>
              </div>
              <input type="range" min={5} max={50} step={1} value={tickLandLen} onChange={(e) => setTickLandLen(+e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button className="play-btn" style={{ flex: 1 }} onClick={handlePlayTick}>
              Play Tick
            </button>
            <button
              className={`play-btn ${copiedPreset === '__tick' ? 'copied' : ''}`}
              style={{ flex: 0, padding: '0.6rem 1.5rem', background: copiedPreset === '__tick' ? '#22c55e' : '#1a1a2a', border: '1px solid #2a2a3e' }}
              onClick={() => handleCopy('__tick', tickCode)}
            >
              {copiedPreset === '__tick' ? 'copied!' : 'copy code'}
            </button>
          </div>
        </div>

      </div>

      {/* Sound Role Buckets */}
      <div className="buckets-section">
        <h2>Sound Mapping</h2>
        <p className="section-desc">Drag presets from below into each role. Click a chip to set it as the go-to sound.</p>

        <div className="buckets-grid">
          {SOUND_ROLES.map((role) => {
            const bucket = buckets[role.id];
            const isTickLocked = role.id === 'palette-dice';
            return (
              <div
                key={role.id}
                className={`bucket-card${dragOverBucket === role.id ? ' bucket-card--drag-over' : ''}${bucket.selected || isTickLocked ? ' bucket-card--has-selected' : ''}`}
                onDragOver={isTickLocked ? undefined : (e) => handleBucketDragOver(e, role.id)}
                onDragLeave={isTickLocked ? undefined : handleBucketDragLeave}
                onDrop={isTickLocked ? undefined : () => handleBucketDrop(role.id)}
              >
                <div className="bucket-header">
                  <span className="bucket-label">{role.label}</span>
                  <span className="bucket-desc">{role.desc}</span>
                </div>
                <div className="bucket-chips">
                  {isTickLocked ? (
                    <button
                      className="bucket-chip bucket-chip--selected"
                      onClick={handlePlayTick}
                    >
                      Palette Tick
                    </button>
                  ) : (
                    <>
                      {bucket.presets.length === 0 && (
                        <span className="bucket-empty">drag sounds here</span>
                      )}
                      {bucket.presets.map((name) => (
                        <button
                          key={name}
                          className={`bucket-chip${bucket.selected === name ? ' bucket-chip--selected' : ''}`}
                          onClick={() => {
                            setBucketSelected(role.id, name);
                            setPlaybackVolume(bucket.volume);
                            const p = presetByName.get(name);
                            if (p) p.play();
                          }}
                        >
                          {name}
                          <span
                            className="bucket-chip-remove"
                            onClick={(e) => { e.stopPropagation(); removeBucketPreset(role.id, name); }}
                          >
                            &times;
                          </span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
                {(
                  <div className="bucket-volume">
                    <input
                      type="range"
                      min={0} max={2} step={0.05}
                      value={bucket.volume}
                      onChange={(e) => setBucketVolume(role.id, +e.target.value)}
                    />
                    <span className="bucket-volume-label">{Math.round(bucket.volume * 100)}%</span>
                  </div>
                )}
                {!isTickLocked && bucket.selected && (() => {
                  const preset = presetByName.get(bucket.selected);
                  if (!preset?.tunables || !preset.playTuned) return null;
                  const overrides = bucketOverrides[role.id] || {};
                  const hasOverrides = Object.keys(overrides).length > 0;
                  return (
                    <div className="bucket-tunables">
                      <div className="bucket-tunables-grid">
                        {preset.tunables.map((t) => {
                          const val = overrides[t.key] ?? t.default;
                          if ('type' in t && t.type === 'select') {
                            return (
                              <div key={t.key} className="bucket-tunable bucket-tunable--select">
                                <div className="bucket-tunable-label">
                                  <span>{t.label}</span>
                                </div>
                                <div className="bucket-tunable-toggles">
                                  {t.options.map((opt) => (
                                    <button
                                      key={opt}
                                      className={`bucket-tunable-toggle${String(val) === opt ? ' active' : ''}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setBucketOverrides(prev => ({
                                          ...prev,
                                          [role.id]: { ...(prev[role.id] || {}), [t.key]: opt },
                                        }));
                                      }}
                                    >
                                      {opt}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          const rt = t as TunableRange;
                          return (
                            <div key={t.key} className="bucket-tunable">
                              <div className="bucket-tunable-label">
                                <span>{t.label}</span>
                                <span>{formatTunableValue(val, t)}</span>
                              </div>
                              <input
                                type="range"
                                min={rt.min} max={rt.max} step={rt.step}
                                value={val}
                                onChange={(e) => {
                                  setBucketOverrides(prev => ({
                                    ...prev,
                                    [role.id]: { ...(prev[role.id] || {}), [t.key]: +e.target.value },
                                  }));
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="bucket-tunables-actions">
                        {hasOverrides && (
                          <button
                            className="bucket-tunables-reset"
                            onClick={() => {
                              setBucketOverrides(prev => {
                                const next = { ...prev };
                                delete next[role.id];
                                return next;
                              });
                            }}
                          >
                            reset
                          </button>
                        )}
                        <button
                          className="bucket-tunables-play"
                          onClick={() => {
                            const defaults: Record<string, number | string> = {};
                            for (const t of preset.tunables!) defaults[t.key] = t.default;
                            setPlaybackVolume(bucket.volume);
                            preset.playTuned!({ ...defaults, ...overrides });
                          }}
                        >
                          play tuned
                        </button>
                      </div>
                      <input
                        className="bucket-tunables-note"
                        type="text"
                        placeholder="add tuning note..."
                        value={bucketNotes[role.id] || ''}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setBucketNotes(prev => ({ ...prev, [role.id]: e.target.value }))}
                      />
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>

      {/* Test UI — mini toolbar mockup */}
      <div className="test-ui-section">
        <h2>Test UI</h2>
        <p className="section-desc">Try the mapped sounds in a toolbar mockup.</p>

        <div className="test-toolbar">
          <div className="test-group">
            <span className="test-group-label">Tools</span>
            <div className="test-buttons">
              {['Pencil', 'ASCII', 'Eraser', 'Comment'].map((t) => (
                <button key={t} className="test-btn" onClick={() => playRoleSound('button-click')}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="test-divider" />

          <div className="test-group">
            <span className="test-group-label">Size</span>
            <div className="test-buttons">
              <button className="test-btn test-btn--size" onClick={() => playRoleSound('stroke-thin')}>
                <span className="test-stroke test-stroke--thin" />
              </button>
              <button className="test-btn test-btn--size" onClick={() => playRoleSound('stroke-medium')}>
                <span className="test-stroke test-stroke--medium" />
              </button>
              <button className="test-btn test-btn--size" onClick={() => playRoleSound('stroke-thick')}>
                <span className="test-stroke test-stroke--thick" />
              </button>
            </div>
          </div>

          <div className="test-divider" />

          <div className="test-group">
            <span className="test-group-label">Colors</span>
            <div className="test-buttons">
              {['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'].map((c) => (
                <button
                  key={c}
                  className="test-btn test-btn--color"
                  style={{ background: c }}
                  onClick={() => playRoleSound('color-swatch')}
                />
              ))}
              <button className="test-btn" onClick={handlePlayTick}>
                Dice
              </button>
            </div>
          </div>

          <div className="test-divider" />

          <div className="test-group">
            <span className="test-group-label">Actions</span>
            <div className="test-buttons">
              <button className="test-btn test-btn--danger" onClick={() => playRoleSound('clear-canvas')}>
                Clear
              </button>
              <button className="test-btn test-btn--accent" onClick={() => playRoleSound('claude-done')}>
                Claude Done
              </button>
            </div>
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
                    className={`preset-card${dragging === name ? ' dragging' : ''}${usedPresets.has(name) ? ' preset-card--mapped' : ''}`}
                    draggable
                    onDragStart={() => handleDragStart(name)}
                    onDragEnd={handleDragEnd}
                    onClick={() => playPresetDirect(p)}
                  >
                    <button
                      className={`like-btn ${likedPresets.has(name) ? 'liked' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(name);
                      }}
                    >
                      {likedPresets.has(name) ? '♥' : '♡'}
                    </button>
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
