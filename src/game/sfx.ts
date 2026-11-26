"use client";

// 简易 WebAudio 音效，无需外部资源
let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  }
  return audioCtx;
}

type SfxName = "shoot" | "hit" | "explode" | "powerup" | "lose" | "win";

const RECIPES: Record<SfxName, { type: OscillatorType; from: number; to: number; dur: number; gain: number }> = {
  shoot: { type: "square", from: 720, to: 320, dur: 0.07, gain: 0.045 },
  hit: { type: "square", from: 240, to: 120, dur: 0.06, gain: 0.04 },
  explode: { type: "sawtooth", from: 180, to: 40, dur: 0.35, gain: 0.09 },
  powerup: { type: "triangle", from: 520, to: 1040, dur: 0.22, gain: 0.07 },
  lose: { type: "sawtooth", from: 300, to: 60, dur: 0.9, gain: 0.1 },
  win: { type: "triangle", from: 440, to: 880, dur: 0.5, gain: 0.08 },
};

export function playSfx(name: SfxName, muted: boolean) {
  if (muted) return;
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();
  const r = RECIPES[name];
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const now = ctx.currentTime;
  osc.type = r.type;
  osc.frequency.setValueAtTime(r.from, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, r.to), now + r.dur);
  gain.gain.setValueAtTime(r.gain, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + r.dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + r.dur + 0.02);
}
