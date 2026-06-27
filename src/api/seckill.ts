import { http } from './http'

/**
 * 秒杀 API (调 mini-mall-order 服务, 网关代理 /seckill/**)
 *
 *   GET  /seckill/activities          列活动 (公开, 待开始+进行中)
 *   POST /seckill/{activityId}        抢购 (需登录) → 返回提示语 string
 *   GET  /seckill/result/{activityId} 查我的秒杀结果 (轮询用)
 *   POST /seckill/pay/{orderNo}       支付秒杀订单 (按 orderNo, 抢到后在结果弹框里付)
 *
 * 抢购链路: Lua 原子扣 Redis 库存 → 发 MQ → 消费者异步写 seckill_order。
 *   所以 POST 抢购成功只代表"抢到名额", 订单要靠轮询 result 拿。
 */

// 活动 VO (跟后端 SeckillActivityVO 字段一致)
export interface SeckillActivityVO {
  id: number
  productId: number
  productName: string
  productImage: string
  originalPrice: number    // 商品原价 (BigDecimal → number)
  seckillPrice: number     // 秒杀价
  stock: number            // 活动限量 (初始库存, 非实时剩余)
  startTime: string        // LocalDateTime → "2026-06-27T10:00:00"
  endTime: string
  status: number           // 0=待开始 1=进行中 2=已结束
  statusDesc: string       // 后端给的中文
}

// 轮询结果 (后端 querySeckillResult 返回的 Map)
export interface SeckillResult {
  status: 'SUCCESS' | 'PROCESSING' | 'NOT_FOUND'
  orderNo: string | null   // SUCCESS 时才有
  message: string
}

/** GET /seckill/activities — 列活动 */
export function listSeckillActivities(): Promise<SeckillActivityVO[]> {
  return http.get('/seckill/activities')
}

/** POST /seckill/{activityId} — 抢购, 返回提示语 */
export function seckill(activityId: number): Promise<string> {
  return http.post(`/seckill/${activityId}`)
}

/** GET /seckill/result/{activityId} — 查我的秒杀结果 (轮询) */
export function querySeckillResult(activityId: number): Promise<SeckillResult> {
  return http.get(`/seckill/result/${activityId}`)
}

/** POST /seckill/pay/{orderNo} — 支付秒杀订单 */
export function paySeckillOrder(orderNo: string): Promise<void> {
  return http.post(`/seckill/pay/${orderNo}`)
}
