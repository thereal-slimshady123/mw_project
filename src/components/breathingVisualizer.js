/**
 * Dynamic 4-2-6 Breathing Visualizer
 * Features:
 * - Fluid Sacred Geometry / Lotus Mandala with multi-layered glowing rings
 * - Reactive Particle Field: Inwards flow during Inhale, drift during Hold, outwards dispersal during Exhale
 * - Synchronized with Raga Bhupali Arohana / Kumbhaka / Avarohana
 */

export class BreathingVisualizer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.animId = null;

    this.phase = 'idle'; // 'inhale' | 'hold' | 'exhale' | 'idle'
    this.phaseStartTime = 0;
    this.phaseDuration = 4.0;
    this.progress = 0; // 0.0 to 1.0

    // Particle field
    this.numParticles = 75;
    this.particles = [];
    this.initParticles();

    this.onResize();
    window.addEventListener('resize', () => this.onResize());
  }

  onResize() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      this.canvas.width = rect.width * window.devicePixelRatio;
      this.canvas.height = rect.height * window.devicePixelRatio;
      this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      this.width = rect.width;
      this.height = rect.height;
    }
  }

  initParticles() {
    this.particles = [];
    for (let i = 0; i < this.numParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 160;
      this.particles.push({
        angle,
        dist,
        baseDist: dist,
        size: 1.2 + Math.random() * 2.5,
        speed: 0.005 + Math.random() * 0.012,
        opacity: 0.2 + Math.random() * 0.6,
        hue: 35 + Math.random() * 30 // Warm gold to amber
      });
    }
  }

  setPhase(phase, durationSec) {
    this.phase = phase;
    this.phaseDuration = durationSec;
    this.phaseStartTime = performance.now();
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
    this.renderFrame(0);
  }

  render = () => {
    this.animId = requestAnimationFrame(this.render);

    const now = performance.now();
    const elapsed = (now - this.phaseStartTime) / 1000;
    this.progress = Math.min(Math.max(elapsed / this.phaseDuration, 0), 1);

    this.renderFrame(this.progress);
  };

  renderFrame(tProgress) {
    const w = this.width || this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.height || this.canvas.height / (window.devicePixelRatio || 1);
    const cx = w / 2;
    const cy = h / 2;

    this.ctx.clearRect(0, 0, w, h);

    // Calculate breath expansion scale (0 = relaxed empty, 1 = full lungs)
    let breathScale = 0;
    let glowColor = 'rgba(245, 158, 11, ';
    let primaryAccent = '#f59e0b'; // Amber

    if (this.phase === 'inhale') {
      // Inhale expands smoothly (ease-in-out)
      const ease = 0.5 - Math.cos(tProgress * Math.PI) / 2;
      breathScale = ease;
      glowColor = 'rgba(56, 189, 248, '; // Expanding sky blue/cyan
      primaryAccent = '#38bdf8';
    } else if (this.phase === 'hold') {
      // Hold stays at peak with subtle heartbeat pulse
      const pulse = Math.sin(tProgress * Math.PI * 4) * 0.03;
      breathScale = 1.0 + pulse;
      glowColor = 'rgba(245, 158, 11, '; // Golden center of Ga (Vadi)
      primaryAccent = '#f59e0b';
    } else if (this.phase === 'exhale') {
      // Exhale contracts gently
      const ease = 0.5 + Math.cos(tProgress * Math.PI) / 2;
      breathScale = ease;
      glowColor = 'rgba(16, 185, 129, '; // Calming emerald
      primaryAccent = '#10b981';
    } else {
      breathScale = 0.2 + Math.sin(performance.now() * 0.002) * 0.05;
      glowColor = 'rgba(245, 158, 11, ';
      primaryAccent = '#f59e0b';
    }

    const minRadius = Math.min(w, h) * 0.16;
    const maxRadius = Math.min(w, h) * 0.38;
    const currentRadius = minRadius + (maxRadius - minRadius) * breathScale;

    // Outer subtle ambient glow
    const ambientGrad = this.ctx.createRadialGradient(cx, cy, currentRadius * 0.2, cx, cy, currentRadius * 1.5);
    ambientGrad.addColorStop(0, glowColor + '0.22)');
    ambientGrad.addColorStop(0.5, glowColor + '0.08)');
    ambientGrad.addColorStop(1, 'rgba(7, 10, 19, 0)');
    this.ctx.fillStyle = ambientGrad;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, currentRadius * 1.6, 0, Math.PI * 2);
    this.ctx.fill();

    // Render Particle Swarm
    this.particles.forEach(p => {
      p.angle += p.speed;
      let targetDist = p.baseDist;

      if (this.phase === 'inhale') {
        // Particles pulled inwards toward core
        targetDist = p.baseDist * (1.2 - tProgress * 0.5);
      } else if (this.phase === 'exhale') {
        // Particles drift outward peacefully
        targetDist = p.baseDist * (0.7 + tProgress * 0.7);
      }

      p.dist += (targetDist - p.dist) * 0.05;
      const px = cx + Math.cos(p.angle) * p.dist;
      const py = cy + Math.sin(p.angle) * p.dist;

      this.ctx.fillStyle = `hsla(${p.hue}, 90%, 65%, ${p.opacity * (0.4 + breathScale * 0.6)})`;
      this.ctx.beginPath();
      this.ctx.arc(px, py, p.size * (0.8 + breathScale * 0.4), 0, Math.PI * 2);
      this.ctx.fill();
    });

    // Outer Geometric Petals / Sacred Lotus Rings
    const numPetals = 8;
    const rotOffset = performance.now() * 0.0003;

    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.rotate(rotOffset);

    for (let i = 0; i < numPetals; i++) {
      const angle = (i * Math.PI * 2) / numPetals;
      const petalDist = currentRadius * 0.65;
      const petalX = Math.cos(angle) * petalDist;
      const petalY = Math.sin(angle) * petalDist;
      const petalRadius = currentRadius * 0.5;

      this.ctx.strokeStyle = glowColor + '0.25)';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.arc(petalX, petalY, petalRadius, 0, Math.PI * 2);
      this.ctx.stroke();
    }
    this.ctx.restore();

    // Secondary Pulsing Concentric Rings
    this.ctx.lineWidth = 2.0;
    this.ctx.strokeStyle = glowColor + '0.45)';
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, currentRadius * 0.82, 0, Math.PI * 2);
    this.ctx.stroke();

    // Main Glowing Ring
    this.ctx.lineWidth = 3.5;
    this.ctx.shadowBlur = 18;
    this.ctx.shadowColor = primaryAccent;
    this.ctx.strokeStyle = primaryAccent;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, currentRadius, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;

    // Glowing Core Orb with dynamic gradient
    const coreGrad = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, currentRadius * 0.55);
    coreGrad.addColorStop(0, primaryAccent);
    coreGrad.addColorStop(0.4, glowColor + '0.65)');
    coreGrad.addColorStop(1, glowColor + '0.05)');
    this.ctx.fillStyle = coreGrad;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, currentRadius * 0.55, 0, Math.PI * 2);
    this.ctx.fill();

    // Center Vadi Note / Phase Indicator text in canvas
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '600 18px "Outfit", sans-serif';

    let centerLabel = 'BREATHE';
    let subLabel = '4-2-6 Bhupali';
    if (this.phase === 'inhale') {
      centerLabel = 'INHALE';
      subLabel = 'Arohana (Sa → Sa′)';
    } else if (this.phase === 'hold') {
      centerLabel = 'HOLD';
      subLabel = 'Ga (Vadi Root)';
    } else if (this.phase === 'exhale') {
      centerLabel = 'EXHALE';
      subLabel = 'Avarohana (Sa′ → Sa)';
    }

    this.ctx.fillText(centerLabel, cx, cy - 8);
    this.ctx.font = '400 12px "JetBrains Mono", monospace';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    this.ctx.fillText(subLabel, cx, cy + 14);
  }
}
