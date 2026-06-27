<script setup lang="ts">
/**
 * 购物车页 — WEB.5
 *
 * 功能:
 *   - 拉购物车列表 getCart()
 *   - 每行勾选 (前端状态, 后端不存"选中") → 只对勾选项算合计/去结算
 *   - 改数量 updateCartQuantity() → 改完刷新小计 + 徽章
 *   - 删除 removeCartItem() → 删完刷新列表 + 徽章
 *   - 全选 / 反选
 *   - 底部结算栏: 已选件数 + 合计金额 + 去结算按钮
 *
 * 关键设计:
 *   ① "选中"是纯前端状态。后端购物车没有 selected 字段, 所以我们用一个
 *      Set<cartItemId> 记哪些被勾上, 跟列表数据分开存。
 *   ② 改数量直接调后端 (没做防抖, 量小够用; 大型项目会防抖合并请求)。
 *   ③ 合计、全选状态都用 computed 从 list + 选中集 推导, 不手动维护。
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getCart, updateCartQuantity, removeCartItem, type CartItemVO } from '@/api/cart'
import { useCartStore } from '@/stores/cart'

const router = useRouter()
const cartStore = useCartStore()

const list = ref<CartItemVO[]>([])
const loading = ref(true)
// 选中的购物车项 id 集合 (纯前端)
const selectedIds = ref<Set<number>>(new Set())

async function loadCart() {
  loading.value = true
  try {
    list.value = await getCart()
    // 默认全选 (常见电商默认行为)
    selectedIds.value = new Set(list.value.map(i => i.cartItemId))
  } catch (e) {
    console.error('[cart] loadCart', e)
  } finally {
    loading.value = false
  }
}

// ── 选中相关 ──
function isSelected(id: number) {
  return selectedIds.value.has(id)
}
function toggleSelect(id: number, checked: boolean) {
  // Set 直接增删后, 重新赋值一个新 Set 触发响应式
  const s = new Set(selectedIds.value)
  if (checked) s.add(id)
  else s.delete(id)
  selectedIds.value = s
}

// 全选状态: 列表非空且每一项都被选中
const allSelected = computed(() =>
  list.value.length > 0 && list.value.every(i => selectedIds.value.has(i.cartItemId))
)
function toggleSelectAll(checked: boolean) {
  selectedIds.value = checked
    ? new Set(list.value.map(i => i.cartItemId))
    : new Set()
}

// 已选项 + 合计 (computed 自动跟着 list / selectedIds 变)
const selectedItems = computed(() =>
  list.value.filter(i => selectedIds.value.has(i.cartItemId))
)
const totalCount = computed(() =>
  selectedItems.value.reduce((sum, i) => sum + i.quantity, 0)
)
const totalAmount = computed(() =>
  selectedItems.value.reduce((sum, i) => sum + i.price * i.quantity, 0)
)

// ── 改数量 ──
async function onQuantityChange(item: CartItemVO, val: number) {
  try {
    await updateCartQuantity(item.cartItemId, val)
    item.quantity = val
    item.subtotal = item.price * val   // 本地同步小计, 不用重拉整列表
    cartStore.refreshCount()
  } catch (e) {
    console.error('[cart] updateQuantity', e)
    // 失败回退到原值: 重拉一次最稳
    loadCart()
  }
}

// ── 删除 ──
async function onRemove(item: CartItemVO) {
  try {
    await ElMessageBox.confirm(`确定删除「${item.productName}」?`, '提示', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
  } catch {
    return  // 点了取消
  }
  try {
    await removeCartItem(item.cartItemId)
    ElMessage.success('已删除')
    await loadCart()         // 重拉列表
    cartStore.refreshCount() // 刷新徽章
  } catch (e) {
    console.error('[cart] remove', e)
  }
}

// ── 去结算 ──
function goCheckout() {
  if (selectedItems.value.length === 0) {
    ElMessage.warning('请先勾选要结算的商品')
    return
  }
  // 把勾选的 cartItemId 带到结算页 (WEB.6 用)
  const ids = selectedItems.value.map(i => i.cartItemId).join(',')
  router.push({ path: '/checkout', query: { ids } })
}

onMounted(loadCart)
</script>

<template>
  <div class="cart-page">
    <h2 class="page-title">我的购物车</h2>

    <div v-loading="loading" class="cart-box">
      <!-- 表头 -->
      <div v-if="list.length > 0" class="cart-head">
        <span class="col-check">
          <el-checkbox :model-value="allSelected" @change="toggleSelectAll" />
        </span>
        <span class="col-info">商品</span>
        <span class="col-price">单价</span>
        <span class="col-qty">数量</span>
        <span class="col-sub">小计</span>
        <span class="col-op">操作</span>
      </div>

      <!-- 行 -->
      <div v-for="item in list" :key="item.cartItemId" class="cart-row">
        <span class="col-check">
          <el-checkbox
            :model-value="isSelected(item.cartItemId)"
            @change="(v: any) => toggleSelect(item.cartItemId, v)"
          />
        </span>
        <span class="col-info">
          <img :src="item.productImage" class="thumb" :alt="item.productName" />
          <span class="pname" @click="router.push(`/product/${item.productId}`)">
            {{ item.productName }}
          </span>
        </span>
        <span class="col-price">¥{{ item.price }}</span>
        <span class="col-qty">
          <el-input-number
            :model-value="item.quantity"
            :min="1"
            size="small"
            @change="(v: any) => onQuantityChange(item, v)"
          />
        </span>
        <span class="col-sub price">¥{{ (item.price * item.quantity).toFixed(2) }}</span>
        <span class="col-op">
          <el-button link type="danger" @click="onRemove(item)">删除</el-button>
        </span>
      </div>

      <!-- 空态 -->
      <el-empty v-if="!loading && list.length === 0" description="购物车还是空的">
        <el-button type="primary" @click="router.push('/')">去逛逛</el-button>
      </el-empty>
    </div>

    <!-- 底部结算栏 -->
    <div v-if="list.length > 0" class="settle-bar">
      <el-checkbox :model-value="allSelected" @change="toggleSelectAll">全选</el-checkbox>
      <div class="settle-right">
        <span class="settle-count">已选 <b>{{ totalCount }}</b> 件</span>
        <span class="settle-total">
          合计: <span class="price">¥{{ totalAmount.toFixed(2) }}</span>
        </span>
        <el-button type="primary" size="large" @click="goCheckout">去结算</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cart-page {
  width: 1200px;
  margin: 0 auto;
  padding: 16px 0 80px;
}
.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 16px;
}
.cart-box {
  background: #fff;
  border-radius: 8px;
  padding: 0 16px;
  min-height: 200px;
}
/* 表头 + 行 用同一套网格列宽对齐 */
.cart-head,
.cart-row {
  display: grid;
  grid-template-columns: 50px 1fr 120px 140px 120px 80px;
  align-items: center;
  gap: 8px;
}
.cart-head {
  padding: 14px 0;
  border-bottom: 2px solid #f0f0f0;
  font-size: 13px;
  color: var(--text-secondary);
}
.cart-row {
  padding: 16px 0;
  border-bottom: 1px solid #f5f5f5;
}
.col-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.thumb {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 6px;
  background: #f5f5f5;
}
.pname {
  cursor: pointer;
  color: var(--text-primary);
  font-size: 14px;
}
.pname:hover {
  color: var(--primary);
}
.price {
  color: var(--price);
  font-weight: 700;
}
/* 底部结算栏: 固定在视口底部 */
.settle-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: #fff;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 calc((100% - 1200px) / 2 + 16px);
  z-index: 10;
}
.settle-right {
  display: flex;
  align-items: center;
  gap: 24px;
}
.settle-count b {
  color: var(--primary);
}
.settle-total .price {
  font-size: 22px;
}
</style>
