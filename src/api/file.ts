import { http } from './http'

/**
 * 文件上传 API (调 mini-mall-file 服务, 网关代理 /file/**)
 *
 *   POST /file/upload   form-data: file + bizType  →  返 { url, objectName }
 *
 * ⚠ 上传是 multipart/form-data, 不是 JSON:
 *   - 用 FormData 装文件, axios 检测到 FormData 会自动把 Content-Type 设成
 *     multipart/form-data 并带上 boundary, 所以这里【不要】手动设 Content-Type。
 *   - bizType 决定文件归类的目录前缀 (avatar=头像 / product=商品 / review=评价图)。
 */

// 上传返回结构 (跟后端 FileController 返的 Map 一致)
export interface UploadResult {
  url: string         // 可直接 <img src> 的公开访问地址
  objectName: string  // MinIO 里的对象名 (删除时用得到)
}

/** POST /file/upload — 上传单个文件 */
export function uploadFile(file: File, bizType = 'product'): Promise<UploadResult> {
  const form = new FormData()
  form.append('file', file)
  form.append('bizType', bizType)
  return http.post('/file/upload', form)
}
