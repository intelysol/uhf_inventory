/**
 * Web Audio API synthesizer for industrial RFID reader sound effects
 * Provides realistic audio feedback for tag reads, proximity radar, and alerts
 */

class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private proximityInterval: number | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /** Short crisp beep for an individual tag read */
  public playTagBeep(frequency = 2400, duration = 0.04, volume = 0.15): void {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);

      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio error suppressed silently
    }
  }

  /** Success chime when target is found or product confirmed */
  public playSuccessChime(): void {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      [1800, 2400, 3200].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);

        gain.gain.setValueAtTime(0.12, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.12);
      });
    } catch {
      // Audio error suppressed silently
    }
  }

  /** Alert chime for unknown tags or error states */
  public playAlertBeep(): void {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.setValueAtTime(600, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch {
      // Audio error suppressed silently
    }
  }

  /** Dynamic proximity radar sound based on signal proximity percentage (0-100%) */
  public playProximityPulse(proximityPercent: number): void {
    // Map 0-100% to 1200Hz - 3600Hz
    const freq = 1200 + (proximityPercent / 100) * 2400;
    const duration = Math.max(0.03, 0.08 - (proximityPercent / 100) * 0.04);
    this.playTagBeep(freq, duration, 0.2);
  }

  public triggerHaptic(duration = 40): void {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(duration);
      } catch {
        // Ignore haptic errors
      }
    }
  }
}

export const soundManager = new AudioSynthesizer();
