<script setup lang="ts">
/**
 * 订单详情 — WEB.7
 *
 * 从订单列表点"详情"进来 (/user/orders/:id)。
 * 拉 getOrderDetail(orderId) 展示: 状态 + 收货信息 + 物流 + 商品清单 + 金额 + 操作。
 *
 * 操作按钮逻辑跟列表页一致 (待付款→去支付/取消, 待收货→确认收货),
 * 操作完重新拉详情刷新。
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getOrderDetail, cancelOrder, signOrder, type OrderDetailVO, type OrderItemVO } from '@/api/order'
import { listMyReviews, type ReviewVO } from '@/api/review'
import ReviewDialog from '@/components/ReviewDialog.vue'
import ProductImage from '@/components/ProductImage.vue'

const route = useRoute()
const router = useRouter()
const orderId = Number(route.params.id)

const order = ref<OrderDetailVO | null>(null)
const loading = ref(true)

// ─── 评价相关 ───
const myReviews = ref<ReviewVO[]>([])         // 我的全部评价 (用来判断哪些已评)
const reviewVisible = ref(false)              // 评价弹窗开关
const reviewTarget = ref<OrderItemVO | null>(null)  // 正在评价哪件商品

// 本订单里"已评价"的 productId 集合 (评价记录里 orderId 对得上的)
const reviewedProductIds = computed(
  () => new Set(myReviews.value.filter(r => r.orderId === orderId).map(r => r.productId))
)
function isReviewed(productId: number): boolean {
  return reviewedProductIds.value.has(productId)
}

// 打开弹窗给某件商品评价
function openReview(item: OrderItemVO) {
  reviewTarget.value = item
  reviewVisible.value = true
}

async function load() {
  loading.value = true
  try {
    // 订单详情 + 我的评价并行拉; 评价拉失败不影响订单展示 (catch 兜成空)
    const [o, rs] = await Promise.all([
      getOrderDetail(orderId),
      listMyReviews().catch(() => [] as ReviewVO[])
    ])
    order.value = o
    myReviews.value = rs
  } catch (e) {
    console.error('[orderDetail] load', e)
  } finally {
    loading.value = false
  }
}

function goPay() {
  if (!order.value) return
  router.push(`/pay/${order.value.orderNo}?orderId=${order.value.orderId}`)
}

async function onCancel() {
  try {
    await ElMessageBox.confirm('确定取消该订单?', '提示', {
      type: 'warning', confirmButtonText: '取消订单', cancelButtonText: '再想想'
    })
  } catch {
    return
  }
  await cancelOrder(orderId)
  ElMessage.success('订单已取消')
  load()
}

async function onSign() {
  try {
    await ElMessageBox.confirm('确认已收到货?', '确认收货', {
      type: 'warning', confirmButtonText: '确认收货', cancelButtonText: '取消'
    })
  } catch {
    return
  }
  await signOrder(orderId)
  ElMessage.success('确认收货成功')
  load()
}

onMounted(load)
</script>

<template>
  <div class="od-page" v-loading="loading">
    <div class="back">
      <el-button link @click="router.push('/user/orders')">← 返回订单列表</el-button>
    </div>

    <template v-if="order">
      <!-- 状态条 -->
      <div class="status-bar">
        <span class="status">{{ order.statusDesc }}</span>
        <div class="ops">
          <template v-if="order.status === 0">
            <el-button type="primary" @click="goPay">去支付</el-button>
            <el-button @click="onCancel">取消订单</el-button>
          </template>
          <el-button v-else-if="order.status === 2" type="primary" @click="onSign">确认收货</el-button>
        </div>
      </div>

      <!-- 收货信息 -->
      <section class="block">
        <div class="block-title">收货信息</div>
        <p><b>{{ order.receiver }}</b> &nbsp; {{ order.phone }}</p>
        <p class="muted">{{ order.address }}</p>
        <p v-if="order.remark" class="muted">备注: {{ order.remark }}</p>
      </section>

      <!-- 物流 (已发货才有) -->
      <section v-if="order.logisticsNo" class="block">
        <div class="block-title">物流信息</div>
        <p>{{ order.logisticsCompany }} &nbsp; 单号: {{ order.logisticsNo }}</p>
      </section>

      <!-- 商品清单 -->
      <section class="block">
        <div class="block-title">商品清单</div>
        <div v-for="it in order.items" :key="it.orderItemId" class="goods">
          <div class="thumb"><ProductImage :src="it.productImage" :alt="it.productName" /></div>
          <span class="gname" @click="router.push(`/product/${it.productId}`)">{{ it.productName }}</span>
          <span class="gprice">¥{{ it.price }} × {{ it.quantity }}</span>
          <span class="gsub price">¥{{ it.subtotal }}</span>
          <!-- 评价列: 仅"已完成"(status===3)订单可评; 评过的显示"已评价" -->
          <span class="greview">
            <template v-if="order.status === 3">
              <el-button v-if="!isReviewed(it.productId)" link type="primary" @click="openReview(it)">评价</el-button>
              <span v-else class="reviewed">已评价</span>
            </template>
          </span>
        </div>
      </section>

      <!-- 金额 + 信息 -->
      <section class="block">
        <div class="info-row"><span>订单号</span><span>{{ order.orderNo }}</span></div>
        <div class="info-row"><span>下单时间</span><span>{{ order.createTime }}</span></div>
        <div v-if="order.payTime" class="info-row"><span>支付时间</span><span>{{ order.payTime }}</span></div>
        <div class="info-row total"><span>实付金额</span><span class="price">¥{{ order.totalAmount }}</span></div>
      </section>
    </template>

    <el-empty v-else-if="!loading" description="订单不存在" />

    <!-- 评价弹窗: 有目标商品才渲染; 提交成功 @submitted 重新 load 刷新"已评价" -->
    <ReviewDialog
      v-if="reviewTarget"
      v-model="reviewVisible"
      :order-id="orderId"
      :product-id="reviewTarget.productId"
      :product-name="reviewTarget.productName"
      :product-image="reviewTarget.productImage"
      @submitted="load"
    />
  </div>
</template>

<style scoped>
.od-page {
  padding: 4px;
  min-height: 300px;
}
.back {
  margin-bottom: 8px;
}
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--primary-light);
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 16px;
}
.status-bar .status {
  font-size: 18px;
  font-weight: 700;
  color: var(--primary);
}
.ops {
  display: flex;
  gap: 8px;
}
.block {
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 16px;
}
.block-title {
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 10px;
  border-left: 3px solid var(--primary);
  padding-left: 8px;
}
.block p {
  margin: 4px 0;
  color: var(--text-regular);
}
.muted {
  color: var(--text-secondary);
  font-size: 13px;
}
.goods {
  display: grid;
  grid-template-columns: 56px 1fr 110px 90px 76px 64px;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #f5f5f5;
}
.greview {
  text-align: right;
}
.reviewed {
  font-size: 12px;
  color: var(--text-secondary);
}
.thumb {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 6px;
  background: #f5f5f5;
}
.gname {
  font-size: 14px;
  color: var(--text-primary);
  cursor: pointer;
}
.gname:hover {
  color: var(--primary);
}
.gprice {
  font-size: 13px;
  color: var(--text-secondary);
}
.info-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 14px;
  color: var(--text-regular);
}
.info-row.total {
  border-top: 1px solid #f0f0f0;
  margin-top: 6px;
  padding-top: 12px;
  font-weight: 700;
}
.price {
  color: var(--price);
  font-weight: 700;
}
</style>
