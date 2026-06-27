import { http } from './http'

/**
 * 用户资料 API (调 mini-mall-user 服务, 网关代理 /user/**)
 *
 *   GET /user/{id}   按 id 查用户 (password 后端已置 null)
 *   PUT /user/me     更新当前登录用户资料 (userId 后端从 X-User-Id 拿)
 */

// 跟后端 User 实体对外字段一致 (不含 password)
export interface UserProfile {
  id: number
  username: string
  nickname?: string
  phone?: string
  email?: string
  avatar?: string
  role: number
  status: number
  createTime?: string
}

/** GET /user/{id} — 查用户资料 */
export function getUserById(id: number): Promise<UserProfile> {
  return http.get(`/user/${id}`)
}

// 更新资料的入参 (跟后端 UpdateProfileDTO 字段一致, 都可选)
export interface UpdateProfileParams {
  nickname?: string
  phone?: string
  email?: string
  avatar?: string   // 头像 url (先 uploadFile 拿到 url 再带过来)
}

/** PUT /user/me — 更新当前登录用户的资料 (userId 后端从 X-User-Id 拿)
 *  ⚠ 后端返回 Result<Void>, 拿不到更新后的资料, 所以返回 void;
 *    调用方保存后需自己重新 getUserById 拉最新 (见 Profile.vue save) */
export function updateProfile(data: UpdateProfileParams): Promise<void> {
  return http.put('/user/me', data)
}
