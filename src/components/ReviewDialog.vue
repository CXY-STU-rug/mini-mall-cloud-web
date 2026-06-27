<script setup lang="ts">
/**
 * 评价弹窗 — 给"某订单里的某件商品"写一条评价
 *
 * 用法 (父组件):
 *   <ReviewDialog
 *     v-model="visible"        // 控制开关 (= :modelValue + @update:modelValue)
 *     :order-id="orderId"
 *     :product-id="item.productId"
 *     :product-name="item.productName"
 *     :product-image="item.productImage"
 *     @submitted="reload"      // 提交成功后通知父组件刷新
 *   />
 *
 * 数据流: 子组件不直接改父亲的 visible, 而是 emit('update:modelValue', false) 让父亲改。
 */
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { createReview } from '@/api/review'
import ProductImage from '@/components/ProductImage.vue'

// 入参: v-model 的值 + 这条评价针对哪个订单/商品 + 展示用的商品名/图
const props = defineProps<{
  modelValue: boolean
  orderId: number
  productId: number
  productName: string
  productImage?: string
}>()

// 对外事件: 改 v-model(开关) + 提交成功
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'submitted'): void
}>()

const rating = ref(5)        // 星级, 默认 5 星
const content = ref('')      // 评价文字 (选填)
const submitting = ref(false)

// 每次"打开"时把表单重置 (避免上次的残留)
watch(() => props.modelValue, (open) => {
  if (open) {
    rating.value = 5
    content.value = ''
  }
})

// 关闭 = 喊父亲把 v-model 置 false
function close() {
  emit('update:modelValue', false)
}

async function submit() {
  if (rating.value < 1) {
    ElMessage.warning('请先给个评分')
    return
  }
  submitting.value = true
  try {
    await createReview({
      orderId: props.orderId,
      productId: props.productId,
      rating: rating.value,
      content: content.value.trim() || undefined   // 空内容不发
    })
    ElMessage.success('评价成功')
    emit('submitted')   // 通知父组件刷新 (按钮会变"已评价")
    close()
  } catch (e) {
    console.error('[reviewDialog] submit', e)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <!-- :model-value + @update:model-value: 把 el-dialog 的开关接到本组件的 v-model 上 -->
  <el-dialog
    :model-value="modelValue"
    title="评价商品"
    width="440px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <!-- 顶部展示是给哪件商品评价 -->
    <div class="rd-product">
      <div class="rd-img"><ProductImage :src="productImage" :alt="productName" /></div>
      <span class="rd-name">{{ productName }}</span>
    </div>

    <div class="rd-row">
      <span class="rd-label">评分</span>
      <el-rate v-model="rating" />
    </div>

    <el-input
      v-model="content"
      type="textarea"
      :rows="4"
      maxlength="200"
      show-word-limit
      placeholder="说说这件商品怎么样 (选填)"
    />

    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">提交评价</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.rd-product {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}
.rd-img {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 6px;
  background: #f5f5f5;
}
.rd-name {
  font-size: 14px;
  color: var(--text-primary);
}
.rd-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}
.rd-label {
  font-size: 14px;
  color: var(--text-regular);
}
</style>
