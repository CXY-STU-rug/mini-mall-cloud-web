import { http } from './http'

/**
 * 商品接口层 (C 端) — WEB.3
 *
 * 两个后端来源:
 *   ① product 服务的公开接口  GET /product           (列表/分类/价格筛选, 走数据库)
 *      —— 用于首页、分类页
 *   ② search  服务的搜索接口  GET /search/product     (关键词搜索, 走 ES)
 *      —— 用于搜索结果页
 *
 * 为什么分两个? 首页/分类是"按条件查库", 搜索是"按关键词打分排序",
 * 后端就是两套实现, 前端跟着分两个函数, 各自对应各自的页面。
 */

// ── 商品实体 (product 服务 GET /product 返回的字段) ──
export interface Product {
  id: number
  categoryId: number
  name: string
  description?: string
  detail?: string
  price: number
  stock: number
  sales: number
  avgRating: number
  reviewCount: number
  coverImage: string
  thumbnails?: string[]    // 缩略图数组 (详情 GET /product/{id} 才返回, 列表接口没有)
  status?: number
}

// MyBatis-Plus 分页返回结构 (records=本页数据, total=总条数)
export interface IPage<T> {
  records: T[]
  total: number
  size: number
  current: number
  pages: number
}

// 列表/分类查询参数 (全部可选, 后端有默认值)
export interface ProductQuery {
  page?: number
  size?: number
  categoryId?: number
  keyword?: string
  minPrice?: number
  maxPrice?: number
}

/**
 * 分页查商品 (首页/分类页用)
 * 对应后端 ProductController GET /product?page=&size=&categoryId=...
 */
export function pageProducts(params: ProductQuery) {
  return http.get<any, IPage<Product>>('/product', { params })
}

/**
 * 查单个商品详情 (WEB.4 详情页用, 这里先一起放好)
 * 对应后端 GET /product/{id}
 */
export function getProduct(id: number) {
  return http.get<any, Product>(`/product/${id}`)
}

// ── 搜索专用 (search 服务, 走 ES) ──

// search 服务返回的 VO (字段比 Product 少, 只够列表展示)
export interface ProductSearchVO {
  id: number
  name: string
  price: number
  coverImage: string
  categoryId: number
  sales: number
  avgRating: number
  reviewCount: number
}

// search 服务自己的分页结构 (字段名跟 MP 的不一样, 注意 page 不是 current)
export interface PageResultVO<T> {
  total: number
  pages: number
  page: number
  size: number
  records: T[]
}

export interface SearchQuery {
  keyword?: string
  categoryId?: number
  minPrice?: number
  maxPrice?: number
  page?: number
  size?: number
  sort?: string
}

/**
 * 关键词搜索 (搜索结果页用)
 * 对应后端 ProductSearchController GET /search/product
 */
export function searchProducts(params: SearchQuery) {
  return http.get<any, PageResultVO<ProductSearchVO>>('/search/product', { params })
}
