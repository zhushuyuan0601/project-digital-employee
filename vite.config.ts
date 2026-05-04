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
      '/api/claude-sessions': {
        target: 'http://127.0.0.1:18888',
        changeOrigin: true
      },
      '/api/activities': {
        target: 'http://127.0.0.1:18888',
        changeOrigin: true
      },
      '/api/chat': {
        target: 'http://127.0.0.1:18888',
        changeOrigin: true
      },
      '/api/agents': {
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
      '/api/analysis': {
        target: 'http://127.0.0.1:18888',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://127.0.0.1:18789',
        ws: true
      },
      // Mission Control API
      '/mc-api': {
        target: 'http://127.0.0.1:3100',
        changeOrigin: true
      },
      '/mc-login': {
        target: 'http://127.0.0.1:3100',
        changeOrigin: true
      },
      '/mc-events': {
        target: 'http://127.0.0.1:3100',
        changeOrigin: true
      },
      '/ai-api': {
        target: 'http://192.168.244.201:9091',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ai-api/, '/api/model/495f5ac4132a/v1'),
        headers: {
          'Authorization': 'Bearer xbgaoB4K9iQNETmoEg2j8Tu5HKxlxv8Odx3ak0vOIXne73jNlm3ePtTV46fKH2KtzmpC1pOjMzuDbgx2efueAPKUmdzxZLOaX5H0l9H1QYIdLsfXCjGN2x2VJEpumhnfHAfCoPFOnLqiUc3wdSG'
        }
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
