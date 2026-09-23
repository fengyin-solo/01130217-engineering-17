/**
 * echarts 资源统一按需加载：
 * - 全应用只发起一次加载，结果缓存，组件间共享；
 * - 加载失败时清空缓存，允许降级后重试（如网络抖动后恢复）。
 */
let echartsPromise: Promise<typeof import('echarts')> | null = null

export function loadEcharts(): Promise<typeof import('echarts')> {
  if (!echartsPromise) {
    echartsPromise = import('echarts').catch((error) => {
      // 失败后允许下一次重新尝试加载
      echartsPromise = null
      throw error
    })
  }
  return echartsPromise
}
