import path from 'path'
import { defineConfig } from '@lark-apaas/coding-preset-vite-react'
import { apiDevPlugin } from './server/vite-plugin-api'

export default defineConfig({
  plugins: [apiDevPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
})
