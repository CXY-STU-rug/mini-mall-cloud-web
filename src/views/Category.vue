<script setup lang="ts">
/**
 * 分类页 — WEB.3
 *
 * 左边一列分类菜单, 右边该分类下的商品网格 + 分页。
 *
 * 关键点: 这个页面靠路由参数 :id 驱动。
 *   - 用户点左边换分类 → router.push 改 :id → URL 变 → 重新拉商品
 *   - 所以要 watch route.params.id, 一变就 reload
 *   - 直接在地址栏改 id、或从首页分类入口跳进来, 都能正确加载
 */
import { ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { listCategory, type Category } from '@/api/category'
import { pageProducts, type Product } from '@/api/product'
import ProductCard from '@/components/ProductCard.vue'

const route = useRoute()
const router = useRouter()

// 分类图标兼容: URL → <img>, emoji → 文字, 否则默认图标
function isIconUrl(icon?: string): boolean {
  return !!icon && /^https?:\/\//i.test(icon)
}
function iconText(icon?: string): string {
  return icon && /[^\u0000-ÿ]/.test(icon) ? icon : '🛒'
}

const categories = ref<Category[]>([])
const products = ref<Product[]>([])
const loading = ref(true)

// 分页状态
const page = ref(1)
const size = 12
const total = ref(0)

// 当前选中的分类 id (从路由参数取, 字符串转数字)
function currentId(): number {
  return Number(route.params.id)
}

// 拉当前分类的商品
async function loadProducts() {
  loading.value = true
  try {
    const res = await pageProducts({
      categoryId: currentId(),
      page: page.value,
      size
    })
    products.value = res.records
    total.value = res.total
  } catch (e) {
    console.error('[category] loadProducts', e)
  } finally {
    loading.value = false
  }
}

// 点左侧分类 → 改路由 (URL 变, 由 watch 触发重新加载)
function selectCategory(id: number) {
  if (id === currentId()) return
  router.push(`/category/${id}`)
}

// 翻页
function onPageChange(p: number) {
  page.value = p
  loadProducts()
}

// 监听路由 id 变化: 换分类时回到第 1 页并重拉
watch(
  () => route.params.id,
  () => {
    page.value = 1
    loadProducts()
  }
)

onMounted(async () => {
  // 分类菜单只需拉一次
  try {
    categories.value = await listCategory()
  } catch (e) {
    console.error('[category] listCategory', e)
  }
  loadProducts()
})
</script>

<template>
  <div class="category-page">
    <!-- 左: 分类菜单 -->
    <aside class="sidebar">
      <div class="sidebar-title">全部分类</div>
      <ul class="cat-list">
        <li
          v-for="c in categories"
          :key="c.id"
          :class="{ active: c.id === currentId() }"
          @click="selectCategory(c.id)"
        >
          <span class="ic">
            <img v-if="isIconUrl(c.icon)" :src="c.icon" :alt="c.name" class="cat-img" />
            <template v-else>{{ iconText(c.icon) }}</template>
          </span>{{ c.name }}
        </li>
      </ul>
    </aside>

    <!-- 右: 商品网格 + 分页 -->
    <main class="content">
      <div v-loading="loading" class="grid">
        <ProductCard v-for="p in products" :key="p.id" :item="p" />
        <el-empty v-if="!loading && products.length === 0" description="该分类下暂无商品" />
      </div>

      <div v-if="total > size" class="pager">
        <el-pagination
          background
          layout="prev, pager, next"
          :total="total"
          :page-size="size"
          :current-page="page"
          @current-change="onPageChange"
        />
      </div>
    </main>
  </div>
</template>

<style scoped>
.category-page {
  width: 1200px;
  margin: 0 auto;
  padding: 16px 0 40px;
  display: flex;
  gap: 16px;
}
.sidebar {
  width: 180px;
  flex-shrink: 0;
  background: #fff;
  border-radius: 8px;
  padding: 12px 0;
  align-self: flex-start;
}
.sidebar-title {
  padding: 0 16px 10px;
  font-weight: 700;
  color: var(--text-primary);
  border-bottom: 1px solid #f0f0f0;
}
.cat-list {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
}
.cat-list li {
  padding: 10px 16px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-regular);
  transition: background 0.2s, color 0.2s;
}
.cat-list li:hover {
  background: var(--primary-light);
  color: var(--primary);
}
.cat-list li.active {
  background: var(--primary-light);
  color: var(--primary);
  font-weight: 600;
  border-right: 3px solid var(--primary);
}
.ic {
  margin-right: 8px;
  display: inline-flex;
  align-items: center;
}
.cat-img {
  width: 22px;
  height: 22px;
  object-fit: contain;
}
.content {
  flex: 1;
}
/* 价格筛选条 */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
}
.filter-label {
  font-size: 14px;
  color: var(--text-regular);
}
.price-input {
  width: 100px;
}
.dash {
  color: var(--text-secondary);
}
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  min-height: 200px;
}
.pager {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}
</style>
