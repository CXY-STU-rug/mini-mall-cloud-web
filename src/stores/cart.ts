import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getCart } from '@/api/cart'
import { useUserStore } from './user'

/**
 * 购物车计数 store
 *
 * 设计思路 (规划文档定的): 前端只缓存"购物车里有几件"这个数字, 用来在
 * 右上角图标上显示红色徽章。具体明细不在这里存, 进购物车页时按需拉 /cart。
 *
 * 后端没有 /cart/count 接口, 所以 refreshCount() 实际是拉一次 /cart 列表,
 * 数它的长度。加购/删除后调一下 refreshCount() 让徽章刷新。
 */
export const useCartStore = defineStore('cart', () => {

  // 购物车里不同商品的件数 (徽章数字)
  const count = ref<number>(0)

  /** 重新拉购物车, 更新徽章数字。未登录就清零 (不发请求, 免得 401) */
  async function refreshCount() {
    const userStore = useUserStore()
    if (!userStore.isLogin) {
      count.value = 0
      return
    }
    try {
      const list = await getCart()
      count.value = list.length
    } catch {
      // 拉失败 (网络/未登录) 不弹错, 徽章保持原样即可
    }
  }

  /** 退出登录时清空徽章 */
  function reset() {
    count.value = 0
  }

  return { count, refreshCount, reset }
})
