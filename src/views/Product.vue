<script setup lang="ts">
/**
 * 商品详情页 — WEB.4
 *
 * 布局:
 *   上半:  左大图 | 右信息(名/价/销量/评分/库存 + 数量选择 + 加购按钮)
 *   下半:  Tab 切换  [商品详情] [商品评价(N)]
 *
 * 三个数据源 (进页面并行拉):
 *   getProduct(id)            商品本体    (product.ts)
 *   listProductReviews(id)    评价列表    (review.ts)
 *   加购 addToCart(id, qty)   (cart.ts)
 *
 * 加购逻辑要点:
 *   - 未登录 → 跳登录页 (带 redirect 回本页)
 *   - 成功后 cartStore.refreshCount() 让右上角徽章 +1
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getProduct, type Product } from '@/api/product'
import { listProductReviews, type ReviewVO } from '@/api/review'
import { addToCart, getCart } from '@/api/cart'
import { checkFavorite, addFavorite, removeFavorite } from '@/api/favorite'
import { useUserStore } from '@/stores/user'
import { useCartStore } from '@/stores/cart'
import ProductImage from '@/components/ProductImage.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()

const product = ref<Product | null>(null)
const reviews = ref<ReviewVO[]>([])
const loading = ref(true)
const quantity = ref(1)          // 加购数量
const adding = ref(false)        // 加购按钮 loading
const buying = ref(false)        // 立即购买按钮 loading
const activeTab = ref('detail')  // 当前 tab
const favorited = ref(false)     // 是否已收藏 (心形实/空)
const favLoading = ref(false)    // 收藏按钮 loading (防连点)
const activeImg = ref('')        // 当前大图 src (点/悬停缩略图切换)

// 画廊 = 封面图 + 缩略图数组, 去重去空 (封面排第一张)
const gallery = computed<string[]>(() => {
  if (!product.value) return []
  const list = [product.value.coverImage, ...(product.value.thumbnails || [])]
  return list.filter((v, i) => v && list.indexOf(v) === i)
})

// 路由参数 id
function productId(): number {
  return Number(route.params.id)
}

async function loadData() {
  loading.value = true
  try {
    // 商品是主体, 必须成功; 评价是次要, 挂了(如 review 服务没起)不该拖垮整页 → 单独 catch 兜空
    const [p, rs] = await Promise.all([
      getProduct(productId()),
      listProductReviews(productId()).catch(() => [] as ReviewVO[])
    ])
    product.value = p
    activeImg.value = p.coverImage   // 大图先显封面
    reviews.value = rs
    // 已登录才查收藏状态 (游客 /favorite/{id}/exists 会 401); 查失败也不影响主体
    if (userStore.isLogin) {
      favorited.value = await checkFavorite(productId()).catch(() => false)
    }
  } catch (e) {
    console.error('[product] loadData', e)
  } finally {
    loading.value = false
  }
}

// 收藏 / 取消收藏: 根据当前 favorited 状态决定调哪个接口
async function toggleFavorite() {
  // 未登录拦截, 跟加购一致: 跳登录并带 redirect 回本页
  if (!userStore.isLogin) {
    ElMessage.warning('请先登录')
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  if (!product.value) return
  favLoading.value = true
  try {
    if (favorited.value) {
      await removeFavorite(product.value.id)
      favorited.value = false
      ElMessage.success('已取消收藏')
    } else {
      await addFavorite(product.value.id)
      favorited.value = true
      ElMessage.success('已收藏')
    }
  } catch (e) {
    console.error('[product] toggleFavorite', e)
  } finally {
    favLoading.value = false
  }
}

async function handleAddToCart() {
  // 未登录拦截: 跳登录, 登录后回本页
  if (!userStore.isLogin) {
    ElMessage.warning('请先登录')
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  if (!product.value) return
  adding.value = true
  try {
    await addToCart(product.value.id, quantity.value)
    await cartStore.refreshCount()    // 刷新徽章
    ElMessage.success('已加入购物车')
  } catch (e) {
    console.error('[product] addToCart', e)
  } finally {
    adding.value = false
  }
}

// 立即购买 = 加购后直连结算页 (跳过购物车页)
//   后端 createOrder 只认 cartItemIds, 而 addToCart 返回 void 不给 id,
//   所以加购后重拉购物车, 按 productId 找到这条的 cartItemId, 带它去 /checkout。
//   ⚠ 购物车若已有该商品, 加购会合并数量, 结算的是合并后的总量 (MVP 局限)。
async function handleBuyNow() {
  if (!userStore.isLogin) {
    ElMessage.warning('请先登录')
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  if (!product.value) return
  buying.value = true
  try {
    await addToCart(product.value.id, quantity.value)
    await cartStore.refreshCount()
    // 找回刚加购这条的 cartItemId
    const cart = await getCart()
    const item = cart.find(i => i.productId === product.value!.id)
    if (!item) {
      // 兜底: 没找到就退回购物车页, 不让用户卡住
      ElMessage.warning('请到购物车结算')
      router.push('/cart')
      return
    }
    router.push(`/checkout?ids=${item.cartItemId}`)
  } catch (e) {
    console.error('[product] buyNow', e)
  } finally {
    buying.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <div class="detail-page" v-loading="loading">
    <template v-if="product">
      <!-- 上半: 图 + 信息 -->
      <div class="top">
        <div class="gallery">
          <div class="main-img">
            <ProductImage :src="activeImg || product.coverImage" :alt="product.name" />
          </div>
          <!-- 缩略图条: 多于 1 张才显示, 悬停/点击切换大图 -->
          <div v-if="gallery.length > 1" class="thumbs">
            <div
              v-for="(img, i) in gallery"
              :key="i"
              class="thumb"
              :class="{ active: img === activeImg }"
              @mouseenter="activeImg = img"
              @click="activeImg = img"
            >
              <ProductImage :src="img" :alt="`图 ${i + 1}`" />
            </div>
          </div>
        </div>

        <div class="info">
          <h1 class="name">{{ product.name }}</h1>
          <p class="desc">{{ product.description }}</p>

          <div class="price-box">
            <span class="label">价格</span>
            <span class="price">¥{{ product.price }}</span>
          </div>

          <div class="stats">
            <span>销量 {{ product.sales }}</span>
            <span>评分 {{ product.avgRating ?? '—' }}</span>
            <span>评价 {{ product.reviewCount ?? 0 }}</span>
            <span>库存 {{ product.stock }}</span>
          </div>

          <div class="buy-row">
            <span class="qty-label">数量</span>
            <el-input-number v-model="quantity" :min="1" :max="product.stock" />
          </div>

          <div class="actions">
            <el-button
              type="primary" size="large" :loading="adding"
              :disabled="product.stock <= 0"
              @click="handleAddToCart"
            >
              加入购物车
            </el-button>
            <el-button
              size="large" class="buy-now" :loading="buying"
              :disabled="product.stock <= 0"
              @click="handleBuyNow"
            >
              立即购买
            </el-button>
            <!-- 收藏按钮: favorited 决定实心♥还是空心♡, 点击 toggle -->
            <el-button
              size="large" class="fav-btn" :class="{ active: favorited }"
              :loading="favLoading"
              @click="toggleFavorite"
            >
              {{ favorited ? '♥ 已收藏' : '♡ 收藏' }}
            </el-button>
          </div>
        </div>
      </div>

      <!-- 下半: tab -->
      <el-tabs v-model="activeTab" class="tabs">
        <el-tab-pane label="商品详情" name="detail">
          <div class="detail-content">
            <!-- detail 是管理端录入的富文本 HTML, 用 v-html 渲染.
                 ⚠ XSS: detail 来自可信管理端, 这里不额外消毒;
                 若日后改成用户可投稿, 必须先 sanitize (如 DOMPurify). -->
            <div v-if="product.detail" v-html="product.detail"></div>
            <div v-else class="plain">{{ product.description || '暂无详情' }}</div>
          </div>
        </el-tab-pane>

        <el-tab-pane :label="`商品评价 (${reviews.length})`" name="reviews">
          <div v-if="reviews.length === 0" class="no-review">
            <el-empty description="还没有评价" />
          </div>
          <ul v-else class="review-list">
            <li v-for="r in reviews" :key="r.id" class="review-item">
              <div class="review-head">
                <span class="reviewer">{{ r.userName || ('用户' + r.userId) }}</span>
                <el-rate :model-value="r.rating" disabled size="small" />
                <span class="time">{{ r.createTime }}</span>
              </div>
              <div class="review-content">{{ r.content }}</div>
            </li>
          </ul>
        </el-tab-pane>
      </el-tabs>
    </template>

    <el-empty v-else-if="!loading" description="商品不存在或已下架" />
  </div>
</template>

<style scoped>
.detail-page {
  width: 1200px;
  margin: 0 auto;
  padding: 16px 0 40px;
  min-height: 400px;
}
.top {
  display: flex;
  gap: 32px;
  background: #fff;
  border-radius: 8px;
  padding: 24px;
}
.gallery {
  width: 400px;
  flex-shrink: 0;
}
.main-img {
  width: 400px;
  height: 400px;
  background: #f5f5f5;
  border-radius: 8px;
  overflow: hidden;
}
.main-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.thumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.thumb {
  width: 60px;
  height: 60px;
  border: 1px solid #eee;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.2s;
}
.thumb.active {
  border-color: var(--primary);
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.info {
  flex: 1;
}
.name {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px;
}
.desc {
  color: var(--text-secondary);
  font-size: 14px;
  margin: 0 0 16px;
}
.price-box {
  background: var(--primary-light);
  border-radius: 6px;
  padding: 16px;
  display: flex;
  align-items: baseline;
  gap: 12px;
}
.price-box .label {
  font-size: 13px;
  color: var(--text-secondary);
}
.price-box .price {
  color: var(--price);
  font-size: 30px;
  font-weight: 800;
}
.stats {
  display: flex;
  gap: 24px;
  margin: 18px 0;
  font-size: 13px;
  color: var(--text-secondary);
}
.buy-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}
.qty-label {
  font-size: 14px;
  color: var(--text-regular);
}
.actions {
  display: flex;
  gap: 16px;
}
.buy-now {
  color: var(--primary);
  border-color: var(--primary);
}
/* 收藏按钮: 默认灰边, 已收藏时变主题红 */
.fav-btn.active {
  color: var(--primary);
  border-color: var(--primary);
  background: var(--primary-light);
}
.tabs {
  margin-top: 20px;
  background: #fff;
  border-radius: 8px;
  padding: 16px 24px;
}
.detail-content {
  line-height: 1.8;
  color: var(--text-regular);
  min-height: 120px;
}
/* 纯文本兜底 (description) 保留换行 */
.detail-content .plain {
  white-space: pre-wrap;
}
/* 富文本里的图片自适应宽度, 不撑破容器 */
.detail-content :deep(img) {
  max-width: 100%;
  height: auto;
}
.review-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.review-item {
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
}
.review-head {
  display: flex;
  align-items: center;
  gap: 12px;
}
.reviewer {
  font-weight: 600;
  color: var(--text-primary);
}
.time {
  font-size: 12px;
  color: var(--text-secondary);
}
.review-content {
  margin-top: 8px;
  color: var(--text-regular);
  line-height: 1.6;
}
</style>
