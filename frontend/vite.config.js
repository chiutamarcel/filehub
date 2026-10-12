import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // Optional: add a src alias if you want
    },
  },
  plugins: [react()],
  server: {
    host: true,
    port: 6969,
    strictPort: true,
    watch: {
      usePolling: true
    }
  }
});