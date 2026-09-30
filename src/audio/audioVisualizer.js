/**
 * Real-Time Web Audio Oscilloscope and Frequency Spectrum Visualizer
 */

export class AudioVisualizer {
  constructor(canvasElement, analyserNode) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.analyser = analyserNode;
    this.animId = null;
    this.mode = 'wave'; // 'wave' | 'frequency'

    this.dataArray = null;
    this.bufferLength = 0;
    if (this.analyser) {
      this.bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(this.bufferLength);
    }
  }

  setAnalyser(analyserNode) {
    this.analyser = analyserNode;
    if (this.analyser) {
      this.bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(this.bufferLength);
    }
  }

  start() {
    if (this.animId) cancelAnimationFrame(this.animId);
    this.render();
  }

  stop() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    this.clear();
  }

  clear() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);
  }

  render = () => {
    this.animId = requestAnimationFrame(this.render);

    const { width, height } = this.canvas;
    this.ctx.fillStyle = 'rgba(7, 10, 19, 0.25)';
    this.ctx.fillRect(0, 0, width, height);

    if (!this.analyser || !this.dataArray) {
      // Draw idle meditative flatline
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
      this.ctx.beginPath();
      this.ctx.moveTo(0, height / 2);
      this.ctx.lineTo(width, height / 2);
      this.ctx.stroke();
      return;
    }

    if (this.mode === 'wave') {
      this.analyser.getByteTimeDomainData(this.dataArray);

      // Glowing golden Meend waveform
      this.ctx.lineWidth = 2.5;
      const gradient = this.ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, '#f59e0b');
      gradient.addColorStop(0.5, '#38bdf8');
      gradient.addColorStop(1, '#10b981');
      this.ctx.strokeStyle = gradient;

      this.ctx.shadowBlur = 12;
      this.ctx.shadowColor = '#f59e0b';

      this.ctx.beginPath();
      const sliceWidth = width / this.bufferLength;
      let x = 0;

      for (let i = 0; i < this.bufferLength; i++) {
        const v = this.dataArray[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      this.ctx.lineTo(width, height / 2);
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;
    } else {
      // Frequency Bars
      this.analyser.getByteFrequencyData(this.dataArray);
      const barWidth = (width / (this.bufferLength / 2)) * 1.5;
      let x = 0;

      for (let i = 0; i < this.bufferLength / 2; i++) {
        const barHeight = (this.dataArray[i] / 255) * height * 0.9;
        const hue = 35 + (i / (this.bufferLength / 2)) * 140;
        this.ctx.fillStyle = `hsl(${hue}, 85%, 55%)`;
        this.ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }
    }
  };
}
