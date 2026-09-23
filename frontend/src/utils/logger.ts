import { appConfig, metricsConfig } from '@/config'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * 统一日志：所有模块通过 createLogger('命名空间') 打点，
 * 输出带有 [模块名][环境] 前缀，方便在控制台 / 采集系统中定位问题。
 */
export interface Logger {
  debug: (message: string, ...args: any[]) => void
  info: (message: string, ...args: any[]) => void
  warn: (message: string, ...args: any[]) => void
  error: (message: string, ...args: any[]) => void
}

const PREFIX = `[WLMS][${appConfig.env}]`

export function createLogger(scope: string): Logger {
  const tag = `${PREFIX}[${scope}]`
  return {
    debug: (message, ...args) => {
      if (appConfig.isDev) console.debug(tag, message, ...args)
    },
    info: (message, ...args) => console.info(tag, message, ...args),
    warn: (message, ...args) => console.warn(tag, message, ...args),
    error: (message, ...args) => console.error(tag, message, ...args),
  }
}

/** 全局兜底日志（main.ts / 插件用） */
export const logger = createLogger('app')

export interface MetricEntry {
  /** 指标名称，如 dashboard.chart.init */
  name: string
  /** 耗时（毫秒）或数值 */
  value: number
  /** 成功 / 失败 */
  status: 'ok' | 'fail'
  /** 附加维度（环境、页面、错误信息等） */
  tags?: Record<string, string | number | boolean | undefined>
  /** 打点时间戳 */
  at: number
}

type MetricListener = (entry: MetricEntry) => void

/**
 * 关键指标收集：初始化耗时、刷新耗时、健康检查、资源降级等统一入口。
 * - dev / 开启 VITE_METRICS_LOG 时输出到控制台，便于定位；
 * - 通过 window.__WLMS_METRICS__ 可在运行时查看（部署环境排查用）。
 */
class MetricsCollector {
  private entries: MetricEntry[] = []
  private listeners = new Set<MetricListener>()
  private readonly limit = 200

  record(
    name: string,
    value: number,
    status: MetricEntry['status'] = 'ok',
    tags?: MetricEntry['tags']
  ): void {
    const entry: MetricEntry = {
      name,
      value: Math.round(value * 100) / 100,
      status,
      tags: { env: appConfig.env, version: appConfig.version, ...tags },
      at: Date.now(),
    }
    this.entries.push(entry)
    if (this.entries.length > this.limit) this.entries.shift()
    if (metricsConfig.enableLog) {
      const fn = status === 'fail' ? console.warn : console.debug
      fn(`${PREFIX}[metric]`, entry)
    }
    this.listeners.forEach((listener) => {
      try {
        listener(entry)
      } catch {
        /* 监听器异常不影响主流程 */
      }
    })
  }

  /** 测量一次异步操作的耗时并打点 */
  async measure<T>(name: string, task: () => Promise<T>, tags?: MetricEntry['tags']): Promise<T> {
    const start = performance.now()
    try {
      const result = await task()
      this.record(name, performance.now() - start, 'ok', tags)
      return result
    } catch (error) {
      this.record(name, performance.now() - start, 'fail', {
        ...tags,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  list(): readonly MetricEntry[] {
    return this.entries
  }

  subscribe(listener: MetricListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}

export const metrics = new MetricsCollector()

if (typeof window !== 'undefined') {
  window.__WLMS_METRICS__ = metrics
}
