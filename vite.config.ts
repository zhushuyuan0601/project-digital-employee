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
      '/ws': {
        target: 'ws://127.0.0.1:18789',
        ws: true
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
          'utils': ['@vueuse/core', 'axios', 'pinia'],
          'element-plus': ['element-plus']
        }
      }
    }
  }
})
