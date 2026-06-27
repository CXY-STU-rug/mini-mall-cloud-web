import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],

  // ─── 路径别名: @ → src ────────────────────────
  // 之后 import 写 "@/api/http" 就等于 "src/api/http"
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },

  // ─── 开发服务器 ───────────────────────────────
  // server.proxy: 前端 axios 请求 /api/xxx → Vite 转发到 http://localhost:9080/xxx
  // 这样开发期不用关心 CORS, 部署到生产时改 nginx 反代即可
  // 端口 5174: 跟 admin 的 5173 错开, 两个前端可以同时开
  server: {
    host: '0.0.0.0',
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:9080',   // mini-mall 网关
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')    // 去掉 /api 前缀再转发
      }
    }
  }
})
