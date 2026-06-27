import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

/**
 * axios 实例 + 拦截器 (C 端商城版, 抄自 admin 改了文案/跳转)
 *
 * 业务代码里 import { http } from '@/api/http' 就直接用:
 *   - 不用每次手动加 Authorization
 *   - 不用每次写 if (resp.code != 200)
 *
 * baseURL '/api'  → Vite 代理到 http://localhost:9080 (网关)
 *
 * 请求拦截器: 从 Pinia 拿 token, 自动塞 Authorization: Bearer xxx
 * 响应拦截器: 后端 Result { code, message, data }
 *   - code === 200 → 直接返 data
 *   - code !== 200 → 弹错误, 抛 Error 让 catch 兜
 *   - HTTP 401     → token 失效, 清登录态, 跳 /login
 *   - HTTP 5xx     → 弹"服务器繁忙"
 */
export const http = axios.create({
  baseURL: '/api',
  timeout: 10000
})

// ─── 请求拦截器: 加 Authorization ────────────────
http.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const userStore = useUserStore()
    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`
    }
    return config
  },
  (err) => Promise.reject(err)
)

// ─── 响应拦截器: 解 Result + 401 处理 ────────────
http.interceptors.response.use(
  // 2xx 进这里
  (resp: AxiosResponse) => {
    const body = resp.data
    if (body?.code === 200) {
      return body.data           // ⭐ 直接给业务代码 data
    }
    ElMessage.error(body?.message || '操作失败')
    return Promise.reject(new Error(body?.message || '操作失败'))
  },

  // 非 2xx 进这里
  (err: AxiosError) => {
    const status = err.response?.status
    const userStore = useUserStore()

    if (status === 401) {
      ElMessage.warning('登录已过期, 请重新登录')
      userStore.logout()
      // 跳 /login (不能 import router 否则循环依赖, 用原生跳转)
      // 带上当前路径, 登录后能跳回来
      const redirect = encodeURIComponent(window.location.pathname + window.location.search)
      window.location.href = `/login?redirect=${redirect}`
    } else if (status && status >= 500) {
      ElMessage.error('服务器繁忙, 请稍后重试')
    } else {
      ElMessage.error(err.message || '网络异常')
    }
    return Promise.reject(err)
  }
)
