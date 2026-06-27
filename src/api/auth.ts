import { http } from './http'
import type { UserInfo } from '@/stores/user'

/**
 * 认证相关 API (调 mini-mall-auth 服务)
 *
 * 拦截器已把 baseURL /api 转网关 9080, 也解掉了 Result 包装,
 * 所以这里的返回类型就是 data 部分。
 */

// 后端 /auth/login 返 AuthResponse { token, user }
export interface AuthResponse {
  token: string
  user: UserInfo
}

export interface LoginParams {
  username: string
  password: string
}

export interface RegisterParams {
  username: string
  password: string
  phone?: string
  nickname?: string
}

/** POST /auth/login — 本地账号登录 */
export function loginApi(params: LoginParams): Promise<AuthResponse> {
  return http.post('/auth/login', params)
}

/** POST /auth/register — 注册新用户 (WEB.2 用) */
export function registerApi(params: RegisterParams): Promise<AuthResponse> {
  return http.post('/auth/register', params)
}
