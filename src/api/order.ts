import { http } from './http'

/**
 * 订单 API (调 mini-mall-order 服务, 网关代理 /order/**)
 *
 *   POST /order                创建订单 → 返 { orderNo, orderId }
 *   GET  /order/my             我的订单列表
 *   GET  /order/{orderId}      订单详情
 *   PUT  /order/{orderId}/cancel  取消
 *   POST /order/{orderId}/pay  支付 (后端本地模拟, 不接真支付)
 */

// 下单入参 (跟后端 CreateOrderDTO 对齐)
export interface CreateOrderDTO {
  addressId: number
  cartItemIds: number[]   // 勾选的购物车项 id
  remark?: string
  userCouponId?: number   // 用券, MVP 先不传
}

// 下单返回
export interface CreateOrderResult {
  orderNo: string
  orderId: number
}

// 订单明细行 (OrderItemVO) — 字段来自 order_item 表快照
export interface OrderItemVO {
  orderItemId: number
  productId: number
  productName: string    // 下单时的商品名快照
  productImage?: string  // 图片快照
  price: number          // 单价快照
  quantity: number
  subtotal: number       // 小计 (后端算好)
}

// 订单详情 (OrderDetailVO)
export interface OrderDetailVO {
  orderId: number
  orderNo: string
  status: number
  statusDesc: string
  totalAmount: number
  receiver: string
  phone: string
  address: string
  remark?: string
  createTime: string
  payTime?: string
  logisticsNo?: string
  logisticsCompany?: string
  items: OrderItemVO[]
}

// 订单列表行 (OrderListVO, 个人中心"我的订单"用)
export interface OrderListVO {
  orderId: number
  orderNo: string
  status: number          // 0待付款 1已付款 2已发货 3已完成 4已关闭
  statusDesc: string      // 后端给的中文, 直接显示
  totalAmount: number
  receiver: string
  address: string
  createTime: string
  items: OrderItemVO[]    // 这单的所有明细 (一对多)
}

/** POST /order — 创建订单 */
export function createOrder(data: CreateOrderDTO): Promise<CreateOrderResult> {
  return http.post('/order', data)
}

/** GET /order/{orderId} — 订单详情 */
export function getOrderDetail(orderId: number): Promise<OrderDetailVO> {
  return http.get(`/order/${orderId}`)
}

/** POST /order/{orderId}/pay — 支付 (模拟) */
export function payOrder(orderId: number): Promise<void> {
  return http.post(`/order/${orderId}/pay`)
}

/** GET /order/my — 我的订单列表 */
export function listMyOrders(): Promise<OrderListVO[]> {
  return http.get('/order/my')
}

/** PUT /order/{orderId}/cancel — 取消订单 */
export function cancelOrder(orderId: number): Promise<void> {
  return http.put(`/order/${orderId}/cancel`)
}

/** PUT /order/{orderId}/sign — 确认收货 (签收) */
export function signOrder(orderId: number): Promise<void> {
  return http.put(`/order/${orderId}/sign`)
}
