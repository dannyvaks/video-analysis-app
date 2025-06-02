import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/services': path.resolve(__dirname, './src/services'),
    },
  },
  
  server: {
    port: 3000,
    open: true,
    host: true,
    cors: {
      origin: ['http://localhost:8000', 'http://127.0.0.1:8000'],
      credentials: true,
    },
  },
  
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts'],
          icons: ['lucide-react'],
        }
      }
    },
    chunkSizeWarningLimit: 500
  },
  
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'recharts',
      'lucide-react'
    ],
  },
  
  define: {
    global: 'globalThis',
    'process.env': {},
  },
})