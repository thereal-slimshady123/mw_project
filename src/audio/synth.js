/**
 * BREATHEBEAT Web Audio Synthesizer Engine
 * 
 * Features:
 * 1. Warm multi-string Tanpura drone (Sa - Pa) with subtle jawari harmonics
 * 2. Raga Bhupali Meend (Continuous Glides) timed to 4-2-6 breathing:
 *    - Inhale (4s Arohana): Sa -> Re -> Ga -> Pa -> Dha -> Sa' (swell)
 *    - Hold (2s Kumbhaka): Steady sustain on Ga (Vadi / resting note)
 *    - Exhale (6s Avarohana): Sa' -> Dha -> Pa -> Ga -> Re -> Sa (taper)
 * 3. Spoken Guide pacing arm (Calm synthetic voice)
 * 4. Silent Rest arm with gentle singing bowl / meditation chime
 */

export class BreatheBeatSynth {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.droneGain = null;
    this.meendGain = null;
    this.analyser = null;
    
    // Tanpura Drone oscillators
    this.droneNodes = [];
    this.isDroneActive = false;
    
    // Meend Lead nodes
    this.leadOsc1 = null;
    this.leadOsc2 = null;
    this.leadGain = null;
    this.leadFilter = null;
    
    // Base frequency: Sa = C4 (261.63 Hz), Tanpura Sa = C3 (130.81 Hz)
    this.basePitch = 261.63; // C4
    
    // Raga Bhupali Scale ratios (Just Intonation / Equal Temperament intervals)
    // Sa, Re (Major 2nd), Ga (Major 3rd - Vadi), Pa (Perfect 5th), Dha (Major 6th), Sa' (Octave)
    this.ragaNotes = {
      Sa: 261.63,      // C4
      Re: 293.66,      // D4
      Ga: 329.63,      // E4 (Vadi - Natural resting note)
      Pa: 392.00,      // G4
      Dha: 440.00,     // A4
      SaUpper: 523.25  // C5 (Sa')
    };

    // Breath cycle parameters (seconds)
    this.cycleConfig = {
      inhale: 4.0,
      hold: 2.0,
      exhale: 6.0
    };

    this.activeArm = 'breathebeat'; // 'breathebeat' | 'spoken' | 'silent'
    this.isCycleRunning = false;
    this.cycleTimeoutId = null;
    this.onPhaseChangeCallback = null;
    this.currentPhase = 'idle'; // 'inhale' | 'hold' | 'exhale' | 'idle'
  }

  /**
   * Initializes Web Audio Context upon user interaction
   */
  async init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      // Master output gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

      // Drone sub-bus
      this.droneGain = this.ctx.createGain();
      this.droneGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.droneGain.connect(this.masterGain);

      // Meend lead sub-bus
      this.meendGain = this.ctx.createGain();
      this.meendGain.gain.setValueAtTime(0.65, this.ctx.currentTime);
      this.meendGain.connect(this.masterGain);

      // Master Analyser Node for visual spectrum / oscilloscope
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.8;
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  /**
   * Tanpura Drone Synthesizer:
   * 4 strings:
   * 1. Pa (196 Hz) - G3
   * 2. Sa' (261.63 Hz) - C4
   * 3. Sa' (261.63 + 1.2 Hz detune) - Shimmering chorus
   * 4. Kharaj Sa (130.81 Hz / 65.4 Hz) - Deep fundamental C3/C2
   */
  startTanpuraDrone() {
    if (!this.ctx || this.isDroneActive) return;

    const t = this.ctx.currentTime;
    const droneFreqs = [
      { freq: this.basePitch * (3 / 4), type: 'sine', gain: 0.15, lfoRate: 0.12 }, // Pa (G3)
      { freq: this.basePitch, type: 'triangle', gain: 0.18, lfoRate: 0.15 },         // Sa (C4)
      { freq: this.basePitch * 1.004, type: 'sine', gain: 0.14, lfoRate: 0.18 },     // Sa detuned (Jawari buzz)
      { freq: this.basePitch / 2, type: 'sine', gain: 0.25, lfoRate: 0.08 }          // Low Kharaj Sa (C3)
    ];

    this.droneNodes = [];

    // Warm filter for drone body resonance
    const droneFilter = this.ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.setValueAtTime(950, t);
    droneFilter.Q.setValueAtTime(2.0, t);
    droneFilter.connect(this.droneGain);

    droneFreqs.forEach((spec) => {
      const osc = this.ctx.createOscillator();
      const nodeGain = this.ctx.createGain();

      osc.type = spec.type;
      osc.frequency.setValueAtTime(spec.freq, t);

      // Subtle LFO amplitude modulation for natural rhythmic strumming swell
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(spec.lfoRate, t);
      lfoGain.gain.setValueAtTime(spec.gain * 0.25, t);

      lfo.connect(lfoGain.gain);
      nodeGain.gain.setValueAtTime(spec.gain, t);

      osc.connect(nodeGain);
      nodeGain.connect(droneFilter);

      osc.start(t);
      lfo.start(t);

      this.droneNodes.push({ osc, lfo, nodeGain, filter: droneFilter });
    });

    this.isDroneActive = true;
  }

  stopTanpuraDrone(fadeSec = 1.0) {
    if (!this.ctx || !this.isDroneActive) return;
    const t = this.ctx.currentTime;

    this.droneGain.gain.linearRampToValueAtTime(0.001, t + fadeSec);
    setTimeout(() => {
      this.droneNodes.forEach(node => {
        try {
          node.osc.stop();
          node.lfo.stop();
          node.osc.disconnect();
          node.lfo.disconnect();
        } catch (e) { /* ignore */ }
      });
      this.droneNodes = [];
      this.isDroneActive = false;
      if (this.droneGain) {
        this.droneGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      }
    }, fadeSec * 1000);
  }

  /**
   * Generates continuous pitch sweeps (Meend) and sustained notes in Raga Bhupali
   */
  startMeendLead() {
    if (this.leadOsc1) return;
    const t = this.ctx.currentTime;

    // Dual oscillator for rich, fluty Indian Bansuri / Sarangi timbre
    this.leadOsc1 = this.ctx.createOscillator();
    this.leadOsc1.type = 'sine';
    this.leadOsc1.frequency.setValueAtTime(this.ragaNotes.Sa, t);

    this.leadOsc2 = this.ctx.createOscillator();
    this.leadOsc2.type = 'triangle';
    this.leadOsc2.frequency.setValueAtTime(this.ragaNotes.Sa, t);

    // Warm formant lowpass filter
    this.leadFilter = this.ctx.createBiquadFilter();
    this.leadFilter.type = 'lowpass';
    this.leadFilter.frequency.setValueAtTime(1400, t);
    this.leadFilter.Q.setValueAtTime(1.5, t);

    this.leadGain = this.ctx.createGain();
    this.leadGain.gain.setValueAtTime(0.001, t);

    // Subtle detune between oscillators
    this.leadOsc2.detune.setValueAtTime(3.5, t);

    this.leadOsc1.connect(this.leadFilter);
    this.leadOsc2.connect(this.leadFilter);
    this.leadFilter.connect(this.leadGain);
    this.leadGain.connect(this.meendGain);

    this.leadOsc1.start(t);
    this.leadOsc2.start(t);
  }

  stopMeendLead() {
    if (!this.leadOsc1) return;
    try {
      this.leadOsc1.stop();
      this.leadOsc2.stop();
      this.leadOsc1.disconnect();
      this.leadOsc2.disconnect();
    } catch (e) {}
    this.leadOsc1 = null;
    this.leadOsc2 = null;
    this.leadGain = null;
    this.leadFilter = null;
  }

  /**
   * Sonified Inhale (4s - Arohana):
   * Continuous ascending pitch sweep: Sa -> Re -> Ga -> Pa -> Dha -> Sa'
   * Swelling volume envelope
   */
  sonifyInhale(duration = 4.0) {
    if (!this.leadOsc1 || !this.leadGain) return;
    const t = this.ctx.currentTime;

    // Gain swell: gentle rise to full breath peak
    this.leadGain.gain.cancelScheduledValues(t);
    this.leadGain.gain.setValueAtTime(Math.max(this.leadGain.gain.value, 0.05), t);
    this.leadGain.gain.linearRampToValueAtTime(0.48, t + duration * 0.85);
    this.leadGain.gain.linearRampToValueAtTime(0.42, t + duration);

    // Continuous Meend pitch glide through pentatonic waypoints
    const { Sa, Re, Ga, Pa, Dha, SaUpper } = this.ragaNotes;
    const stepTime = duration / 5;

    [this.leadOsc1, this.leadOsc2].forEach(osc => {
      osc.frequency.cancelScheduledValues(t);
      osc.frequency.setValueAtTime(Sa, t);
      osc.frequency.exponentialRampToValueAtTime(Re, t + stepTime * 1);
      osc.frequency.exponentialRampToValueAtTime(Ga, t + stepTime * 2);
      osc.frequency.exponentialRampToValueAtTime(Pa, t + stepTime * 3);
      osc.frequency.exponentialRampToValueAtTime(Dha, t + stepTime * 4);
      osc.frequency.exponentialRampToValueAtTime(SaUpper, t + duration);
    });
  }

  /**
   * Sonified Hold (2s - Kumbhaka):
   * Pitch pauses and sustains steadily on the dominant root note (Ga - Vadi)
   * Anchors breath retention without tension
   */
  sonifyHold(duration = 2.0) {
    if (!this.leadOsc1 || !this.leadGain) return;
    const t = this.ctx.currentTime;
    const { Ga } = this.ragaNotes;

    // Smooth slide into the Vadi note (Ga)
    [this.leadOsc1, this.leadOsc2].forEach(osc => {
      osc.frequency.cancelScheduledValues(t);
      osc.frequency.exponentialRampToValueAtTime(Ga, t + 0.18);
      osc.frequency.setValueAtTime(Ga, t + duration);
    });

    // Sustained calm volume
    this.leadGain.gain.cancelScheduledValues(t);
    this.leadGain.gain.setValueAtTime(Math.max(this.leadGain.gain.value, 0.25), t);
    this.leadGain.gain.linearRampToValueAtTime(0.35, t + 0.2);
    this.leadGain.gain.setValueAtTime(0.35, t + duration);
  }

  /**
   * Sonified Exhale (6s - Avarohana):
   * Gentle descending glide: Sa' -> Dha -> Pa -> Ga -> Re -> Sa
   * Tapering volume to prompt complete, relaxed release
   */
  sonifyExhale(duration = 6.0) {
    if (!this.leadOsc1 || !this.leadGain) return;
    const t = this.ctx.currentTime;
    const { Sa, Re, Ga, Pa, Dha, SaUpper } = this.ragaNotes;
    const stepTime = duration / 5;

    // Continuous descending Meend
    [this.leadOsc1, this.leadOsc2].forEach(osc => {
      osc.frequency.cancelScheduledValues(t);
      osc.frequency.setValueAtTime(SaUpper, t);
      osc.frequency.exponentialRampToValueAtTime(Dha, t + stepTime * 1);
      osc.frequency.exponentialRampToValueAtTime(Pa, t + stepTime * 2);
      osc.frequency.exponentialRampToValueAtTime(Ga, t + stepTime * 3);
      osc.frequency.exponentialRampToValueAtTime(Re, t + stepTime * 4);
      osc.frequency.exponentialRampToValueAtTime(Sa, t + duration);
    });

    // Gentle volume taper
    this.leadGain.gain.cancelScheduledValues(t);
    this.leadGain.gain.setValueAtTime(Math.max(this.leadGain.gain.value, 0.35), t);
    this.leadGain.gain.exponentialRampToValueAtTime(0.08, t + duration * 0.9);
    this.leadGain.gain.linearRampToValueAtTime(0.04, t + duration);
  }

  /**
   * Arm 2: Spoken Guide (Voice Arm)
   * Calming synthetic voice counting pace markers
   */
  speakCue(phase, duration) {
    if (!('speechSynthesis' in window)) {
      this.playSyntheticVoiceChime(phase);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      let text = '';
      if (phase === 'inhale') {
        text = 'Inhale... two... three... four';
      } else if (phase === 'hold') {
        text = 'Hold... two';
      } else if (phase === 'exhale') {
        text = 'Exhale... two... three... four... five... six';
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.85;
      utterance.pitch = 0.95;
      utterance.volume = 0.8;
      
      // Select an English voice if available
      const voices = window.speechSynthesis.getVoices();
      const naturalVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Zira') || v.name.includes('Samantha')));
      if (naturalVoice) utterance.voice = naturalVoice;

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error, fallback to tones:', e);
    }
  }

  playSyntheticVoiceChime(phase) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(phase === 'inhale' ? 330 : phase === 'hold' ? 440 : 220, t);
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.8);
  }

  /**
   * Arm 1: Silent Rest (Control Arm)
   * Tibetan Singing Bowl / Meditation Chime for start and end
   */
  playTibetanBowl(fundamental = 432, duration = 4.0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const harmonics = [
      { mult: 1.0, gain: 0.35, decay: duration },
      { mult: 2.76, gain: 0.18, decay: duration * 0.75 },
      { mult: 4.82, gain: 0.12, decay: duration * 0.5 },
      { mult: 5.4, gain: 0.08, decay: duration * 0.4 }
    ];

    harmonics.forEach(h => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(fundamental * h.mult, t);

      g.gain.setValueAtTime(h.gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + h.decay);

      osc.connect(g);
      g.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + h.decay);
    });
  }

  /**
   * Starts the 4-2-6 breathing cycle loop based on the active condition arm
   */
  startBreathingCycle(arm = 'breathebeat', onPhaseChange = null) {
    this.activeArm = arm;
    this.onPhaseChangeCallback = onPhaseChange;
    this.isCycleRunning = true;

    if (this.activeArm === 'breathebeat') {
      this.startTanpuraDrone();
      this.startMeendLead();
    } else if (this.activeArm === 'silent') {
      this.playTibetanBowl(432, 4.0); // Session opening chime
    }

    this._runPhase('inhale');
  }

  _runPhase(phase) {
    if (!this.isCycleRunning) return;

    this.currentPhase = phase;
    const { inhale, hold, exhale } = this.cycleConfig;

    if (phase === 'inhale') {
      if (this.onPhaseChangeCallback) {
        this.onPhaseChangeCallback({
          phase: 'inhale',
          duration: inhale,
          label: 'Inhale (Arohana)',
          subtext: '4s Inhalation — Mirrored Chest Expansion',
          notes: 'Sa → Re → Ga → Pa → Dha → Sa′'
        });
      }

      if (this.activeArm === 'breathebeat') {
        this.sonifyInhale(inhale);
      } else if (this.activeArm === 'spoken') {
        this.speakCue('inhale', inhale);
      }

      this.cycleTimeoutId = setTimeout(() => {
        this._runPhase('hold');
      }, inhale * 1000);

    } else if (phase === 'hold') {
      if (this.onPhaseChangeCallback) {
        this.onPhaseChangeCallback({
          phase: 'hold',
          duration: hold,
          label: 'Hold (Kumbhaka)',
          subtext: '2s Breath Retention — Stillness & Center',
          notes: 'Ga (Vadi resting root note)'
        });
      }

      if (this.activeArm === 'breathebeat') {
        this.sonifyHold(hold);
      } else if (this.activeArm === 'spoken') {
        this.speakCue('hold', hold);
      }

      this.cycleTimeoutId = setTimeout(() => {
        this._runPhase('exhale');
      }, hold * 1000);

    } else if (phase === 'exhale') {
      if (this.onPhaseChangeCallback) {
        this.onPhaseChangeCallback({
          phase: 'exhale',
          duration: exhale,
          label: 'Exhale (Avarohana)',
          subtext: '6s Controlled Release — Parasympathetic Calming',
          notes: 'Sa′ → Dha → Pa → Ga → Re → Sa'
        });
      }

      if (this.activeArm === 'breathebeat') {
        this.sonifyExhale(exhale);
      } else if (this.activeArm === 'spoken') {
        this.speakCue('exhale', exhale);
      }

      this.cycleTimeoutId = setTimeout(() => {
        this._runPhase('inhale');
      }, exhale * 1000);
    }
  }

  /**
   * Stops breathing cycle and audio
   */
  stopBreathingCycle() {
    this.isCycleRunning = false;
    this.currentPhase = 'idle';
    if (this.cycleTimeoutId) {
      clearTimeout(this.cycleTimeoutId);
      this.cycleTimeoutId = null;
    }

    if (this.activeArm === 'breathebeat') {
      this.stopTanpuraDrone(1.2);
      this.stopMeendLead();
    } else if (this.activeArm === 'silent') {
      this.playTibetanBowl(540, 3.5); // Session closing chime
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Plays a single note for testing/interactive keyboard
   */
  playSingleNote(noteKey, duration = 1.0) {
    if (!this.ctx) return;
    const freq = this.ragaNotes[noteKey];
    if (!freq) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.3, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(g);
    g.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + duration);
  }

  setMasterVolume(val) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(val, this.ctx.currentTime);
    }
  }

  setDroneVolume(val) {
    if (this.droneGain && this.ctx) {
      this.droneGain.gain.setValueAtTime(val, this.ctx.currentTime);
    }
  }

  setMeendVolume(val) {
    if (this.meendGain && this.ctx) {
      this.meendGain.gain.setValueAtTime(val, this.ctx.currentTime);
    }
  }
}

export const synth = new BreatheBeatSynth();
