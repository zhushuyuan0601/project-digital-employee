import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import ElementPlus from 'unplugin-element-plus/vite'

export default defineConfig({
  plugins: [
    vue(),
    ElementPlus({
      importStyle: false,
      useSource: true
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api/files': {
        target: 'http://127.0.0.1:18888',
        changeOrigin: true
      },
      '/api/file': {
        target: 'http://127.0.0.1:18888',
        changeOrigin: true
      },
      '/api/tools': {
        target: 'http://127.0.0.1:18888',
        changeOrigin: true
      },
      '/api/dashboard': {
        target: 'http://localhost:18888',
        changeOrigin: true
      },
      '/api/activities': {
        target: 'http://127.0.0.1:18888',
        changeOrigin: true
      },
      '/api/tasks': {
        target: 'http://127.0.0.1:18888',
        changeOrigin: true
      },
      '/api/subtasks': {
        target: 'http://127.0.0.1:18888',
        changeOrigin: true
      },
      '/api/runtime': {
        target: 'http://127.0.0.1:18888',
        changeOrigin: true
      },
      '/api/runs': {
        target: 'http://127.0.0.1:18888',
        changeOrigin: true
      },
      '/api/group-chat': {
        target: 'http://127.0.0.1:18888',
        changeOrigin: true
      },
      '/api/mail': {
        target: 'http://127.0.0.1:18888',
        changeOrigin: true
      },
      '/api/analysis': {
        target: 'http://127.0.0.1:18888',
        changeOrigin: true
      },
      '/ai-api': {
        target: process.env.VITE_AI_API_BASE_URL || 'http://127.0.0.1:9091',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ai-api/, '/api/model/495f5ac4132a/v1'),
        headers: process.env.VITE_AI_API_TOKEN ? { Authorization: `Bearer ${process.env.VITE_AI_API_TOKEN}` } : undefined
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['vue', 'vue-router'],
          'utils': ['@vueuse/core', 'pinia'],
          'element-plus': ['element-plus']
        }
      }
    }
  }
})
