/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '@ldesign/ppt-core' {
  export * from '../../packages/core/src'
}

declare module '@ldesign/ppt-vue' {
  export * from '../../packages/vue/src'
}
