<script setup lang="ts">
/**
 * 主布局 (京东风) — 商城绝大多数页面共用这一套外壳
 *
 * 结构 (从上到下):
 *   TopBar   顶部细条: 左欢迎语 / 右 登录注册·我的订单·客服
 *   Header   中部: 左 logo / 中 搜索框 / 右 购物车图标
 *   NavMenu  红底导航条: 分类入口横向排列
 *   <RouterView/>  内容区 (各页面塞这里, 居中 1200px)
 *   Footer   灰底页脚
 *
 * 数据:
 *   - 分类: 进来拉一次 /category/list 渲染导航条
 *   - 购物车徽章: 已登录就拉一次数量
 *   - 登录态: 看 userStore.isLogin 决定右上角显示什么
 */
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useCartStore } from '@/stores/cart'
import { listCategory, type Category } from '@/api/category'
import CartIcon from '@/components/CartIcon.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const cartStore = useCartStore()

// ─── 搜索框 ───────────────────────────────────
const keyword = ref('')

// 搜索框跟随路由: 在搜索页显示当前关键词, 一离开搜索页就自动清空
// immediate: 进页面立即对齐一次 (比如直接打开 /search?keyword=xx 也能回填)
watch(
  () => route.fullPath,
  () => {
    keyword.value = route.path === '/search' ? ((route.query.keyword as string) || '') : ''
  },
  { immediate: true }
)

function doSearch() {
  const kw = keyword.value.trim()
  if (!kw) return
  // 跳搜索结果页, 关键词放 query (WEB.3 做 Search.vue)
  router.push({ path: '/search', query: { keyword: kw } })
}

// 这些页有 position:fixed 的底部栏(购物车结算栏/结算页提交栏)
// → 给页脚留出底部空间, 避免页脚被固定栏盖住
const hasBottomBar = computed(() => ['/cart', '/checkout'].includes(route.path))

// 交易类页面(购物车/结算/支付)和个人中心不显示红底"首页+分类"导航条
// /pay/:orderNo 和 /user/* 都是变长路径, 用 startsWith 匹配前缀
const showNavMenu = computed(() =>
  !['/cart', '/checkout'].includes(route.path) &&
  !route.path.startsWith('/pay') &&
  !route.path.startsWith('/user')
)

// ─── 导航条分类 ───────────────────────────────
const categories = ref<Category[]>([])
async function loadCategories() {
  try {
    categories.value = await listCategory()
  } catch {
    // 分类拉不到不影响主页面, 静默
  }
}

// ─── 退出登录 ─────────────────────────────────
function logout() {
  userStore.logout()
  cartStore.reset()
  ElMessage.success('已退出登录')
  router.push('/')
}

onMounted(() => {
  loadCategories()
  cartStore.refreshCount()   // 已登录会拉数量, 未登录内部直接清零
})
</script>

<template>
  <div class="layout">
    <!-- ① 顶部细条 -->
    <div class="topbar">
      <div class="topbar-inner">
        <span class="welcome">欢迎来到 mini-mall 商城</span>
        <div class="topbar-right">
          <template v-if="userStore.isLogin">
            <span>你好, {{ userStore.userInfo?.nickname || userStore.userInfo?.username }}</span>
            <span class="divider">|</span>
            <RouterLink to="/user/orders">我的订单</RouterLink>
            <span class="divider">|</span>
            <RouterLink to="/user">个人中心</RouterLink>
            <span class="divider">|</span>
            <a href="javascript:void(0)" @click="logout">退出</a>
          </template>
          <template v-else>
            <RouterLink to="/login">登录</RouterLink>
            <span class="divider">|</span>
            <RouterLink to="/register">注册</RouterLink>
          </template>
          <span class="divider">|</span>
          <span>客服</span>
        </div>
      </div>
    </div>

    <!-- ② 中部: logo + 搜索 + 购物车 -->
    <div class="header">
      <div class="header-inner">
        <div class="logo" @click="router.push('/')">
          <span class="logo-mall">mini</span><span class="logo-cloud">mall</span>
        </div>

        <div class="search">
          <el-input
            v-model="keyword"
            placeholder="搜索商品, 回车试试"
            size="large"
            @keyup.enter="doSearch"
          >
            <template #append>
              <el-button type="primary" :icon="Search" @click="doSearch">搜索</el-button>
            </template>
          </el-input>
        </div>

        <div class="header-cart">
          <CartIcon />
        </div>
      </div>
    </div>

    <!-- ③ 红底导航条: 分类横向 (购物车等交易页隐藏) -->
    <div v-if="showNavMenu" class="navmenu">
      <div class="navmenu-inner">
        <RouterLink to="/" class="nav-item nav-home">首页</RouterLink>
        <RouterLink
          v-for="cat in categories"
          :key="cat.id"
          :to="`/category/${cat.id}`"
          class="nav-item"
        >
          {{ cat.name }}
        </RouterLink>
      </div>
    </div>

    <!-- ④ 内容区 -->
    <main class="content">
      <RouterView />
    </main>

    <!-- ⑤ 页脚 -->
    <footer class="footer" :class="{ 'with-bottom-bar': hasBottomBar }">
      <div class="footer-links">
        <span>关于我们</span><span>联系客服</span><span>配送方式</span>
        <span>支付方式</span><span>售后服务</span>
      </div>
      <div class="footer-copy">
        mini-mall-cloud · 教学项目 · 仅供学习 · © 2026
      </div>
    </footer>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* 通用: 内容居中, 最大 1200px */
.topbar-inner,
.header-inner,
.navmenu-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
}

/* ① 顶部细条 */
.topbar {
  height: 32px;
  background: #f7f7f7;
  border-bottom: 1px solid var(--border);
  font-size: 12px;
  color: var(--text-secondary);
}
.topbar-inner {
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.topbar-right {
  display: flex;
  align-items: center;
  gap: 6px;
}
.topbar-right a {
  color: var(--text-secondary);
}
.topbar-right a:hover {
  color: var(--primary);
}
.divider {
  color: var(--border);
}

/* ② Header */
.header {
  background: var(--bg-header);
}
.header-inner {
  height: 90px;
  display: flex;
  align-items: center;
  gap: 24px;
}
.logo {
  font-size: 30px;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
  letter-spacing: -1px;
}
.logo-mall {
  color: var(--primary);
}
.logo-cloud {
  color: var(--text-primary);
}
.search {
  flex: 1;
  max-width: 600px;
}
.header-cart {
  margin-left: auto;
}

/* ③ 红底导航 */
.navmenu {
  background: var(--primary);
}
.navmenu-inner {
  height: 42px;
  display: flex;
  align-items: center;
  gap: 4px;
  overflow-x: auto;
}
.nav-item {
  color: #fff;
  padding: 0 16px;
  line-height: 42px;
  white-space: nowrap;
  font-size: 14px;
  transition: background 0.2s;
}
.nav-item:hover {
  background: var(--primary-dark);
}
.nav-home {
  font-weight: 700;
  background: var(--primary-dark);
}

/* ④ 内容区 */
.content {
  flex: 1;
  max-width: 1200px;
  width: 100%;
  margin: 16px auto;
  padding: 0 16px;
}

/* ⑤ 页脚 */
.footer {
  background: #fff;
  border-top: 1px solid var(--border);
  padding: 24px 16px;
  text-align: center;
}
/* 购物车/结算页有固定底栏, 页脚多留出底部空间避免被盖 */
.footer.with-bottom-bar {
  padding-bottom: 84px;
}
.footer-links {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--text-regular);
}
.footer-links span {
  cursor: pointer;
}
.footer-links span:hover {
  color: var(--primary);
}
.footer-copy {
  font-size: 12px;
  color: var(--text-placeholder);
}
</style>
