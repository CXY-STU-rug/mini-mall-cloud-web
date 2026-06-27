import { http } from './http'

/**
 * 商品分类 API (调 mini-mall-product 服务)
 * 分类是全平台共享数据, 不绑用户。
 */

// 跟后端 Category 实体字段一致 (扁平结构, 没有父子层级)
export interface Category {
  id: number
  name: string
  icon?: string          // 分类图标 (图片 URL 或 emoji)
  sort?: number          // 排序, 越小越靠前
  status?: number        // 1=启用 0=禁用
}

/** GET /category/list — 分类列表 (后端已按 启用优先 + sort 升序 排好) */
export function listCategory(): Promise<Category[]> {
  return http.get('/category/list')
}
