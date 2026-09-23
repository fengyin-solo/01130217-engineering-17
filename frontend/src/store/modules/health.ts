import { defineStore } from 'pinia'
import { healthConfig, appConfig } from '@/config'
import { createLogger, metrics } from '@/utils/logger'

const logger = createLogger('health')

export type HealthStatus = 'pending' | 'up' | 'down'

interface HealthState {
  status: HealthStatus
  /** 最近一次检查时间戳 */
  checkedAt: number
  /** 失败原因，便于在界面/控制台定位 */
  error: string
  /** 已完成的检查次数（成功+失败） */
  attempts: number
}

let inflight: Promise<boolean> | null = null

/** 带超时的 fetch 封装 */
function fetchWithTimeout(url: string, timeout: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  return fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: controller.signal,
  }).finally(() => clearTimeout(timer))
}

/**
 * 执行一次健康检查（失败按配置自动重试）。
 * 全应用单例并发保护：刷新或重进驾驶舱不会重复发起检查。
 */
export async function runHealthCheck(store?: ReturnType<typeof useHealthStore>): Promise<boolean> {
  if (inflight) return inflight

  inflight = (async () => {
    const maxAttempts = healthConfig.retries + 1
    let lastError = ''

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const start = performance.now()
      try {
        const resp = await fetchWithTimeout(healthConfig.url, healthConfig.timeout)
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        await resp.json().catch(() => ({})) // 健康端点内容不做强校验，通即可

        metrics.record('health.check', performance.now() - start, 'ok', { attempt })
        logger.info('健康检查通过', { url: healthConfig.url, attempt })
        store?.markUp()
        return true
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error)
        metrics.record('health.check', performance.now() - start, 'fail', {
          attempt,
          error: lastError,
        })
        logger.warn('健康检查失败', { url: healthConfig.url, attempt, error: lastError })
        store?.bumpAttempts(lastError)
      }
    }

    logger.error('健康检查最终失败，页面按降级策略继续运行', {
      retries: healthConfig.retries,
      error: lastError,
      version: appConfig.version,
    })
    store?.markDown(lastError)
    return false
  })()

  try {
    return await inflight
  } finally {
    inflight = null
  }
}

export const useHealthStore = defineStore('health', {
  state: (): HealthState => ({
    status: 'pending',
    checkedAt: 0,
    error: '',
    attempts: 0,
  }),
  actions: {
    markUp() {
      this.status = 'up'
      this.checkedAt = Date.now()
      this.error = ''
      this.attempts += 1
    },
    markDown(error: string) {
      this.status = 'down'
      this.checkedAt = Date.now()
      this.error = error
    },
    bumpAttempts(error: string) {
      this.attempts += 1
      this.error = error
    },
    /** 手动重新检查 */
    recheck() {
      this.status = 'pending'
      return runHealthCheck(this)
    },
  },
})
