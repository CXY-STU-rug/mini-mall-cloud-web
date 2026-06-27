<script setup lang="ts">
/**
 * 搜索结果页 — WEB.3
 *
 * 跟分类页很像, 区别:
 *   ① 数据走 search 服务 (searchProducts → GET /search/product, 查 ES)
 *   ② 驱动它的是 URL 里的 ?keyword=xxx (顶栏搜索框跳进来时带的)
 *   ③ search 服务的分页字段是 page 不是 current (见 api/product.ts 注释)
 *
 * 同样 watch route.query.keyword: 在结果页再搜一个新词, 关键词变了要重拉。
 */
import { ref, watch, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { searchProducts, type ProductSearchVO } from '@/api/product'
import ProductCard from '@/components/ProductCard.vue'

const route = useRoute()

const list = ref<ProductSearchVO[]>([])
const loading = ref(true)
const page = ref(1)
const size = 12
const total = ref(0)

// 当前关键词 (从 URL query 取)
const keyword = computed(() => (route.query.keyword as string) || '')

// 当前排序: 'default'综合 / 'sales'销量 / 'price-asc'价低 / 'price-desc'价高
const activeSort = ref<'default' | 'sales' | 'price-asc' | 'price-desc'>('default')
const sortTabs = [
  { key: 'default', label: '综合' },
  { key: 'sales', label: '销量' },
  { key: 'price-asc', label: '价格 ↑' },
  { key: 'price-desc', label: '价格 ↓' }
] as const

// 把 activeSort 翻译成后端要的 sortField + sortOrder (综合就不传)
function sortParams(): { sortField?: 'price' | 'sales'; sortOrder?: 'asc' | 'desc' } {
  switch (activeSort.value) {
    case 'sales': return { sortField: 'sales', sortOrder: 'desc' }
    case 'price-asc': return { sortField: 'price', sortOrder: 'asc' }
    case 'price-desc': return { sortField: 'price', sortOrder: 'desc' }
    default: return {}
  }
}

// 点排序: 切换后回第 1 页重搜
function changeSort(key: typeof activeSort.value) {
  if (activeSort.value === key) return
  activeSort.value = key
  page.value = 1
  doSearch()
}

async function doSearch() {
  loading.value = true
  try {
    const res = await searchProducts({
      keyword: keyword.value,
      page: page.value,
      size,
      ...sortParams()
    })
    list.value = res.records
    total.value = res.total
  } catch (e) {
    console.error('[search] doSearch', e)
  } finally {
    loading.value = false
  }
}

function onPageChange(p: number) {
  page.value = p
  doSearch()
}

// 关键词变 (在结果页又搜了个新词) → 回第 1 页重搜
watch(
  () => route.query.keyword,
  () => {
    page.value = 1
    doSearch()
  }
)

onMounted(doSearch)
</script>

<template>
  <div class="search-page">
    <div class="head">
      搜索 “<span class="kw">{{ keyword }}</span>” 的结果
      <span class="count">共 {{ total }} 件</span>
    </div>

    <!-- 排序条: 点了切 activeSort 并重搜 -->
    <div class="sort-bar">
      <span
        v-for="t in sortTabs" :key="t.key"
        class="sort-tab" :class="{ active: activeSort === t.key }"
        @click="changeSort(t.key)"
      >{{ t.label }}</span>
    </div>

    <div v-loading="loading" class="grid">
      <ProductCard v-for="p in list" :key="p.id" :item="p" />
      <el-empty v-if="!loading && list.length === 0" description="没找到相关商品, 换个词试试" />
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
  </div>
</template>

<style scoped>
.search-page {
  width: 1200px;
  margin: 0 auto;
  padding: 16px 0 40px;
}
.head {
  font-size: 16px;
  color: var(--text-primary);
  margin-bottom: 16px;
}
/* 排序条 */
.sort-bar {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
}
.sort-tab {
  padding: 6px 16px;
  font-size: 14px;
  color: var(--text-regular);
  background: #fff;
  border: 1px solid #eee;
  border-radius: 4px;
  cursor: pointer;
}
.sort-tab.active {
  color: #fff;
  background: var(--primary);
  border-color: var(--primary);
}
.kw {
  color: var(--primary);
  font-weight: 700;
}
.count {
  margin-left: 8px;
  font-size: 13px;
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
