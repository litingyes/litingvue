import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'

export default defineConfig({
  build: {
    lib: {
      entry: './index.ts',
      formats: ['es', 'cjs'],
    },
  },
  plugins: [vue(), UnoCSS()],
})
