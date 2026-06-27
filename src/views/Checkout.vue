<script setup lang="ts">
/**
 * 确认订单页 (结算) — WEB.6
 *
 * 怎么进来: 购物车页"去结算"带着 ?ids=12,13 跳过来 (勾选的 cartItemId)。
 *
 * 页面拼四块:
 *   ① 收货地址: listAddress() 列出, 单选一个 (默认选 isDefault 那条)
 *   ② 商品清单: getCart() 拉全部, 按 ids 过滤出要下单的几条
 *   ③ 优惠券: listMyCoupons() 拉我的券, 前端筛"可用"(未用+未过期+够门槛), 单选一张
 *   ④ 备注 + 合计 + 提交
 *
 * 提交: createOrder({ addressId, cartItemIds, remark, userCouponId })
 *   → 后端返 { orderNo, orderId }
 *   → 跳支付页 /pay/{orderNo}?orderId={orderId}
 *
 * 边界处理:
 *   - 没带 ids / ids 对不上购物车 → 提示并回购物车
 *   - 没有收货地址 → 提示去新增
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getCart, type CartItemVO } from '@/api/cart'
import { listAddress, type Address } from '@/api/address'
import { createOrder } from '@/api/order'
import { listMyCoupons, type UserCouponVO } from '@/api/coupon'
import { useCartStore } from '@/stores/cart'

const route = useRoute()
const router = useRouter()
const cartStore = useCartStore()

const addresses = ref<Address[]>([])
const selectedAddrId = ref<number | null>(null)
const items = ref<CartItemVO[]>([])
const remark = ref('')
const loading = ref(true)
const submitting = ref(false)

const coupons = ref<UserCouponVO[]>([])              // 我的全部券
const selectedCouponId = ref<number | undefined>()   // 选中的 userCouponId (undefined=不使用)

// 从 URL ?ids=12,13 解析出要下单的 cartItemId 数组
const cartItemIds = computed<number[]>(() => {
  const raw = (route.query.ids as string) || ''
  return raw.split(',').map(Number).filter(n => !Number.isNaN(n))
})

// 商品合计 (要下单的这几条小计相加)
const totalAmount = computed(() =>
  items.value.reduce((sum, i) => sum + i.price * i.quantity, 0)
)

// 可用券: 未用(status===0) + 未过期 + 商品合计够门槛(threshold)
const availableCoupons = computed(() =>
  coupons.value.filter(c => c.status === 0 && !c.expired && c.threshold <= totalAmount.value)
)

// 当前选中的那张券 (选中的 id 不在可用列表里就当没选, 防止脏选)
const selectedCoupon = computed(() =>
  availableCoupons.value.find(c => c.id === selectedCouponId.value) ?? null
)

// 优惠金额: 选了券就减 discount, 但封顶到商品合计 (不让应付变负)
const discount = computed(() =>
  selectedCoupon.value ? Math.min(selectedCoupon.value.discount, totalAmount.value) : 0
)

// 应付金额 = 商品合计 - 优惠
const payAmount = computed(() => Math.max(0, totalAmount.value - discount.value))

async function loadData() {
  loading.value = true
  try {
    const [cart, addrs, mine] = await Promise.all([getCart(), listAddress(), listMyCoupons()])
    // 按 ids 过滤出要结算的商品
    const idSet = new Set(cartItemIds.value)
    items.value = cart.filter(i => idSet.has(i.cartItemId))

    coupons.value = mine
    addresses.value = addrs
    // 默认选中: isDefault==1 的那条, 没有就第一条
    const def = addrs.find(a => a.isDefault === 1)
    selectedAddrId.value = def?.id ?? addrs[0]?.id ?? null
  } catch (e) {
    console.error('[checkout] loadData', e)
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (items.value.length === 0) {
    ElMessage.warning('没有要结算的商品, 请返回购物车')
    return
  }
  if (selectedAddrId.value == null) {
    ElMessage.warning('请先选择收货地址')
    return
  }
  submitting.value = true
  try {
    const res = await createOrder({
      addressId: selectedAddrId.value,
      cartItemIds: cartItemIds.value,
      remark: remark.value,
      userCouponId: selectedCoupon.value?.id   // 没选券就是 undefined, 不带券
    })
    cartStore.refreshCount()    // 下单后购物车里这几条被消费, 刷新徽章
    ElMessage.success('下单成功, 请支付')
    // 跳支付页: orderNo 放路径(展示), orderId 放 query(支付接口要用)
    router.replace(`/pay/${res.orderNo}?orderId=${res.orderId}`)
  } catch (e) {
    console.error('[checkout] submit', e)
  } finally {
    submitting.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <div class="checkout-page" v-loading="loading">
    <h2 class="page-title">确认订单</h2>

    <!-- ① 收货地址 -->
    <section class="block">
      <div class="block-title">收货地址</div>
      <div v-if="addresses.length === 0" class="empty-addr">
        还没有收货地址
        <el-button type="primary" link @click="router.push('/user/address')">去新增</el-button>
      </div>
      <div v-else class="addr-list">
        <label
          v-for="a in addresses"
          :key="a.id"
          class="addr-card"
          :class="{ active: a.id === selectedAddrId }"
        >
          <input
            type="radio"
            :value="a.id"
            v-model="selectedAddrId"
            class="addr-radio"
          />
          <div class="addr-body">
            <div class="addr-line1">
              <span class="receiver">{{ a.receiver }}</span>
              <span class="phone">{{ a.phone }}</span>
              <el-tag v-if="a.isDefault === 1" size="small" type="danger">默认</el-tag>
            </div>
            <div class="addr-line2">
              {{ a.province }}{{ a.city }}{{ a.district }} {{ a.detail }}
            </div>
          </div>
        </label>
        <el-button type="primary" link @click="router.push('/user/address')">管理地址</el-button>
      </div>
    </section>

    <!-- ② 商品清单 -->
    <section class="block">
      <div class="block-title">商品清单</div>
      <div v-for="i in items" :key="i.cartItemId" class="goods-row">
        <img :src="i.productImage" class="thumb" :alt="i.productName" />
        <span class="gname">{{ i.productName }}</span>
        <span class="gprice">¥{{ i.price }}</span>
        <span class="gqty">× {{ i.quantity }}</span>
        <span class="gsub price">¥{{ (i.price * i.quantity).toFixed(2) }}</span>
      </div>
      <el-empty v-if="!loading && items.length === 0" description="没有要结算的商品" />
    </section>

    <!-- ③ 优惠券 -->
    <section class="block">
      <div class="block-title">优惠券</div>
      <div v-if="availableCoupons.length === 0" class="no-coupon">
        暂无可用优惠券
      </div>
      <el-select
        v-else
        v-model="selectedCouponId"
        placeholder="不使用优惠券"
        clearable
        style="width: 360px"
      >
        <el-option
          v-for="c in availableCoupons"
          :key="c.id"
          :label="`满${c.threshold}减${c.discount} · ${c.name}`"
          :value="c.id"
        />
      </el-select>
    </section>

    <!-- ④ 备注 -->
    <section class="block">
      <div class="block-title">订单备注</div>
      <el-input v-model="remark" type="textarea" :rows="2" placeholder="选填: 给卖家留言" maxlength="100" show-word-limit />
    </section>

    <!-- 底部提交栏 -->
    <div class="submit-bar">
      <span v-if="discount > 0" class="discount-text">
        已优惠 <span class="discount-val">¥{{ discount.toFixed(2) }}</span>
      </span>
      <span class="total-text">
        应付金额: <span class="price">¥{{ payAmount.toFixed(2) }}</span>
      </span>
      <el-button type="primary" size="large" :loading="submitting" @click="submit">
        提交订单
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.checkout-page {
  width: 1000px;
  margin: 0 auto;
  padding: 16px 0 100px;
}
.page-title {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 16px;
  color: var(--text-primary);
}
.block {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
}
.block-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 14px;
  border-left: 3px solid var(--primary);
  padding-left: 10px;
}
.empty-addr {
  color: var(--text-secondary);
}
.addr-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.addr-card {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 14px 16px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}
.addr-card.active {
  border-color: var(--primary);
  background: var(--primary-light);
}
.addr-radio {
  accent-color: var(--primary);
}
.addr-line1 {
  display: flex;
  align-items: center;
  gap: 10px;
}
.receiver {
  font-weight: 600;
  color: var(--text-primary);
}
.phone {
  color: var(--text-regular);
}
.addr-line2 {
  margin-top: 4px;
  font-size: 13px;
  color: var(--text-secondary);
}
.goods-row {
  display: grid;
  grid-template-columns: 60px 1fr 100px 80px 120px;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}
.thumb {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 6px;
  background: #f5f5f5;
}
.gname {
  font-size: 14px;
  color: var(--text-primary);
}
.gprice,
.gqty {
  color: var(--text-secondary);
  font-size: 13px;
}
.price {
  color: var(--price);
  font-weight: 700;
}
.submit-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: #fff;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 24px;
  padding: 0 calc((100% - 1000px) / 2);
  z-index: 10;
}
.total-text .price {
  font-size: 24px;
}
.no-coupon {
  color: var(--text-secondary);
  font-size: 14px;
}
.discount-text {
  color: var(--text-secondary);
  font-size: 14px;
}
.discount-val {
  color: var(--price);
  font-weight: 600;
}
</style>
