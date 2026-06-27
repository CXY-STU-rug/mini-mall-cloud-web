import { http } from './http'

/**
 * 商品评价 API (调 mini-mall-review 服务, 网关代理 /review/**)
 *
 * WEB.4 详情页只用到"看某商品的评价列表"这一个:
 *   GET /review/product/{productId}  公开接口, 不用登录
 *
 * 另外两个 (写评价 POST /review、我的评价 GET /review/user) 留到
 * WEB.6 之后的个人中心再用, 这里先不写。
 */

// 跟后端 ReviewVO 字段一致
export interface ReviewVO {
  id: number
  userId: number
  userName: string | null   // 后端暂时可能为 null (还没 Feign 拿用户名)
  orderId: number
  productId: number
  rating: number            // 评分 1~5
  content: string
  createTime: string        // 后端已格式化成 "yyyy-MM-dd HH:mm:ss"
}

/** GET /review/product/{productId} — 某商品的评价列表 */
export function listProductReviews(productId: number): Promise<ReviewVO[]> {
  return http.get(`/review/product/${productId}`)
}

/** GET /review/user — 我的评价 (需登录, 个人中心用) */
export function listMyReviews(): Promise<ReviewVO[]> {
  return http.get('/review/user')
}

// 写评价入参 (跟后端 CreateReviewDTO 对齐; 字段不符就改这里)
export interface CreateReviewDTO {
  orderId: number
  productId: number
  rating: number      // 1~5 星
  content?: string    // 评价内容, 选填
}

/** POST /review — 提交一条评价 (需登录) */
export function createReview(data: CreateReviewDTO): Promise<void> {
  return http.post('/review', data)
}
