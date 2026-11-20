import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

const page = p => fileURLToPath(new URL(p, import.meta.url))

// Trên GitHub Pages, web nằm ở /<tên-repo>/ nên đặt BASE_PATH khi đóng gói (xem .github/workflows/deploy.yml).
// Hai trang: app ở trang chủ, trang giới thiệu ở /gioi-thieu/ (chỉ trang này tải three.js).
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  build: { target: 'es2022', rollupOptions: { input: { app: page('index.html'), intro: page('gioi-thieu/index.html') } } },
})
