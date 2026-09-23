import { ref } from 'vue'
import { reportMetric } from '@/utils/logger'

/**
 * 看板降级计数（图表 / 地图统一登记）：
 * 供健康检查与运维观察“局部异常发生了几次”，便于定位，
 * 不改变任何页面展示。
 */
export const fallbackCount = ref(0)

export function recordFallback(kind: 'chart' | 'map', reason: string) {
  fallbackCount.value++
  reportMetric(kind === 'chart' ? 'chart_render_error' : 'map_fallback', 1, { reason })
}
