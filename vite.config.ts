import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:5000',
      '/socket.io': {
        target: 'http://127.0.0.1:5000',
        ws: true
      },
      '/files': 'http://127.0.0.1:5000',
      '/health': 'http://127.0.0.1:5000'
    }
  },
  build: {
    outDir: path.resolve(__dirname, 'app/static'),
    emptyOutDir: false, // Prevent deleting other static items (like assets or icons)
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/index.tsx')
      },
      output: {
        entryFileNames: 'js/bundle.js',
        assetFileNames: '[ext]/[name].[ext]',
        chunkFileNames: 'js/[name].js'
      }
    }
  }
});
