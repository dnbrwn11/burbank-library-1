import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Change 'burbank-cost-model' to your GitHub repo name
  base: '/burbank-library-1/',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
