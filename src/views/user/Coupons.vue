<script setup lang="ts">
/**
 * 我的优惠券 — WEB.7
 *
 * 两个 tab:
 *   [我的券]   GET /coupon/mine   → 按 status/expired 分"可用/已用/已过期"
 *   [领券中心] GET /coupon/available → 列出可领的, 点"领取" receiveCoupon
 *
 * 券分类规则 (前端算):
 *   可用 = status==0 && !expired
 *   已用 = status==1
 *   过期 = status==0 && expired
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  listMyCoupons, listAvailableCoupons, receiveCoupon,
  type UserCouponVO, type Coupon
} from '@/api/coupon'

const route = useRoute()
// 初始 tab: 支持从 ?tab=center 进来直接打开领券中心 (首页"领券中心"入口用)
const tab = ref<'mine' | 'center'>(route.query.tab === 'center' ? 'center' : 'mine')
const mine = ref<UserCouponVO[]>([])
const available = ref<Coupon[]>([])
const loading = ref(true)

// 我的券分三类
const usable = computed(() => mine.value.filter(c => c.status === 0 && !c.expired))
const used = computed(() => mine.value.filter(c => c.status === 1))
const expired = computed(() => mine.value.filter(c => c.status === 0 && c.expired))

async function loadMine() {
  loading.value = true
  try {
    mine.value = await listMyCoupons()
  } catch (e) {
    console.error('[coupons] mine', e)
  } finally {
    loading.value = false
  }
}

async function loadAvailable() {
  loading.value = true
  try {
    available.value = await listAvailableCoupons()
  } catch (e) {
    console.error('[coupons] available', e)
  } finally {
    loading.value = false
  }
}

function switchTab(t: 'mine' | 'center') {
  tab.value = t
  if (t === 'mine') loadMine()
  else loadAvailable()
}

async function receive(c: Coupon) {
  try {
    await receiveCoupon(c.id)
    ElMessage.success('领取成功, 去"我的券"查看')
  } catch (e) {
    console.error('[coupons] receive', e)
  }
}

// 按初始 tab 决定首屏拉哪份数据 (center → 领券中心, 否则我的券)
onMounted(() => (tab.value === 'center' ? loadAvailable() : loadMine()))
</script>

<template>
  <div class="coupon-page">
    <h3 class="page-title">优惠券</h3>

    <div class="tabs">
      <span class="tab" :class="{ active: tab === 'mine' }" @click="switchTab('mine')">我的券</span>
      <span class="tab" :class="{ active: tab === 'center' }" @click="switchTab('center')">领券中心</span>
    </div>

    <!-- 我的券 -->
    <div v-if="tab === 'mine'" v-loading="loading">
      <div class="group-title">可用 ({{ usable.length }})</div>
      <div class="coupon-list">
        <div v-for="c in usable" :key="c.id" class="coupon">
          <div class="left">
            <div class="discount">¥{{ c.discount }}</div>
            <div class="threshold">满 {{ c.threshold }} 可用</div>
          </div>
          <div class="right">
            <div class="name">{{ c.name }}</div>
            <div class="valid">{{ c.validFrom }} ~ {{ c.validTo }}</div>
          </div>
        </div>
        <el-empty v-if="usable.length === 0" description="暂无可用券" :image-size="60" />
      </div>

      <div class="group-title">已用 / 已过期</div>
      <div class="coupon-list">
        <div v-for="c in [...used, ...expired]" :key="c.id" class="coupon disabled">
          <div class="left">
            <div class="discount">¥{{ c.discount }}</div>
            <div class="threshold">满 {{ c.threshold }} 可用</div>
          </div>
          <div class="right">
            <div class="name">{{ c.name }}</div>
            <div class="valid">{{ c.status === 1 ? '已使用' : '已过期' }}</div>
          </div>
        </div>
        <el-empty v-if="used.length + expired.length === 0" description="暂无" :image-size="60" />
      </div>
    </div>

    <!-- 领券中心 -->
    <div v-else v-loading="loading" class="coupon-list">
      <div v-for="c in available" :key="c.id" class="coupon">
        <div class="left">
          <div class="discount">¥{{ c.discount }}</div>
          <div class="threshold">满 {{ c.threshold }} 可用</div>
        </div>
        <div class="right">
          <div class="name">{{ c.name }}</div>
          <el-button type="primary" size="small" @click="receive(c)">领取</el-button>
        </div>
      </div>
      <el-empty v-if="!loading && available.length === 0" description="暂无可领券" />
    </div>
  </div>
</template>

<style scoped>
.coupon-page {
  padding: 4px;
}
.page-title {
  margin: 0 0 16px;
  font-size: 18px;
  color: var(--text-primary);
}
.tabs {
  display: flex;
  gap: 8px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 16px;
}
.tab {
  padding: 8px 16px;
  cursor: pointer;
  color: var(--text-regular);
  border-bottom: 2px solid transparent;
}
.tab.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
  font-weight: 600;
}
.group-title {
  margin: 16px 0 10px;
  font-size: 14px;
  color: var(--text-secondary);
}
.coupon-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  min-height: 80px;
}
.coupon {
  display: flex;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #ffd9d6;
}
.coupon.disabled {
  filter: grayscale(1);
  opacity: 0.7;
  border-color: #eee;
}
.coupon .left {
  width: 120px;
  background: var(--primary-light);
  color: var(--primary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 0;
}
.discount {
  font-size: 26px;
  font-weight: 800;
}
.threshold {
  font-size: 12px;
  margin-top: 2px;
}
.coupon .right {
  flex: 1;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}
.name {
  font-weight: 600;
  color: var(--text-primary);
}
.valid {
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
