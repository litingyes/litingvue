import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: ['./src/release.js'],
      formats: ['cjs'],
    },
  },
})
