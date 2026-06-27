import { http } from './http'
import type { Product } from './product'

/**
 * 收藏 API (调 mini-mall-product 服务, 网关代理 /favorite/**)
 *
 *   GET    /favorite/my              我的收藏 (返完整 Product 列表)
 *   POST   /favorite/{productId}     收藏 (Redis Set 去重, 重复收藏不报错)
 *   DELETE /favorite/{productId}     取消收藏
 *   GET    /favorite/{productId}/exists  是否已收藏 (给心形图标用)
 *
 * 收藏数据存后端 Redis, 前端不缓存。
 */

/** GET /favorite/my — 我的收藏列表 */
export function listMyFavorites(): Promise<Product[]> {
  return http.get('/favorite/my')
}

/** POST /favorite/{productId} — 收藏 */
export function addFavorite(productId: number): Promise<void> {
  return http.post(`/favorite/${productId}`)
}

/** DELETE /favorite/{productId} — 取消收藏 */
export function removeFavorite(productId: number): Promise<void> {
  return http.delete(`/favorite/${productId}`)
}

/** GET /favorite/{productId}/exists — 是否已收藏 */
export function checkFavorite(productId: number): Promise<boolean> {
  return http.get(`/favorite/${productId}/exists`)
}
