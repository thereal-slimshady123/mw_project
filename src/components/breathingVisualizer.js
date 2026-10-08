/**
 * Minimalist Breathing Visualizer
 * Gentle, low-contrast, relaxing visual cue for participants.
 * Just a simple, soothing orb with "Breathe", "Hold", and "Exhale".
 */

export class BreathingVisualizer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.animId = null;

    this.phase = 'idle'; // 'inhale' | 'hold' | 'exhale' | 'idle'
    this.phaseStartTime = 0;
    this.phaseDuration = 4.0;
    this.progress = 0;
    this.directProgress = null;

    this.onResize();
    window.addEventListener('resize', () => this.onResize());
  }

  onResize() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);
      this.width = rect.width;
      this.height = rect.height;
    }
  }

  setPhase(phase, durationSec) {
    this.phase = phase;
    this.phaseDuration = durationSec;
    this.phaseStartTime = performance.now();
    this.directProgress = null;
  }

  setDirectProgress(phase, progress) {
    this.phase = phase;
    this.directProgress = progress;
  }

  start() {
    if (this.animId) cancelAnimationFrame(this.animId);
    this.phaseStartTime = performance.now();
    this.render();
  }

  stop() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    this.phase = 'idle';
    this.directProgress = null;
    this.renderFrame(0);
  }

  render = () => {
    this.animId = requestAnimationFrame(this.render);

    if (this.directProgress !== null) {
      this.progress = this.directProgress;
    } else {
      const now = performance.now();
      const elapsed = (now - this.phaseStartTime) / 1000;
      this.progress = Math.min(Math.max(elapsed / this.phaseDuration, 0), 1);
    }

    this.renderFrame(this.progress);
  };

  renderFrame(tProgress) {
    const w = this.width || (this.canvas.width / (window.devicePixelRatio || 1));
    const h = this.height || (this.canvas.height / (window.devicePixelRatio || 1));
    const cx = w / 2;
    const cy = h / 2;

    this.ctx.clearRect(0, 0, w, h);

    // Calculate calm, gentle breath expansion
    let breathScale = 0;
    let label = 'Breathe';
    let baseColor = 'rgba(226, 232, 240, '; // Soft muted warm slate

    if (this.phase === 'inhale') {
      const ease = 0.5 - Math.cos(tProgress * Math.PI) / 2;
      breathScale = ease;
      label = 'Breathe';
      baseColor = 'rgba(215, 228, 238, ';
    } else if (this.phase === 'hold') {
      breathScale = 1.0;
      label = 'Hold';
      baseColor = 'rgba(235, 230, 220, ';
    } else if (this.phase === 'exhale') {
      const ease = 0.5 + Math.cos(tProgress * Math.PI) / 2;
      breathScale = ease;
      label = 'Exhale';
      baseColor = 'rgba(218, 230, 222, ';
    } else {
      breathScale = 0.25;
      label = 'Breathe';
      baseColor = 'rgba(226, 232, 240, ';
    }

    const minRadius = Math.min(w, h) * 0.22;
    const maxRadius = Math.min(w, h) * 0.38;
    const currentRadius = minRadius + (maxRadius - minRadius) * breathScale;

    // Outer subtle ambient glow
    const ambientGrad = this.ctx.createRadialGradient(cx, cy, currentRadius * 0.3, cx, cy, currentRadius * 1.35);
    ambientGrad.addColorStop(0, baseColor + '0.10)');
    ambientGrad.addColorStop(0.6, baseColor + '0.03)');
    ambientGrad.addColorStop(1, 'rgba(8, 11, 19, 0)');
    this.ctx.fillStyle = ambientGrad;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, currentRadius * 1.35, 0, Math.PI * 2);
    this.ctx.fill();

    // Soft outer ring
    this.ctx.lineWidth = 1.0;
    this.ctx.strokeStyle = baseColor + '0.22)';
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, currentRadius, 0, Math.PI * 2);
    this.ctx.stroke();

    // Gentle central orb
    const coreGrad = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, currentRadius * 0.85);
    coreGrad.addColorStop(0, baseColor + '0.12)');
    coreGrad.addColorStop(0.8, baseColor + '0.04)');
    coreGrad.addColorStop(1, 'rgba(8, 11, 19, 0)');
    this.ctx.fillStyle = coreGrad;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, currentRadius * 0.85, 0, Math.PI * 2);
    this.ctx.fill();

    // Simple, calm typography: just "Breathe", "Hold", or "Exhale"
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = 'rgba(241, 245, 249, 0.85)';
    this.ctx.font = '400 19px "Outfit", sans-serif';
    this.ctx.letterSpacing = '0.05em';
    this.ctx.fillText(label, cx, cy);
  }
}
