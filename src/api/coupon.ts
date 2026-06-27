import { http } from './http'

/**
 * 优惠券 API (调 mini-mall-user 服务, 网关代理 /coupon/**)
 *
 *   GET  /coupon/available     当前可领的券 (公开)
 *   GET  /coupon/mine          我的券 (需登录)
 *   POST /coupon/{id}/receive  领券
 *
 * 券类型 type: 后端约定 (1=满减 等), threshold=门槛, discount=优惠额。
 */

// 券模板 (可领列表用)
export interface Coupon {
  id: number
  name: string
  type: number
  threshold: number      // 满多少可用
  discount: number       // 减多少
  validFrom?: string
  validTo?: string
}

// 我的券 (UserCouponVO: 把 user_coupon + coupon 模板合并)
export interface UserCouponVO {
  id: number             // user_coupon 主键
  couponId: number
  status: number         // 0=未用 1=已用
  expired: boolean       // 后端算好的"是否过期"
  name: string
  type: number
  threshold: number
  discount: number
  validFrom: string
  validTo: string
  receiveTime: string
}

/** GET /coupon/available — 可领取的券 */
export function listAvailableCoupons(): Promise<Coupon[]> {
  return http.get('/coupon/available')
}

/** GET /coupon/mine — 我的券 */
export function listMyCoupons(): Promise<UserCouponVO[]> {
  return http.get('/coupon/mine')
}

/** POST /coupon/{couponId}/receive — 领券 */
export function receiveCoupon(couponId: number): Promise<void> {
  return http.post(`/coupon/${couponId}/receive`)
}
