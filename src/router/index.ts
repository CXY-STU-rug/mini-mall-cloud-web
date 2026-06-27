import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/stores/user'

/**
 * 路由表 + 全局守卫 (C 端商城)
 *
 * 结构 (嵌套):
 *   /login /register            独立页, 不套布局
 *   / (MainLayout 京东风外壳)
 *     ├ ''            首页
 *     ├ category/:id  分类页
 *     ├ search        搜索结果
 *     ├ product/:id   商品详情
 *     ├ seckill       限时秒杀
 *     ├ cart          购物车           [需登录]
 *     ├ checkout      下单确认         [需登录]
 *     ├ pay/:orderNo  支付             [需登录]
 *     └ user (UserLayout 左菜单+右内容) [需登录]
 *         ├ profile  我的资料
 *         ├ orders / orders/:id  我的订单
 *         ├ address  收货地址
 *         ├ coupons  我的优惠券
 *         ├ favorites 我的收藏
 *         └ reviews  我的评价
 *
 * meta.requireAuth: 该页必须登录
 * meta.title:       浏览器标题 + 占位页文案
 *
 * WEB.0~7 已全部换成真页面, 不再用 Placeholder。
 */

const routes: RouteRecordRaw[] = [
  // ─── 独立页: 登录 / 注册 (WEB.2 完成) ───
  { path: '/login', component: () => import('@/views/Login.vue'), meta: { title: '登录' } },
  { path: '/register', component: () => import('@/views/Register.vue'), meta: { title: '注册' } },

  // ─── 主外壳 ───
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      { path: '', name: 'Home', component: () => import('@/views/Home.vue'), meta: { title: 'mini-mall 商城' } },

      { path: 'category/:id', component: () => import('@/views/Category.vue'), meta: { title: '分类' } },
      { path: 'search', component: () => import('@/views/Search.vue'), meta: { title: '搜索结果' } },
      { path: 'product/:id', component: () => import('@/views/Product.vue'), meta: { title: '商品详情' } },
      { path: 'seckill', component: () => import('@/views/Seckill.vue'), meta: { title: '限时秒杀' } },

      { path: 'cart', component: () => import('@/views/Cart.vue'), meta: { title: '购物车', requireAuth: true } },
      { path: 'checkout', component: () => import('@/views/Checkout.vue'), meta: { title: '确认订单', requireAuth: true } },
      { path: 'pay/:orderNo', component: () => import('@/views/Pay.vue'), meta: { title: '支付', requireAuth: true } },

      // ─── 个人中心 (套 UserLayout) ───
      {
        path: 'user',
        component: () => import('@/layouts/UserLayout.vue'),
        redirect: '/user/profile',
        meta: { requireAuth: true },
        children: [
          { path: 'profile', component: () => import('@/views/user/Profile.vue'), meta: { title: '我的资料', requireAuth: true } },
          { path: 'orders', component: () => import('@/views/user/Orders.vue'), meta: { title: '我的订单', requireAuth: true } },
          { path: 'orders/:id', component: () => import('@/views/user/OrderDetail.vue'), meta: { title: '订单详情', requireAuth: true } },
          { path: 'address', component: () => import('@/views/user/Address.vue'), meta: { title: '收货地址', requireAuth: true } },
          { path: 'coupons', component: () => import('@/views/user/Coupons.vue'), meta: { title: '我的优惠券', requireAuth: true } },
          { path: 'favorites', component: () => import('@/views/user/Favorites.vue'), meta: { title: '我的收藏', requireAuth: true } },
          { path: 'reviews', component: () => import('@/views/user/Reviews.vue'), meta: { title: '我的评价', requireAuth: true } }
        ]
      }
    ]
  },

  // 兜底: 不匹配的全跳首页
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// ─── 全局前置守卫 ───────────────────────────────
router.beforeEach((to) => {
  document.title = (to.meta.title as string) || 'mini-mall 商城'

  const userStore = useUserStore()
  const needAuth = to.matched.some(r => r.meta.requireAuth)

  if (!needAuth) return true

  // 需要登录但没 token → 跳登录, 记下原地址 (登录后跳回)
  if (!userStore.isLogin) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  return true
})

export default router
