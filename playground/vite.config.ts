import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [
      // Core package alias - must come first
      {
        find: '@ldesign/ppt-core',
        replacement: resolve(__dirname, '../packages/core/src'),
      },
      // Vue package alias
      {
        find: '@ldesign/ppt-vue',
        replacement: resolve(__dirname, '../packages/vue/src'),
      },
    ],
  },
  optimizeDeps: {
    exclude: ['@ldesign/ppt-core', '@ldesign/ppt-vue'],
  },
  server: {
    port: 9999,
    open: true,
    host: true,
  },
})
