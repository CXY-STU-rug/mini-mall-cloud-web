import { createApp } from 'vue'
import './style.css'                         // ① 全局基础样式 + 电商红 CSS 变量
import App from './App.vue'

// ─── Element Plus ───────────────────────────
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'         // ② Element Plus 默认样式
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

// ─── 主题覆盖 (必须放在 element-plus/dist/index.css 之后才能盖住默认蓝) ───
import './styles/theme.css'                  // ③ 把 primary 改成电商红

// ─── Pinia / Router ─────────────────────────
import { createPinia } from 'pinia'
import router from './router'

const app = createApp(App)

// 注册所有 Element Plus 图标 (组件里直接 <el-icon><ShoppingCart/></el-icon>)
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component as any)
}

app.use(ElementPlus)
app.use(createPinia())    // ⭐ 必须在 router 之前: router 守卫里用了 Pinia store
app.use(router)

app.mount('#app')
