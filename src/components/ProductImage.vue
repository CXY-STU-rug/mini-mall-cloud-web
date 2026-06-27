<script setup lang="ts">
/**
 * 商品图 (统一兜底) — 空 src 或加载失败时显示"暂无图片"占位, 不露裂图
 *
 * 用法: 放进一个有尺寸的容器里 (或自己带尺寸 class), 它会填满 100%:
 *   <div class="thumb"><ProductImage :src="x.coverImage" :alt="x.name" /></div>
 *
 * 设计:
 *   - 尺寸不归本组件管, 由外层容器/class 决定; 内部图片/占位都填 100%
 *   - border-radius: inherit 继承外层圆角 + overflow:hidden 自己裁切 → 圆角图不出框
 */
import { ref, computed, watch } from 'vue'

const props = defineProps<{ src?: string; alt?: string }>()

const failed = ref(false)
// src 变了(列表里同一组件被复用渲染不同商品)就重置失败标记, 否则换了商品还显示占位
watch(() => props.src, () => { failed.value = false })

// 有 src 且没加载失败才显示图, 否则占位
const ok = computed(() => !!props.src && !failed.value)
</script>

<template>
  <div class="pi-wrap">
    <img v-if="ok" :src="src" :alt="alt" @error="failed = true" />
    <div v-else class="pi-fallback">暂无图片</div>
  </div>
</template>

<style scoped>
.pi-wrap {
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: inherit;   /* 继承外层圆角, 让圆角缩略图也裁切干净 */
  background: #f5f5f5;
}
.pi-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.pi-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c0c4cc;
  font-size: 12px;
  white-space: nowrap;
}
</style>
