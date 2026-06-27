import { http } from './http'

/**
 * 购物车 API (调 mini-mall-order 服务, 数据存后端 Redis)
 *
 * ⚠ 后端实际路径 (校正自规划文档):
 *   GET    /cart        我的购物车 (返 CartItemVO[])     ← 没有单独 /cart/count, 用 list.length 当数量
 *   POST   /cart        加购 { productId, quantity }
 *   PUT    /cart/{id}   改数量 { quantity }   ← 这个 id 是 cartItemId, 不是 productId!
 *   DELETE /cart/{id}   删除                  ← 同上, 用 cartItemId
 */

// 跟后端 CartItemVO 字段一致
export interface CartItemVO {
  cartItemId: number     // 购物车项 id (增删改用它)
  productId: number      // 商品 id
  productName: string
  productImage: string
  price: number          // 单价
  quantity: number       // 数量
  subtotal: number       // 小计 = price * quantity (后端算好)
}

/** GET /cart — 我的购物车列表 */
export function getCart(): Promise<CartItemVO[]> {
  return http.get('/cart')
}

/** POST /cart — 加购 */
export function addToCart(productId: number, quantity: number): Promise<void> {
  return http.post('/cart', { productId, quantity })
}

/** PUT /cart/{cartItemId} — 改数量 (≤0 后端会当删除处理) */
export function updateCartQuantity(cartItemId: number, quantity: number): Promise<void> {
  return http.put(`/cart/${cartItemId}`, { quantity })
}

/** DELETE /cart/{cartItemId} — 删除购物车项 */
export function removeCartItem(cartItemId: number): Promise<void> {
  return http.delete(`/cart/${cartItemId}`)
}
