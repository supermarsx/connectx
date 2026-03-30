/** Sound engine — Web Audio API synthesized sounds for ConnectX */

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let _muted = false;
let _volume = 0.5;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = _volume;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function getGain(): GainNode {
  getCtx();
  return masterGain!;
}

export function setVolume(v: number): void {
  _volume = Math.max(0, Math.min(1, v));
  if (masterGain) masterGain.gain.value = _muted ? 0 : _volume;
}

export function setMuted(m: boolean): void {
  _muted = m;
  if (masterGain) masterGain.gain.value = _muted ? 0 : _volume;
}

export function getVolume(): number { return _volume; }
export function isMuted(): boolean { return _muted; }

/** Soft clack — piece drop sound with slight pitch variation */
export function playDrop(): void {
  const ctx = getCtx();
  const gain = getGain();
  const now = ctx.currentTime;

  // Noise burst for "clack"
  const duration = 0.08;
  const bufferSize = Math.ceil(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 800 + Math.random() * 400; // slight variation
  filter.Q.value = 2;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.6, now);
  env.gain.exponentialRampToValueAtTime(0.001, now + duration);

  noise.connect(filter);
  filter.connect(env);
  env.connect(gain);
  noise.start(now);
  noise.stop(now + duration);

  // Subtle tonal "thud"
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(180 + Math.random() * 40, now);
  osc.frequency.exponentialRampToValueAtTime(80, now + 0.06);

  const oscEnv = ctx.createGain();
  oscEnv.gain.setValueAtTime(0.3, now);
  oscEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

  osc.connect(oscEnv);
  oscEnv.connect(gain);
  osc.start(now);
  osc.stop(now + 0.07);
}

/** Gentle pop — turn change sound */
export function playTurnChange(): void {
  const ctx = getCtx();
  const gain = getGain();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(900, now + 0.04);
  osc.frequency.exponentialRampToValueAtTime(700, now + 0.08);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.25, now);
  env.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

  osc.connect(env);
  env.connect(gain);
  osc.start(now);
  osc.stop(now + 0.12);
}

/** Rising chime — win sound */
export function playWin(): void {
  const ctx = getCtx();
  const gain = getGain();
  const now = ctx.currentTime;

  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const env = ctx.createGain();
    const start = now + i * 0.12;
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(0.3, start + 0.03);
    env.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

    osc.connect(env);
    env.connect(gain);
    osc.start(start);
    osc.stop(start + 0.4);
  });
}

/** Descending two-note tone — draw/loss sound */
export function playDrawLoss(): void {
  const ctx = getCtx();
  const gain = getGain();
  const now = ctx.currentTime;

  const notes = [440, 330]; // A4 down to E4
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;

    const env = ctx.createGain();
    const start = now + i * 0.25;
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(0.2, start + 0.03);
    env.gain.exponentialRampToValueAtTime(0.001, start + 0.4);

    osc.connect(env);
    env.connect(gain);
    osc.start(start);
    osc.stop(start + 0.45);
  });
}
