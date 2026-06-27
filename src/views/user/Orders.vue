<script setup lang="ts">
/**
 * 我的订单 — WEB.7
 *
 * 套在 UserLayout 里。一次拉全部订单 (GET /order/my), 前端按状态 tab 过滤。
 *
 * 订单状态 status: 0待付款 1已付款(待发货) 2已发货(待收货) 3已完成 4已关闭
 *   后端已给 statusDesc 中文, 直接显示, 不自己映射。
 *
 * 按状态显示不同操作按钮:
 *   0 待付款  → [去支付] [取消订单]
 *   2 待收货  → [确认收货]
 *   其它      → 只看详情
 *
 * 操作完调 load() 重拉列表 (最简单稳妥的刷新方式)。
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { listMyOrders, cancelOrder, signOrder, type OrderListVO } from '@/api/order'
import ProductImage from '@/components/ProductImage.vue'

const router = useRouter()

const orders = ref<OrderListVO[]>([])
const loading = ref(true)
const activeStatus = ref<number | -1>(-1)   // -1 = 全部

// tab 定义 (value 对应后端 status, -1 是"全部")
const tabs = [
  { label: '全部', value: -1 },
  { label: '待付款', value: 0 },
  { label: '待发货', value: 1 },
  { label: '待收货', value: 2 },
  { label: '已完成', value: 3 }
]

// 当前 tab 过滤后的订单
const filteredOrders = computed(() =>
  activeStatus.value === -1
    ? orders.value
    : orders.value.filter(o => o.status === activeStatus.value)
)

async function load() {
  loading.value = true
  try {
    orders.value = await listMyOrders()
  } catch (e) {
    console.error('[orders] load', e)
  } finally {
    loading.value = false
  }
}

// 去支付: 跳支付页 (带 orderId)
function goPay(o: OrderListVO) {
  router.push(`/pay/${o.orderNo}?orderId=${o.orderId}`)
}

async function onCancel(o: OrderListVO) {
  try {
    await ElMessageBox.confirm(`确定取消订单 ${o.orderNo}?`, '提示', {
      type: 'warning', confirmButtonText: '取消订单', cancelButtonText: '再想想'
    })
  } catch {
    return
  }
  try {
    await cancelOrder(o.orderId)
    ElMessage.success('订单已取消')
    load()
  } catch (e) {
    console.error('[orders] cancel', e)
  }
}

async function onSign(o: OrderListVO) {
  try {
    await ElMessageBox.confirm('确认已收到货?', '确认收货', {
      type: 'warning', confirmButtonText: '确认收货', cancelButtonText: '取消'
    })
  } catch {
    return
  }
  try {
    await signOrder(o.orderId)
    ElMessage.success('确认收货成功')
    load()
  } catch (e) {
    console.error('[orders] sign', e)
  }
}

onMounted(load)
</script>

<template>
  <div class="orders-page">
    <h3 class="page-title">我的订单</h3>

    <!-- 状态 tab -->
    <div class="tabs">
      <span
        v-for="t in tabs" :key="t.value"
        class="tab" :class="{ active: activeStatus === t.value }"
        @click="activeStatus = t.value"
      >{{ t.label }}</span>
    </div>

    <div v-loading="loading" class="list">
      <div v-for="o in filteredOrders" :key="o.orderId" class="order-card">
        <!-- 卡头: 单号 + 时间 + 状态 -->
        <div class="card-head">
          <span class="orderno">订单号: {{ o.orderNo }}</span>
          <span class="time">{{ o.createTime }}</span>
          <span class="status">{{ o.statusDesc }}</span>
        </div>

        <!-- 明细行 -->
        <div class="card-body" @click="router.push(`/user/orders/${o.orderId}`)">
          <div v-for="it in o.items" :key="it.orderItemId" class="goods">
            <div class="thumb"><ProductImage :src="it.productImage" :alt="it.productName" /></div>
            <span class="gname">{{ it.productName }}</span>
            <span class="gprice">¥{{ it.price }} × {{ it.quantity }}</span>
          </div>
        </div>

        <!-- 卡尾: 合计 + 操作 -->
        <div class="card-foot">
          <span class="total">合计: <span class="price">¥{{ o.totalAmount }}</span></span>
          <div class="ops">
            <el-button size="small" @click="router.push(`/user/orders/${o.orderId}`)">详情</el-button>
            <template v-if="o.status === 0">
              <el-button size="small" type="primary" @click="goPay(o)">去支付</el-button>
              <el-button size="small" @click="onCancel(o)">取消</el-button>
            </template>
            <el-button v-else-if="o.status === 2" size="small" type="primary" @click="onSign(o)">
              确认收货
            </el-button>
          </div>
        </div>
      </div>

      <el-empty v-if="!loading && filteredOrders.length === 0" description="暂无订单" />
    </div>
  </div>
</template>

<style scoped>
.orders-page {
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
  font-size: 14px;
  color: var(--text-regular);
  border-bottom: 2px solid transparent;
}
.tab.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
  font-weight: 600;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 120px;
}
.order-card {
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
}
.card-head {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 16px;
  background: #fafafa;
  font-size: 13px;
  color: var(--text-secondary);
}
.card-head .status {
  margin-left: auto;
  color: var(--primary);
  font-weight: 600;
}
.card-body {
  padding: 12px 16px;
  cursor: pointer;
}
.goods {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
}
.thumb {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 6px;
  background: #f5f5f5;
}
.gname {
  flex: 1;
  font-size: 14px;
  color: var(--text-primary);
}
.gprice {
  font-size: 13px;
  color: var(--text-secondary);
}
.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid #f5f5f5;
}
.price {
  color: var(--price);
  font-weight: 700;
  font-size: 16px;
}
.ops {
  display: flex;
  gap: 8px;
}
</style>
