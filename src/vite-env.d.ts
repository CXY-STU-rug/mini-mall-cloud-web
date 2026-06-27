/// <reference types="vite/client" />

// 让 TypeScript 认识 .vue 文件 (否则 import xxx.vue 会报"找不到模块")
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
