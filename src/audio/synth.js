/**
 * BREATHEBEAT Audio Engine
 * Powered by high-fidelity acoustic audio: new_audio_sample.mpeg
 * Exact 12-second diaphragmatic breathing cycle (4s Inhale, 2s Hold, 6s Exhale) in Raga Bhupali
 */

export class BreatheBeatAudio {
  constructor() {
    this.audioSrc = new URL('../../new_audio_sample.mpeg', import.meta.url).href;
    this.audio = null;
    this.ctx = null;
    this.gainNode = null;
    this.analyser = null;
    this.isCycleRunning = false;
    this.volume = 0.8;
    this.currentCycle = 1;
    this.currentPhase = 'idle'; // 'inhale' | 'hold' | 'exhale' | 'idle'
    this.onPhaseChangeCallback = null;
    this.onTickCallback = null;
    this.animFrameId = null;
    this.lastReportedPhase = null;
    this.cycleStartTime = 0;
    this.lastLoopTime = 0;
    this.isInitialized = false;

    // Cycle duration configuration
    this.cycleLength = 12.0; // 4s + 2s + 6s
    this.inhaleLen = 4.0;
    this.holdLen = 2.0;
    this.exhaleLen = 6.0;
  }

  /**
   * Initializes audio elements and context on user gesture
   */
  async init() {
    if (this.isInitialized) return;

    try {
      this.audio = new Audio(this.audioSrc);
      this.audio.loop = true;
      this.audio.preload = 'auto';
      this.audio.volume = this.volume;

      // Web Audio API for frequency analysis / visualization support
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        try {
          const source = this.ctx.createMediaElementSource(this.audio);
          this.gainNode = this.ctx.createGain();
          this.gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
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
   * Starts or resumes the breathing audio loop and synchronized phase callbacks
   */
  async startBreathingCycle(onPhaseChange = null, onTick = null) {
    await this.init();

    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.onPhaseChangeCallback = onPhaseChange;
    this.onTickCallback = onTick;
    this.isCycleRunning = true;
    this.currentCycle = 1;
    this.lastReportedPhase = null;
    this.cycleStartTime = performance.now();
    this.lastLoopTime = 0;

    if (this.audio) {
      this.audio.currentTime = 0;
      try {
        await this.audio.play();
      } catch (e) {
        console.warn('Audio play request interrupted:', e);
      }
    }

    this._startSyncLoop();
  }

  /**
   * Continuous sync loop tracking exact playback time of new_audio_sample.mpeg
   */
  _startSyncLoop() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

    const update = () => {
      if (!this.isCycleRunning) return;

      let currentTime = 0;
      if (this.audio && !this.audio.paused && this.audio.duration) {
        currentTime = this.audio.currentTime % this.cycleLength;
      } else {
        // Fallback clock in case audio is loading
        currentTime = ((performance.now() - this.cycleStartTime) / 1000) % this.cycleLength;
      }

      // Check for cycle boundary / wrap-around
      if (currentTime < this.lastLoopTime && (this.lastLoopTime - currentTime) > 6.0) {
        this.currentCycle++;
      }
      this.lastLoopTime = currentTime;

      // Determine active breath phase
      let phase = 'inhale';
      let phaseTime = currentTime;
      let phaseDuration = this.inhaleLen;
      let label = 'Inhale';
      let subtext = 'Arohana Ascent (Sa → Sa′)';

      if (currentTime < this.inhaleLen) {
        phase = 'inhale';
        phaseTime = currentTime;
        phaseDuration = this.inhaleLen;
        label = 'Inhale';
        subtext = 'Arohana (Sa → Sa′)';
      } else if (currentTime < (this.inhaleLen + this.holdLen)) {
        phase = 'hold';
        phaseTime = currentTime - this.inhaleLen;
        phaseDuration = this.holdLen;
        label = 'Hold';
        subtext = 'Ga (Vadi Root Anchor)';
      } else {
        phase = 'exhale';
        phaseTime = currentTime - (this.inhaleLen + this.holdLen);
        phaseDuration = this.exhaleLen;
        label = 'Exhale';
        subtext = 'Avarohana (Sa′ → Sa)';
      }

      const phaseProgress = Math.min(Math.max(phaseTime / phaseDuration, 0), 1);
      const remainingSec = Math.max(0, Math.ceil(phaseDuration - phaseTime));

      // Trigger phase transition callback if phase changed
      if (phase !== this.lastReportedPhase) {
        this.lastReportedPhase = phase;
        this.currentPhase = phase;
        if (this.onPhaseChangeCallback) {
          this.onPhaseChangeCallback({
            phase,
            label,
            subtext,
            duration: phaseDuration,
            cycle: this.currentCycle
          });
        }
      }

      // Continuous tick for UI timers and smooth canvas sync
      if (this.onTickCallback) {
        this.onTickCallback({
          phase,
          phaseProgress,
          remainingSec,
          currentTime,
          cycle: this.currentCycle
        });
      }

      this.animFrameId = requestAnimationFrame(update);
    };

    this.animFrameId = requestAnimationFrame(update);
  }

  /**
   * Pauses the breathing cycle and audio
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
      } catch (e) {}
    }
  }

  /**
   * Adjusts volume smoothly across HTMLAudio and Web Audio gain
   */
  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.audio) {
      this.audio.volume = this.volume;
    }
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  getVolume() {
    return this.volume;
  }
}

export const synth = new BreatheBeatAudio();
