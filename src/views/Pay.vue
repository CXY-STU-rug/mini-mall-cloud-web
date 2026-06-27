<script setup lang="ts">
/**
 * 支付页 — WEB.6
 *
 * 怎么进来: 结算页下单成功后 router.replace(`/pay/{orderNo}?orderId={id}`)。
 *   - orderNo 在路径里 (给人看的单号)
 *   - orderId 在 query 里 (调支付接口要用的主键)
 *
 * 后端支付是【本地模拟】: POST /order/{orderId}/pay 直接把订单标成已支付,
 *   不接真支付渠道。所以这里点"立即支付"就是调这个接口。
 *
 * 支付方式(微信/支付宝)是【纯前端展示】: payOrder 不收方式参数,
 *   选哪个只影响提示文案, 后端一律标记已付。
 *
 * 页面: 拉订单详情展示金额 → 选支付方式 → 点支付 → 成功后给"查看订单 / 继续购物"出口。
 */
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getOrderDetail, payOrder, type OrderDetailVO } from '@/api/order'

const route = useRoute()
const router = useRouter()

const orderNo = route.params.orderNo as string
const orderId = Number(route.query.orderId)

const order = ref<OrderDetailVO | null>(null)
const loading = ref(true)
const paying = ref(false)
const paid = ref(false)   // 是否已支付成功 (控制页面切到成功态)

// 模拟支付方式 (纯前端, payOrder 不收参数, 只影响提示文案)
type PayMethod = 'wechat' | 'alipay'
const payMethod = ref<PayMethod>('wechat')
const methods: { key: PayMethod; label: string; icon: string }[] = [
  { key: 'wechat', label: '微信支付', icon: '💚' },
  { key: 'alipay', label: '支付宝', icon: '🔷' }
]

async function loadOrder() {
  loading.value = true
  try {
    order.value = await getOrderDetail(orderId)
    // 后端 status: 0 待支付 1 已支付... 进来就已支付的话直接显示成功
    if (order.value.status >= 1) paid.value = true
  } catch (e) {
    console.error('[pay] loadOrder', e)
  } finally {
    loading.value = false
  }
}

async function handlePay() {
  paying.value = true
  try {
    await payOrder(orderId)
    paid.value = true
    const label = methods.find(m => m.key === payMethod.value)?.label ?? '支付'
    ElMessage.success(`${label}成功`)
  } catch (e) {
    console.error('[pay] handlePay', e)
  } finally {
    paying.value = false
  }
}

onMounted(loadOrder)
</script>

<template>
  <div class="pay-page" v-loading="loading">
    <!-- 支付成功态 -->
    <div v-if="paid" class="pay-result">
      <el-result icon="success" title="支付成功" :sub-title="`订单号: ${orderNo}`">
        <template #extra>
          <el-button type="primary" @click="router.push('/user/orders')">查看订单</el-button>
          <el-button @click="router.push('/')">继续购物</el-button>
        </template>
      </el-result>
    </div>

    <!-- 待支付态 -->
    <div v-else-if="order" class="pay-box">
      <div class="head">
        <el-icon class="clock"><i class="el-icon" /></el-icon>
        <div>
          <div class="tip">订单提交成功, 请尽快支付</div>
          <div class="orderno">订单号: {{ orderNo }}</div>
        </div>
      </div>

      <div class="amount-row">
        应付金额
        <span class="amount">¥{{ order.totalAmount?.toFixed?.(2) ?? order.totalAmount }}</span>
      </div>

      <div class="addr">
        寄往: {{ order.receiver }} {{ order.phone }} — {{ order.address }}
      </div>

      <!-- 模拟支付方式 (纯前端选择, 真支付要接渠道) -->
      <div class="methods">
        <div class="methods-title">选择支付方式</div>
        <div
          v-for="m in methods"
          :key="m.key"
          class="method"
          :class="{ active: payMethod === m.key }"
          @click="payMethod = m.key"
        >
          <span class="m-icon">{{ m.icon }}</span>
          <span class="m-label">{{ m.label }}</span>
          <span class="m-radio">{{ payMethod === m.key ? '●' : '○' }}</span>
        </div>
      </div>

      <el-button
        type="primary" size="large" class="pay-btn"
        :loading="paying" @click="handlePay"
      >
        立即支付 ¥{{ order.totalAmount?.toFixed?.(2) ?? order.totalAmount }}
      </el-button>
    </div>

    <el-empty v-else-if="!loading" description="订单不存在" />
  </div>
</template>

<style scoped>
.pay-page {
  width: 700px;
  margin: 40px auto;
  min-height: 400px;
}
.pay-box {
  background: #fff;
  border-radius: 8px;
  padding: 32px;
}
.head {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;
}
.tip {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}
.orderno {
  margin-top: 4px;
  font-size: 13px;
  color: var(--text-secondary);
}
.amount-row {
  margin: 24px 0 8px;
  font-size: 14px;
  color: var(--text-regular);
  display: flex;
  align-items: baseline;
  gap: 12px;
}
.amount {
  color: var(--price);
  font-size: 32px;
  font-weight: 800;
}
.addr {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 24px;
}
.methods {
  margin-bottom: 28px;
}
.methods-title {
  font-size: 14px;
  color: var(--text-regular);
  margin-bottom: 12px;
}
.method {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  padding: 16px;
  color: var(--text-primary);
  cursor: pointer;
  margin-bottom: 12px;
  transition: border-color 0.2s, background 0.2s;
}
.method.active {
  border-color: var(--primary);
  background: var(--primary-light);
}
.m-icon {
  font-size: 22px;
}
.m-label {
  flex: 1;
  font-weight: 600;
}
.m-radio {
  color: var(--primary);
  font-size: 16px;
}
.pay-btn {
  width: 100%;
}
.pay-result {
  background: #fff;
  border-radius: 8px;
  padding: 40px;
}
</style>
