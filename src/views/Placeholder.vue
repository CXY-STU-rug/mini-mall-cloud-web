<script setup lang="ts">
/**
 * 通用占位页 — 给"还没做"的路由临时顶着用。
 *
 * 这样 WEB.1 阶段导航条/顶栏的每个链接都点得通 (不会兜底跳回首页),
 * 能完整看到布局效果。后面 WEB.2~6 会把对应路由换成真页面。
 *
 * 显示文案取自路由 meta.title。
 */
import { useRoute } from 'vue-router'
const route = useRoute()
</script>

<template>
  <div class="placeholder-page">
    <el-empty :description="`「${route.meta.title || '该页面'}」即将上线`">
      <template #image>
        <div class="emoji">🚧</div>
      </template>
      <p class="hint">这个页面会在后续 WEB.x 阶段实现</p>
    </el-empty>
  </div>
</template>

<style scoped>
.placeholder-page {
  background: var(--bg-white);
  border-radius: 8px;
  padding: 48px 0;
}
.emoji {
  font-size: 64px;
}
.hint {
  color: var(--text-placeholder);
  font-size: 13px;
}
</style>
