<script setup lang="ts">
/**
 * 我的评价 — WEB.7
 *
 * GET /review/user 返我发过的评价列表, 简单列出: 星级 + 内容 + 时间 + 跳商品。
 */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { listMyReviews, type ReviewVO } from '@/api/review'

const router = useRouter()
const list = ref<ReviewVO[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    list.value = await listMyReviews()
  } catch (e) {
    console.error('[reviews] load', e)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="review-page">
    <h3 class="page-title">我的评价</h3>

    <div v-loading="loading" class="list">
      <div v-for="r in list" :key="r.id" class="item">
        <div class="head">
          <el-rate :model-value="r.rating" disabled size="small" />
          <span class="time">{{ r.createTime }}</span>
          <el-button link type="primary" size="small" @click="router.push(`/product/${r.productId}`)">
            查看商品
          </el-button>
        </div>
        <div class="content">{{ r.content }}</div>
      </div>
      <el-empty v-if="!loading && list.length === 0" description="还没有评价过商品" />
    </div>
  </div>
</template>

<style scoped>
.review-page {
  padding: 4px;
}
.page-title {
  margin: 0 0 16px;
  font-size: 18px;
  color: var(--text-primary);
}
.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 120px;
}
.item {
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 14px 16px;
}
.head {
  display: flex;
  align-items: center;
  gap: 14px;
}
.time {
  font-size: 12px;
  color: var(--text-secondary);
}
.content {
  margin-top: 8px;
  color: var(--text-regular);
  line-height: 1.6;
}
</style>
