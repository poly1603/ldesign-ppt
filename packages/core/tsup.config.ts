import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'parser/index': 'src/parser/index.ts',
    'renderer/index': 'src/renderer/index.ts',
    'animation/index': 'src/animation/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: true,
  treeshake: true,
  minify: false,
  external: [],
})
