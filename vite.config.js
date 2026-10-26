import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      // 在线曲库代理：浏览器直连 iTunes 会被同源策略拦截，这里在 dev server 侧转发。
      '/api/itunes': {
        target: 'https://itunes.apple.com',
        changeOrigin: true,
        secure: true,
        timeout: 15000,
        rewrite: (path) => path.replace(/^\/api\/itunes/, ''),
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 2000,
  },
})
