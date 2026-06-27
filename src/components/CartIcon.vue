<script setup lang="ts">
/**
 * 右上角购物车图标 + 红色数字徽章
 *
 * 点击跳 /cart。徽章数字来自 cartStore.count (全局共享, 任何页面加购后都会变)。
 */
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { ShoppingCart } from '@element-plus/icons-vue'

const router = useRouter()
const cartStore = useCartStore()
</script>

<template>
  <!-- el-badge: Element Plus 的徽章组件, :value 是数字, :hidden 控制 0 时不显示 -->
  <el-badge :value="cartStore.count" :hidden="cartStore.count === 0" class="cart-badge">
    <div class="cart-btn" @click="router.push('/cart')">
      <el-icon :size="20"><ShoppingCart /></el-icon>
      <span class="cart-text">购物车</span>
    </div>
  </el-badge>
</template>

<style scoped>
.cart-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  color: var(--primary);
  background: var(--bg-white);
  transition: all 0.2s;
}
.cart-btn:hover {
  border-color: var(--primary);
  background: var(--primary-light);
}
.cart-text {
  font-size: 14px;
}
/* 让徽章数字用我们的电商红 */
.cart-badge :deep(.el-badge__content) {
  background-color: var(--primary);
}
</style>
