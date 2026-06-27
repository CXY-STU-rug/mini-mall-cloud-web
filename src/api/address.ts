import { http } from './http'

/**
 * 收货地址 API (调 mini-mall-user 服务, 网关代理 /user/address/**)
 *
 * 标准 CRUD, 都需登录:
 *   GET    /user/address           我的地址列表 (默认地址置顶)
 *   POST   /user/address           新增
 *   PUT    /user/address/{id}      修改
 *   DELETE /user/address/{id}      删除 (后端逻辑删除)
 *   PUT    /user/address/default   设为默认 (?addressId=, 后端事务清旧默认+设新, 保证互斥)
 */

// 跟后端 Address 实体字段一致
export interface Address {
  id?: number
  receiver: string       // 收货人
  phone: string          // 手机号
  province: string
  city: string
  district: string
  detail: string         // 详细地址
  isDefault?: number     // 0 否 1 是
}

/** GET /user/address — 我的地址列表 */
export function listAddress(): Promise<Address[]> {
  return http.get('/user/address')
}

/** POST /user/address — 新增, 返回带 id 的地址 */
export function createAddress(data: Address): Promise<Address> {
  return http.post('/user/address', data)
}

/** PUT /user/address/{id} — 修改 */
export function updateAddress(id: number, data: Address): Promise<Address> {
  return http.put(`/user/address/${id}`, data)
}

/** DELETE /user/address/{id} — 删除 */
export function removeAddress(id: number): Promise<void> {
  return http.delete(`/user/address/${id}`)
}

/** PUT /user/address/default?addressId= — 设为默认 (后端事务保证单一默认) */
export function setDefaultAddress(addressId: number): Promise<void> {
  return http.put('/user/address/default', null, { params: { addressId } })
}
