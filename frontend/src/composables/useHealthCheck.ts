import { getCurrentScope, onScopeDispose, ref } from 'vue'
import { appConfig } from '@/config'
import { useManagedInterval } from './useChartManager'
import { logger, reportMetric } from '@/utils/logger'

export type HealthStatus = 'checking' | 'healthy' | 'degraded'

/**
 * 后端健康检查：统一管理探测状态与反馈。
 * - 进入系统 / 刷新重进时幂等探测，不重复绑定；
 * - interval=0 时只探测一次（部署环境可关闭轮询）；
 * - 探测失败不阻断页面，其余看板照常使用（本地数据兜底）。
 */
export function useHealthCheck() {
  const status = ref<HealthStatus>('checking')
  const message = ref('正在检测服务状态…')
  /** 最近一次探测时间戳与耗时，供问题定位 */
  const lastCheckedAt = ref(0)
  const lastLatencyMs = ref(0)

  let aborted = false
  let inFlight = false
  let timer: ReturnType<typeof setTimeout> | undefined

  const mark = (next: HealthStatus, text: string) => {
    if (aborted) return
    status.value = next
    message.value = text
    reportMetric('health_status', 1, { status: next })
    logger.debug('health', next, text)
  }

  const check = async () => {
    // 幂等：轮询与手动触发重叠时跳过，绝不叠加请求
    if (aborted || inFlight) return
    inFlight = true
    status.value = 'checking'
    const controller = new AbortController()
    timer = setTimeout(() => controller.abort(), appConfig.health.timeout)

    const apiBase = appConfig.apiBaseUrl.replace(/\/$/, '')
    const healthUrl = appConfig.health.url.startsWith(apiBase)
      ? appConfig.health.url
      : `${apiBase}${appConfig.health.url}`

    const startedAt = performance.now()
    try {
      const res = await fetch(healthUrl, {
        signal: controller.signal,
        headers: { Accept: 'application/json' }
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      mark('healthy', '服务运行正常')
    } catch (err) {
      const reason = err instanceof DOMException && err.name === 'AbortError'
        ? `探测超时（${appConfig.health.timeout}ms）`
        : (err as Error)?.message
      mark('degraded', `服务暂不可用（${reason}），已切换为本地数据`)
    } finally {
      clearTimeout(timer)
      inFlight = false
      lastCheckedAt.value = Date.now()
      lastLatencyMs.value = Math.round(performance.now() - startedAt)
      reportMetric('health_check_duration', lastLatencyMs.value)
    }
  }

  void check()
  const interval = appConfig.health.interval > 0
    ? useManagedInterval(check, appConfig.health.interval)
    : null

  const stop = () => {
    aborted = true
    clearTimeout(timer)
    interval?.clear()
  }

  if (getCurrentScope()) onScopeDispose(stop)

  return { status, message, lastCheckedAt, lastLatencyMs, check, stop }
}
