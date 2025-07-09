import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // GitHub Pages configuration
  base: process.env.NODE_ENV === 'production' 
    ? '/routaran.github.io/' 
    : '/',
  
  // Path aliases
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  
  // Build optimization
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: process.env.NODE_ENV !== 'production',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          ui: ['clsx', 'tailwind-merge'],
        },
      },
    },
    // Performance optimizations
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
  },
  
  // Development server
  server: {
    port: 3000,
    host: true,
    open: true,
  },
  
  // Preview server (for production builds)
  preview: {
    port: 3001,
    host: true,
  },
  
  // Environment variables
  define: {
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(new Date().toISOString()),
  },
});