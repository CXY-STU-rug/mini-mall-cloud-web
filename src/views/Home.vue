<script setup lang="ts">
/**
 * 首页 — WEB.3
 *
 * 四块:
 *   ① 轮播 banner (el-carousel, 纯色占位图; 带 link 的可点跳转)
 *   ② 快捷入口 (限时秒杀 → /seckill, 领券中心 → /user/coupons?tab=center)
 *   ③ 分类快捷入口 (横排图标, 点了跳 /category/:id)
 *   ④ 热销商品网格 (调 /product 拉一页, 按销量看着像"热销")
 *
 * 数据来源:
 *   分类  → listCategory()        (category.ts)
 *   商品  → pageProducts({size}) (product.ts)
 * 两个请求并行发 (Promise.all), 谁先回来不影响。
 */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { listCategory, type Category } from '@/api/category'
import { pageProducts, type Product } from '@/api/product'
import ProductCard from '@/components/ProductCard.vue'

const router = useRouter()

const categories = ref<Category[]>([])   // 分类入口
const products = ref<Product[]>([])       // 热销商品
const loading = ref(true)

// 轮播占位: 三张纯色"图"(用渐变模拟, 真图替换 background 即可)
// link 可选: 有就点击跳转, 空串就纯展示
const banners = [
  { id: 1, text: '⚡ 限时秒杀 · 爆款限量抢', bg: 'linear-gradient(135deg,#E1251B,#FF6700)', link: '/seckill' },
  { id: 2, text: '数码家电 · 低至 5 折', bg: 'linear-gradient(135deg,#FF6700,#FFB400)', link: '' },
  { id: 3, text: '会员日 · 领券满 200 减 30', bg: 'linear-gradient(135deg,#C0392B,#E1251B)', link: '/user/coupons?tab=center' }
]

// banner 点击: 有 link 才跳
function goBanner(link: string) {
  if (link) router.push(link)
}

async function loadData() {
  loading.value = true
  try {
    // 并行拉分类 + 商品
    const [cats, page] = await Promise.all([
      listCategory(),
      pageProducts({ page: 1, size: 12 })
    ])
    categories.value = cats
    products.value = page.records
  } catch (e) {
    // 拦截器已弹错, 这里只打日志 (后端没起时这里会失败, 属正常)
    console.error('[home] loadData', e)
  } finally {
    loading.value = false
  }
}

function goCategory(id: number) {
  router.push(`/category/${id}`)
}

onMounted(loadData)
</script>

<template>
  <div class="home">
    <!-- ① 轮播 banner -->
    <el-carousel height="320px" class="banner">
      <el-carousel-item v-for="b in banners" :key="b.id">
        <div
          class="banner-slide"
          :class="{ clickable: b.link }"
          :style="{ background: b.bg }"
          @click="goBanner(b.link)"
        >
          {{ b.text }}
        </div>
      </el-carousel-item>
    </el-carousel>

    <!-- ② 快捷入口 -->
    <div class="quick-entry">
      <div class="qe-card seckill" @click="router.push('/seckill')">
        <div class="qe-icon">⚡</div>
        <div class="qe-text">
          <div class="qe-title">限时秒杀</div>
          <div class="qe-sub">爆款限量抢</div>
        </div>
      </div>
      <div class="qe-card coupon" @click="router.push('/user/coupons?tab=center')">
        <div class="qe-icon">🎫</div>
        <div class="qe-text">
          <div class="qe-title">领券中心</div>
          <div class="qe-sub">先领券再下单</div>
        </div>
      </div>
    </div>

    <!-- ③ 分类入口 -->
    <div class="section-title">商品分类</div>
    <div class="cat-bar">
      <div v-for="c in categories" :key="c.id" class="cat-item" @click="goCategory(c.id)">
        <div class="cat-icon">{{ c.icon || '🛒' }}</div>
        <div class="cat-name">{{ c.name }}</div>
      </div>
      <el-empty v-if="!loading && categories.length === 0" description="暂无分类" :image-size="60" />
    </div>

    <!-- ④ 热销商品 -->
    <div class="section-title">热销推荐</div>
    <div v-loading="loading" class="grid">
      <ProductCard v-for="p in products" :key="p.id" :item="p" />
      <el-empty v-if="!loading && products.length === 0" description="暂无商品" />
    </div>
  </div>
</template>

<style scoped>
.home {
  width: 1200px;
  margin: 0 auto;
  padding: 16px 0 40px;
}
.banner {
  border-radius: 8px;
  overflow: hidden;
}
.banner-slide {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 30px;
  font-weight: 800;
  letter-spacing: 2px;
}
.banner-slide.clickable {
  cursor: pointer;
}
/* 快捷入口: 两张大卡, 一行排开 */
.quick-entry {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-top: 16px;
}
.qe-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 24px;
  border-radius: 8px;
  cursor: pointer;
  color: #fff;
  transition: transform 0.15s, box-shadow 0.15s;
}
.qe-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}
.qe-card.seckill {
  background: linear-gradient(135deg, #E1251B, #FF6700);
}
.qe-card.coupon {
  background: linear-gradient(135deg, #FF6700, #FFB400);
}
.qe-icon {
  font-size: 36px;
}
.qe-title {
  font-size: 18px;
  font-weight: 700;
}
.qe-sub {
  margin-top: 4px;
  font-size: 13px;
  opacity: 0.9;
}
.section-title {
  margin: 28px 0 14px;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  border-left: 4px solid var(--primary);
  padding-left: 10px;
}
.cat-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  background: #fff;
  border-radius: 8px;
  padding: 16px;
}
.cat-item {
  width: 88px;
  text-align: center;
  cursor: pointer;
  padding: 8px 0;
  border-radius: 6px;
  transition: background 0.2s;
}
.cat-item:hover {
  background: var(--primary-light);
}
.cat-icon {
  font-size: 30px;
}
.cat-name {
  margin-top: 6px;
  font-size: 13px;
  color: var(--text-primary);
}
/* 商品网格: 一行 4 个, 间距 16 */
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  min-height: 200px;
}
</style>
