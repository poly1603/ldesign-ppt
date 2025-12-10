import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  external: ['vue', '@ldesign/ppt-core'],
  treeshake: true,
  splitting: false,
  sourcemap: true,
  minify: false,
})
