import { defineConfig } from 'vite';

export default defineConfig({
  // Enables relative asset paths for seamless deployment to GitHub Pages, Vercel, or Netlify
  base: './',
  build: {
    outDir: 'dist'
  }
});
