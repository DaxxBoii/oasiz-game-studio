export class AudioManager {
  private ctx: AudioContext | null = null;

  private ensure(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state !== "running") this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  private tone(
    freq: number,
    dur: number,
    vol = 0.25,
    type: OscillatorType = "sine",
  ): void {
    const ctx = this.ensure();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  private noise(dur: number, vol = 0.12): void {
    const ctx = this.ensure();
    const len = ctx.sampleRate * dur;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(gain).connect(ctx.destination);
    src.start();
  }

  crash(): void {
    this.noise(0.4, 0.3);
    this.tone(120, 0.3, 0.2, "sawtooth");
  }

  ui(): void {
    this.tone(600, 0.06, 0.12);
  }

  collect(): void {
    this.tone(880, 0.08, 0.15);
    this.tone(1320, 0.1, 0.10);
  }

  /* ── Background music ── */

  private playing = false;
  private iv: ReturnType<typeof setInterval> | null = null;

  musicOn(): void {
    if (this.playing) return;
    this.playing = true;
    const bassNotes = [55, 65.41, 73.42, 82.41];
    let idx = 0;
    const play = () => {
      if (!this.playing) return;
      this.tone(bassNotes[idx++ % bassNotes.length], 0.35, 0.05, "triangle");
    };
    play();
    this.iv = setInterval(play, 480);
  }

  musicOff(): void {
    this.playing = false;
    if (this.iv) {
      clearInterval(this.iv);
      this.iv = null;
    }
  }
}
