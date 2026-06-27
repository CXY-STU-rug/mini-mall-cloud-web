<script setup lang="ts">
/**
 * 我的收藏 — WEB.7
 *
 * GET /favorite/my 返完整 Product 列表, 网格展示。
 * 每张卡右上角一个"取消收藏" → removeFavorite(productId) → 本地移除该项。
 *
 * 这里没复用 ProductCard, 因为要多一个取消按钮且布局略不同;
 * 简单页面直接写, 不为了复用硬塞 props。
 */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { listMyFavorites, removeFavorite } from '@/api/favorite'
import type { Product } from '@/api/product'

const router = useRouter()
const list = ref<Product[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    list.value = await listMyFavorites()
  } catch (e) {
    console.error('[favorites] load', e)
  } finally {
    loading.value = false
  }
}

async function onRemove(p: Product) {
  try {
    await removeFavorite(p.id)
    // 本地移除, 不用重拉
    list.value = list.value.filter(i => i.id !== p.id)
    ElMessage.success('已取消收藏')
  } catch (e) {
    console.error('[favorites] remove', e)
  }
}

onMounted(load)
</script>

<template>
  <div class="fav-page">
    <h3 class="page-title">我的收藏</h3>

    <div v-loading="loading" class="grid">
      <div v-for="p in list" :key="p.id" class="card">
        <span class="del" @click.stop="onRemove(p)">✕</span>
        <div class="cover" @click="router.push(`/product/${p.id}`)">
          <img :src="p.coverImage" :alt="p.name" />
        </div>
        <div class="name" @click="router.push(`/product/${p.id}`)">{{ p.name }}</div>
        <div class="price">¥{{ p.price }}</div>
      </div>
      <el-empty v-if="!loading && list.length === 0" description="还没有收藏商品" />
    </div>
  </div>
</template>

<style scoped>
.fav-page {
  padding: 4px;
}
.page-title {
  margin: 0 0 16px;
  font-size: 18px;
  color: var(--text-primary);
}
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  min-height: 120px;
}
.card {
  position: relative;
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}
.del {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  width: 24px;
  height: 24px;
  line-height: 24px;
  text-align: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  cursor: pointer;
  font-size: 12px;
}
.del:hover {
  background: var(--primary);
}
.cover {
  height: 180px;
  background: #f5f5f5;
  cursor: pointer;
}
.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.name {
  padding: 8px 10px 2px;
  font-size: 14px;
  color: var(--text-primary);
  cursor: pointer;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.price {
  padding: 0 10px 10px;
  color: var(--price);
  font-weight: 700;
  font-size: 16px;
}
</style>
