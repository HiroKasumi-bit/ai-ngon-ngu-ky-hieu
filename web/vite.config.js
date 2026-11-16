import { defineConfig } from 'vite'

// Trên GitHub Pages, web nằm ở /<tên-repo>/ nên đặt BASE_PATH khi đóng gói (xem .github/workflows/deploy.yml).
export default defineConfig({
  base: process.env.BASE_PATH || '/',
})
