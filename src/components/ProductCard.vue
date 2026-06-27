<script setup lang="ts">
/**
 * 商品卡片 (首页/分类/搜索三个页面共用) — WEB.3
 *
 * 为什么抽成组件? 三个页面都要把商品画成"图+名+价+销量"的方格,
 * 抽一个组件就只写一遍样式, 哪个页面要展示商品就 <ProductCard :item="x" />。
 *
 * 这里只负责"展示 + 点击跳详情", 不带加购按钮 ——
 * 加购在 WEB.4 详情页做, 列表页保持干净。
 *
 * 注意: 首页/分类传进来的是 Product, 搜索传进来的是 ProductSearchVO,
 *   两者字段名公共部分一致 (id/name/price/coverImage/sales), 所以用一个
 *   宽松的 props 类型就能同时接住。
 */
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { addFavorite, checkFavorite, removeFavorite } from '@/api/favorite'
import { useUserStore } from '@/stores/user'
import ProductImage from '@/components/ProductImage.vue'

// 卡片只用到这几个字段, 定义一个最小公共形状 (Product 和 SearchVO 都满足)
interface CardItem {
  id: number
  name: string
  price: number
  coverImage: string
  sales?: number
}

const props = defineProps<{ item: CardItem }>()
const router = useRouter()
const userStore = useUserStore()

const favorited = ref(false)
const favLoading = ref(false)

async function loadFavorite() {
  if (!userStore.isLogin) {
    favorited.value = false
    return
  }

  try {
    favorited.value = await checkFavorite(props.item.id)
  } catch (e) {
    console.error('[productCard] loadFavorite', e)
    favorited.value = false
  }
}

// 点击整张卡 → 跳商品详情页
function goDetail() {
  router.push(`/product/${props.item.id}`)
}

async function toggleFav() {
  if (!userStore.isLogin) {
    ElMessage.warning('请先登录')
    router.push({ path: '/login', query: { redirect: router.currentRoute.value.fullPath } })
    return
  }

  favLoading.value = true
  try {
    if (favorited.value) {
      await removeFavorite(props.item.id)
      favorited.value = false
      ElMessage.success('已取消收藏')
    } else {
      await addFavorite(props.item.id)
      favorited.value = true
      ElMessage.success('已收藏')
    }
  } catch (e) {
    console.error('[productCard] toggleFav', e)
  } finally {
    favLoading.value = false
  }
}

watch(() => [props.item.id, userStore.token], loadFavorite, { immediate: true })
</script>

<template>
  <div class="product-card" @click="goDetail">
    <!-- 商品图: 用固定高度 + cover 裁切, 保证所有卡片等高 -->
    <div class="cover">
      <ProductImage :src="item.coverImage" :alt="item.name" />
      <!-- 收藏♥角标: @click.stop 防止点它时也触发整卡跳详情 -->
      <button
        class="fav-badge" :class="{ active: favorited }"
        :disabled="favLoading"
        @click.stop="toggleFav"
      >{{ favorited ? '♥' : '♡' }}</button>
    </div>

    <!-- 商品名: 最多两行, 超出打省略号 (CSS -webkit-line-clamp) -->
    <div class="name">{{ item.name }}</div>

    <!-- 价格行: 红色大价 + 灰色销量 -->
    <div class="meta">
      <span class="price">¥{{ item.price }}</span>
      <span v-if="item.sales != null" class="sales">已售 {{ item.sales }}</span>
    </div>
  </div>
</template>

<style scoped>
.product-card {
  background: #fff;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.2s;
}
/* 悬停微微抬起 + 阴影, 京东/淘宝列表的常见反馈 */
.product-card:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}
.cover {
  width: 100%;
  height: 200px;
  background: #f5f5f5;
  position: relative;
}
.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.fav-badge {
  position: absolute;
  right: 10px;
  top: 10px;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
  color: var(--text-secondary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  font-size: 18px;
  line-height: 32px;
}
.fav-badge.active {
  color: var(--price);
}
.fav-badge:disabled {
  cursor: default;
  opacity: 0.7;
}
.name {
  padding: 10px 12px 4px;
  font-size: 14px;
  line-height: 1.4;
  color: var(--text-primary);
  /* 限制两行省略 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 40px;
}
.meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 4px 12px 12px;
}
.price {
  color: var(--price);
  font-size: 18px;
  font-weight: 700;
}
.sales {
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
