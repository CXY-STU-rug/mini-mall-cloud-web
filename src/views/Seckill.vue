<script setup lang="ts">
/**
 * 秒杀页 — WEB.9
 *
 * 怎么玩:
 *   ① 进页面 listSeckillActivities() 列出待开始/进行中的活动
 *   ② status===1(进行中) 才能点"立即抢购"; 0(待开始)按钮禁用
 *   ③ 抢购: 未登录先跳登录 → POST /seckill/{id}
 *      后端是"Lua 抢名额 → MQ 异步落库", 所以抢到只代表有名额,
 *      订单要靠轮询 querySeckillResult 拿 (PROCESSING → SUCCESS)
 *   ④ 弹框里每秒轮询一次, 拿到 orderNo 或超时(~10 次)停
 *
 * 离开页面必须 stopPolling, 否则定时器泄漏。
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Loading, CircleCheckFilled, WarningFilled } from '@element-plus/icons-vue'
import {
  listSeckillActivities, seckill, querySeckillResult, paySeckillOrder,
  type SeckillActivityVO
} from '@/api/seckill'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const activities = ref<SeckillActivityVO[]>([])
const loading = ref(true)
const grabbingId = ref<number | null>(null)   // 正在抢的活动 id (按钮转圈用)

// ─── 轮询结果弹框状态 ───
const resultVisible = ref(false)
const resultStatus = ref<'PROCESSING' | 'SUCCESS' | 'NOT_FOUND'>('PROCESSING')
const resultMsg = ref('')
const resultOrderNo = ref<string | null>(null)
const paying = ref(false)        // 秒杀订单支付中
const seckillPaid = ref(false)   // 这单是否已支付

// 定时器句柄 (浏览器里 setInterval 返回 number, 这样写跨平台都安全)
let pollTimer: ReturnType<typeof setInterval> | null = null
const MAX_POLL = 10   // 最多轮询 10 次 (10 秒)

async function load() {
  loading.value = true
  try {
    activities.value = await listSeckillActivities()
  } catch (e) {
    console.error('[seckill] load', e)
  } finally {
    loading.value = false
  }
}

// 立省 = 原价 - 秒杀价
function saved(a: SeckillActivityVO): string {
  return (a.originalPrice - a.seckillPrice).toFixed(2)
}

// "2026-06-27T10:00:00" → "2026-06-27 10:00"
function fmt(t: string): string {
  return t ? t.replace('T', ' ').slice(0, 16) : ''
}

async function grab(a: SeckillActivityVO) {
  // 未登录先跳登录, 登录后跳回秒杀页
  if (!userStore.isLogin) {
    router.push({ path: '/login', query: { redirect: '/seckill' } })
    return
  }
  if (a.status !== 1) return   // 只有进行中能抢 (按钮本身也禁用了, 双保险)

  grabbingId.value = a.id
  try {
    // 抢名额; 抢不到(已售罄/已参与等)会被 http 拦截器弹错并 reject, 走 catch
    await seckill(a.id)
    openResult(a.id)
  } catch (e) {
    console.error('[seckill] grab', e)
  } finally {
    grabbingId.value = null
  }
}

// 抢到名额后: 打开弹框 + 开始轮询订单
function openResult(activityId: number) {
  resultStatus.value = 'PROCESSING'
  resultOrderNo.value = null
  resultMsg.value = '抢到啦, 订单生成中...'
  seckillPaid.value = false   // 新一轮抢购, 重置支付态
  resultVisible.value = true
  startPolling(activityId)
}

// 支付秒杀订单 (拿轮询到的 orderNo 调 /seckill/pay/{orderNo})
async function handlePaySeckill() {
  if (!resultOrderNo.value) return
  paying.value = true
  try {
    await paySeckillOrder(resultOrderNo.value)
    seckillPaid.value = true
    resultMsg.value = '支付成功'
  } catch (e) {
    console.error('[seckill] pay', e)
  } finally {
    paying.value = false
  }
}

function startPolling(activityId: number) {
  stopPolling()
  let attempts = 0
  pollTimer = setInterval(async () => {
    attempts++
    try {
      const r = await querySeckillResult(activityId)
      if (r.status === 'SUCCESS') {
        stopPolling()
        resultStatus.value = 'SUCCESS'
        resultOrderNo.value = r.orderNo
        resultMsg.value = r.message
      } else if (r.status === 'NOT_FOUND') {
        // 抢到名额后正常是 PROCESSING→SUCCESS; 出现 NOT_FOUND 当失败处理
        stopPolling()
        resultStatus.value = 'NOT_FOUND'
        resultMsg.value = r.message
      } else if (attempts >= MAX_POLL) {
        // 还在 PROCESSING 但轮询超时: 秒杀单不在"我的订单"里(独立表, 后端没开查/付口),
        // 所以不指向那里, 只提示稍后重试 (重进秒杀页点抢购会再轮询当前结果)
        stopPolling()
        resultMsg.value = '订单生成较慢, 请稍候片刻再试'
      }
    } catch {
      // 单次查询失败不中断, 等下次; 到上限再兜底
      if (attempts >= MAX_POLL) {
        stopPolling()
        resultMsg.value = '查询超时, 请稍后重试'
      }
    }
  }, 1000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

onMounted(load)
onUnmounted(stopPolling)   // 离开页面清定时器, 防泄漏
</script>

<template>
  <div class="seckill-page" v-loading="loading">
    <h2 class="page-title">⚡ 限时秒杀</h2>

    <div class="sk-list">
      <div v-for="a in activities" :key="a.id" class="sk-card">
        <img :src="a.productImage" class="sk-img" :alt="a.productName" />
        <div class="sk-info">
          <div class="sk-name">{{ a.productName }}</div>
          <div class="sk-price-row">
            <span class="sk-price">¥{{ a.seckillPrice }}</span>
            <span class="sk-origin">¥{{ a.originalPrice }}</span>
            <span class="sk-saved">立省 ¥{{ saved(a) }}</span>
          </div>
          <div class="sk-meta">
            限量 {{ a.stock }} 件 · {{ fmt(a.startTime) }} ~ {{ fmt(a.endTime) }}
          </div>
        </div>
        <div class="sk-action">
          <el-tag :type="a.status === 1 ? 'danger' : 'info'" size="small">{{ a.statusDesc }}</el-tag>
          <el-button
            type="danger"
            :disabled="a.status !== 1"
            :loading="grabbingId === a.id"
            @click="grab(a)"
          >
            {{ a.status === 1 ? '立即抢购' : '未开始' }}
          </el-button>
        </div>
      </div>

      <el-empty v-if="!loading && activities.length === 0" description="暂无秒杀活动" />
    </div>

    <!-- 抢购结果弹框 (轮询) -->
    <el-dialog v-model="resultVisible" title="秒杀结果" width="360px" @close="stopPolling">
      <div class="result-box">
        <template v-if="resultStatus === 'PROCESSING'">
          <el-icon class="spin"><Loading /></el-icon>
          <p>{{ resultMsg }}</p>
        </template>
        <template v-else-if="resultStatus === 'SUCCESS'">
          <el-icon color="#67c23a" :size="40"><CircleCheckFilled /></el-icon>
          <p>{{ resultMsg }}</p>
          <p v-if="resultOrderNo" class="order-no">订单号: {{ resultOrderNo }}</p>
          <el-button
            v-if="resultOrderNo && !seckillPaid"
            type="danger" :loading="paying"
            style="margin-top: 14px"
            @click="handlePaySeckill"
          >
            立即支付
          </el-button>
          <p v-if="seckillPaid" class="paid-note">✅ 已支付</p>
        </template>
        <template v-else>
          <el-icon color="#e6a23c" :size="40"><WarningFilled /></el-icon>
          <p>{{ resultMsg }}</p>
        </template>
      </div>
      <template #footer>
        <el-button @click="resultVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.seckill-page {
  width: 1000px;
  margin: 0 auto;
  padding: 16px 0 60px;
  min-height: 300px;
}
.page-title {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 16px;
  color: var(--price);
}
.sk-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.sk-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #ffe2de;
}
.sk-img {
  width: 90px;
  height: 90px;
  object-fit: cover;
  border-radius: 6px;
  background: #f5f5f5;
}
.sk-info {
  flex: 1;
}
.sk-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}
.sk-price-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.sk-price {
  font-size: 22px;
  font-weight: 800;
  color: var(--price);
}
.sk-origin {
  font-size: 13px;
  color: var(--text-secondary);
  text-decoration: line-through;
}
.sk-saved {
  font-size: 12px;
  color: var(--price);
  border: 1px solid var(--price);
  border-radius: 3px;
  padding: 1px 5px;
}
.sk-meta {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}
.sk-action {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}
.result-box {
  text-align: center;
  padding: 10px 0;
}
.result-box p {
  margin: 12px 0 0;
  color: var(--text-primary);
}
.order-no {
  font-size: 13px;
  color: var(--text-secondary);
}
.paid-note {
  color: #67c23a;
  font-weight: 600;
}
.spin {
  font-size: 30px;
  color: var(--primary);
  animation: rotating 1.4s linear infinite;
}
@keyframes rotating {
  from { transform: rotate(0); }
  to { transform: rotate(360deg); }
}
</style>
