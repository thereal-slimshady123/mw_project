/**
 * BREATHEBEAT Audio Engine
 * Drives the guided 4-6 breathing rest (4s Inhale, 6s Exhale) in one of two conditions:
 *   - 'breathebeat': plays breathebeat_4-6.mp3 (2 min, 12 cycles). The breathing phase is
 *     derived from the track's own playback position, so the visual guide can never drift
 *     away from the audio.
 *   - 'silence': no audio and no pacing. Participants rest with eyes closed and breathe slowly at
 *     their own pace for the same 2 minutes (wall clock, phase reported as 'rest').
 * Both conditions end with the same soft chime so participants know when to open their eyes.
 */

export const REST_CONDITIONS = ['silence', 'breathebeat'];

export class BreatheBeatAudio {
  constructor() {
    this.audioSrc = new URL('./breathebeat_4-6.mp3', import.meta.url).href;
    this.audio = null;
    this.ctx = null;
    this.gainNode = null;
    this.analyser = null;
    this.isCycleRunning = false;
    this.volume = 1.0;
    this.currentCycle = 1;
    this.currentPhase = 'idle'; // 'inhale' | 'exhale' | 'rest' | 'idle'
    this.onPhaseChangeCallback = null;
    this.onTickCallback = null;
    this.onCompleteCallback = null;
    this.animFrameId = null;
    this.lastReportedPhase = null;
    this.isInitialized = false;

    this.mode = 'silence';
    this.clockStart = 0;
    this.elapsedSec = 0;
    this.wasMuted = false; // set if volume hit 0 at any point during a BreatheBeat rest

    // Cycle configuration (measured from the track: sound onsets every ~10.01s, first at ~0.05s)
    this.inhaleLen = 4.0;
    this.exhaleLen = 6.0;
    this.cycleLength = 10.0;
    this.audioCyclePeriod = 10.011;
    this.audioCycleOffset = 0.05;
    this.totalRounds = 12; // 12 x 10s = 2 minutes, the full length of the track
  }

  /**
   * Initializes audio elements and context (must follow a user gesture)
   */
  async init() {
    if (this.isInitialized) return;

    try {
      this.audio = new Audio(this.audioSrc);
      this.audio.preload = 'auto';
      this.audio.volume = this.volume;

      // Web Audio API for frequency analysis / visualization support
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        try {
          const source = this.ctx.createMediaElementSource(this.audio);
          this.gainNode = this.ctx.createGain();
          this.gainNode.gain.setValueAtTime(1, this.ctx.currentTime);
          this.analyser = this.ctx.createAnalyser();
          this.analyser.fftSize = 256;
          this.analyser.smoothingTimeConstant = 0.8;

          source.connect(this.gainNode);
          this.gainNode.connect(this.analyser);
          this.analyser.connect(this.ctx.destination);
        } catch (e) {
          // Fallback to direct HTML5 Audio output
          console.warn('Web Audio routing fallback:', e);
        }
      }

      this.isInitialized = true;
    } catch (err) {
      console.error('Failed to initialize audio:', err);
    }
  }

  /**
   * Starts a guided breathing rest.
   * @param {{ mode: 'silence'|'breathebeat', totalRounds?: number, onPhaseChange?, onTick?, onComplete? }} opts
   */
  async startBreathingCycle(opts = {}) {
    this.stopBreathingCycle();

    this.mode = opts.mode === 'breathebeat' ? 'breathebeat' : 'silence';
    this.totalRounds = opts.totalRounds || 12;
    this.onPhaseChangeCallback = opts.onPhaseChange || null;
    this.onTickCallback = opts.onTick || null;
    this.onCompleteCallback = opts.onComplete || null;
    this.currentCycle = 1;
    this.lastReportedPhase = null;
    this.elapsedSec = 0;
    this.wasMuted = this.mode === 'breathebeat' && this.volume === 0;
    this.isCycleRunning = true;

    if (this.mode === 'breathebeat') {
      await this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      if (this.audio && this.isCycleRunning) {
        this.audio.currentTime = 0;
        try {
          await this.audio.play();
        } catch (e) {
          console.warn('Audio play request interrupted:', e);
        }
      }
    }

    if (!this.isCycleRunning) {
      // Stopped (e.g. skipped) while playback was starting
      if (this.audio) this.audio.pause();
      return;
    }
    this.clockStart = performance.now();
    this._startSyncLoop();
  }

  /**
   * Returns { cycle (1-based), timeInCycle } for the active clock
   */
  _currentPosition() {
    if (this.mode === 'breathebeat' && this.audio) {
      const t = Math.max(0, this.audio.currentTime - this.audioCycleOffset);
      const cycleIndex = Math.floor(t / this.audioCyclePeriod);
      // Map the track's slightly-longer-than-10s cycle onto the nominal 10s phase layout
      const timeInCycle = ((t - cycleIndex * this.audioCyclePeriod) / this.audioCyclePeriod) * this.cycleLength;
      return { cycle: cycleIndex + 1, timeInCycle, elapsed: this.audio.currentTime };
    }

    const elapsed = (performance.now() - this.clockStart) / 1000;
    const cycleIndex = Math.floor(elapsed / this.cycleLength);
    return { cycle: cycleIndex + 1, timeInCycle: elapsed - cycleIndex * this.cycleLength, elapsed };
  }

  /**
   * Continuous sync loop reporting phase changes and per-frame progress
   */
  _startSyncLoop() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

    const update = () => {
      if (!this.isCycleRunning) return;

      const { cycle, timeInCycle, elapsed } = this._currentPosition();
      this.elapsedSec = elapsed;
      const audioEnded = this.mode === 'breathebeat' && this.audio && this.audio.ended;

      if (cycle > this.totalRounds || audioEnded) {
        this.stopBreathingCycle();
        if (this.onCompleteCallback) {
          this.onCompleteCallback({ totalCycles: this.totalRounds });
        }
        return;
      }

      this.currentCycle = cycle;

      let phase, phaseTime, phaseDuration, label;
      if (this.mode === 'silence') {
        // Unpaced rest: one continuous phase, the cycle count only drives the 2-minute timer
        phase = 'rest';
        phaseTime = timeInCycle;
        phaseDuration = this.cycleLength;
        label = 'Rest';
      } else if (timeInCycle < this.inhaleLen) {
        phase = 'inhale';
        phaseTime = timeInCycle;
        phaseDuration = this.inhaleLen;
        label = 'Inhale';
      } else {
        phase = 'exhale';
        phaseTime = timeInCycle - this.inhaleLen;
        phaseDuration = this.exhaleLen;
        label = 'Exhale';
      }

      const phaseProgress = Math.min(Math.max(phaseTime / phaseDuration, 0), 1);
      const remainingSec = Math.max(0, Math.ceil(phaseDuration - phaseTime));
      const totalElapsedSec = (cycle - 1) * this.cycleLength + timeInCycle;
      const totalSecondsLeft = Math.max(0, Math.ceil(this.totalRounds * this.cycleLength - totalElapsedSec));

      const phaseKey = this.mode === 'silence' ? 'rest' : `${cycle}-${phase}`;
      if (phaseKey !== this.lastReportedPhase) {
        this.lastReportedPhase = phaseKey;
        this.currentPhase = phase;
        if (this.onPhaseChangeCallback) {
          this.onPhaseChangeCallback({
            phase,
            label,
            duration: phaseDuration,
            cycle,
            totalCycles: this.totalRounds,
            totalSecondsLeft
          });
        }
      }

      if (this.onTickCallback) {
        this.onTickCallback({
          phase,
          phaseProgress,
          remainingSec,
          cycle,
          totalCycles: this.totalRounds,
          totalSecondsLeft
        });
      }

      this.animFrameId = requestAnimationFrame(update);
    };

    this.animFrameId = requestAnimationFrame(update);
  }

  /**
   * Stops the breathing rest and audio
   */
  stopBreathingCycle() {
    this.isCycleRunning = false;
    this.currentPhase = 'idle';
    this.lastReportedPhase = null;

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.audio) {
      try {
        this.audio.pause();
        this.audio.currentTime = 0;
      } catch (e) {}
    }
  }

  /**
   * Soft two-partial bell marking the end of a rest (identical in both conditions)
   */
  async playChime() {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') await this.ctx.resume();

      const now = this.ctx.currentTime;
      const out = this.ctx.createGain();
      out.gain.setValueAtTime(0.0001, now);
      out.gain.exponentialRampToValueAtTime(0.35 * Math.max(this.volume, 0.05), now + 0.02);
      out.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);
      out.connect(this.ctx.destination);

      [528, 1056 * 1.5].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        g.gain.setValueAtTime(i === 0 ? 1 : 0.25, now);
        osc.connect(g);
        g.connect(out);
        osc.start(now);
        osc.stop(now + 3.6);
      });
    } catch (e) {
      console.warn('Chime playback failed:', e);
    }
  }

  /**
   * Seconds of rest actually completed in the most recent run
   */
  getElapsedSeconds() {
    return Math.round(this.elapsedSec);
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.audio) {
      this.audio.volume = this.volume;
    }
    if (this.isCycleRunning && this.mode === 'breathebeat' && this.volume === 0) {
      this.wasMuted = true;
    }
  }

  getVolume() {
    return this.volume;
  }
}

export const synth = new BreatheBeatAudio();
