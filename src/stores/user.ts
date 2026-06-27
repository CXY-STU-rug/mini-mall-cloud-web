import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * Pinia 用户状态 store (C 端版)
 *
 * 跟 admin 几乎一样, 区别:
 *   ① localStorage key 改成 web-* (跟 admin 的 admin-* 隔开, 同机两个前端互不踩)
 *   ② 去掉 isAdmin 限制 — C 端是给普通用户用的, 不卡 role
 *
 * 存 3 件事:
 *   token     - JWT, 每次请求带它
 *   userInfo  - 用户信息
 *   持久化到 localStorage, 刷新不丢
 */
export const useUserStore = defineStore('user', () => {

  // ─── state (启动时优先从 localStorage 读) ──────
  const token = ref<string>(localStorage.getItem('web-token') || '')
  const userInfo = ref<UserInfo | null>(
    JSON.parse(localStorage.getItem('web-user-info') || 'null')
  )

  // ─── computed ─────────────────────────────────
  const isLogin = computed(() => !!token.value)

  // ─── actions ──────────────────────────────────
  function login(newToken: string, info: UserInfo) {
    token.value = newToken
    userInfo.value = info
    localStorage.setItem('web-token', newToken)
    localStorage.setItem('web-user-info', JSON.stringify(info))
  }

  function logout() {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('web-token')
    localStorage.removeItem('web-user-info')
  }

  // 更新本地用户信息 (改资料/头像后调, 不动 token)
  function setUserInfo(info: UserInfo) {
    userInfo.value = info
    localStorage.setItem('web-user-info', JSON.stringify(info))
  }

  return { token, userInfo, isLogin, login, logout, setUserInfo }
})

// ─── 类型定义 (跟后端 auth 服务 User 字段一致) ──
export interface UserInfo {
  id: number
  username: string
  nickname?: string
  email?: string
  phone?: string
  avatar?: string
  role: number           // 0=普通 1=管理员
  status: number         // 0=禁用 1=正常
}
