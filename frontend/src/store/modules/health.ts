import { defineStore } from 'pinia'
import { useHealthCheck } from '@/composables/useHealthCheck'

/**
 * 全局健康检查状态（单例）：
 * 多页面共享同一次探测，刷新 / 重进驾驶舱不会重复发起或重复绑定轮询。
 */
export const useHealthStore = defineStore('health', () => {
  const { status, message, check } = useHealthCheck()

  return { status, message, check }
})
