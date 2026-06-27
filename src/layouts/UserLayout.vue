<script setup lang="ts">
/**
 * 个人中心布局 — 左侧菜单 + 右侧内容区
 *
 * 它本身嵌在 MainLayout 里面 (所以顶栏/页脚还在),
 * 自己再切一块: 左边一列竖菜单, 右边 <RouterView/> 渲染 /user/xxx 子页面。
 *
 * el-menu 的 router 模式: :default-active 设成当前路径, 点菜单自动按 index 跳路由。
 */
import { useRoute } from 'vue-router'
import {
  User, List, Location, Ticket, Star, ChatLineSquare
} from '@element-plus/icons-vue'

const route = useRoute()
</script>

<template>
  <div class="user-layout">
    <!-- 左侧菜单 -->
    <aside class="side">
      <div class="side-title">个人中心</div>
      <el-menu
        :default-active="route.path"
        router
        class="side-menu"
      >
        <el-menu-item index="/user/profile">
          <el-icon><User /></el-icon><span>我的资料</span>
        </el-menu-item>
        <el-menu-item index="/user/orders">
          <el-icon><List /></el-icon><span>我的订单</span>
        </el-menu-item>
        <el-menu-item index="/user/address">
          <el-icon><Location /></el-icon><span>收货地址</span>
        </el-menu-item>
        <el-menu-item index="/user/coupons">
          <el-icon><Ticket /></el-icon><span>我的优惠券</span>
        </el-menu-item>
        <el-menu-item index="/user/favorites">
          <el-icon><Star /></el-icon><span>我的收藏</span>
        </el-menu-item>
        <el-menu-item index="/user/reviews">
          <el-icon><ChatLineSquare /></el-icon><span>我的评价</span>
        </el-menu-item>
      </el-menu>
    </aside>

    <!-- 右侧内容 -->
    <section class="main">
      <RouterView />
    </section>
  </div>
</template>

<style scoped>
.user-layout {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.side {
  width: 200px;
  flex-shrink: 0;
  background: var(--bg-white);
  border-radius: 8px;
  overflow: hidden;
}
.side-title {
  padding: 16px;
  font-weight: 700;
  font-size: 16px;
  border-bottom: 1px solid var(--border);
}
.side-menu {
  border-right: none;
}
.main {
  flex: 1;
  min-width: 0;     /* 防止内容撑破 flex 布局 */
}
</style>
