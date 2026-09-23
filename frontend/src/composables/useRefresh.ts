import { onBeforeUnmount, readonly, ref, type Ref } from 'vue'
import { refreshConfig } from '@/config'
import { createLogger, metrics } from '@/utils/logger'

const logger = createLogger('refresh')

export interface UseRefreshOptions {
  /** 指标 / 日志定位名称，例如 dashboard */
  name: string
  /** 刷新间隔（毫秒），默认取全局 refreshConfig.interval，0 表示关闭 */
  interval?: number
  /** 页面隐藏时是否暂停，默认开启 */
  pauseWhenHidden?: boolean
  /** 是否立即执行一次，默认 true */
  immediate?: boolean
}

export interface UseRefreshReturn {
  /** 是否正在刷新（防止上一次未结束就叠加下一次） */
  loading: Readonly<Ref<boolean>>
  /** 最近一次刷新成功时间戳（0 表示尚未成功） */
  lastUpdated: Readonly<Ref<number>>
  /** 连续失败次数，便于页面给出可定位的反馈 */
  failureCount: Readonly<Ref<number>>
  start: () => void
  stop: () => void
  /** 手动触发一次刷新 */
  refresh: () => Promise<void>
}

/**
 * 数据刷新统一收口：
 * - 定时器、document visibility 监听随组件生命周期自动释放，不叠加；
 * - start() 幂等，刷新或重进驾驶舱不会重复绑定；
 * - 上一次任务未结束时跳过本次调度，避免请求堆积拖慢页面；
 * - 每次刷新的耗时、成败都打点，便于在控制台按 name 定位。
 */
export function useRefresh(
  task: () => Promise<unknown> | unknown,
  options: UseRefreshOptions
): UseRefreshReturn {
  const interval = options.interval ?? refreshConfig.interval
  const pauseWhenHidden = options.pauseWhenHidden ?? refreshConfig.pauseWhenHidden
  const immediate = options.immediate ?? true
  const name = options.name

  const loading = ref(false)
  const lastUpdated = ref(0)
  const failureCount = ref(0)

  let timer: ReturnType<typeof setInterval> | null = null
  let running = false

  const clearTimer = () => {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
  }

  const refresh = async () => {
    if (running) {
      logger.debug('上一次刷新未结束，跳过本次调度', { name })
      return
    }
    if (document.hidden) return

    running = true
    loading.value = true
    const start = performance.now()
    try {
      await task()
      lastUpdated.value = Date.now()
      failureCount.value = 0
      metrics.record(`${name}.refresh`, performance.now() - start, 'ok')
    } catch (error) {
      failureCount.value += 1
      metrics.record(`${name}.refresh`, performance.now() - start, 'fail', {
        error: error instanceof Error ? error.message : String(error),
      })
      logger.warn('数据刷新失败', { name, failureCount: failureCount.value })
    } finally {
      running = false
      loading.value = false
    }
  }

  const start = () => {
    // 幂等：已在运行时不重复绑定
    if (timer !== null || interval <= 0) return
    timer = setInterval(refresh, interval)
    logger.debug('刷新已启动', { name, interval })
  }

  const stop = () => {
    clearTimer()
    logger.debug('刷新已停止', { name })
  }

  const onVisibilityChange = () => {
    if (!pauseWhenHidden || timer === null) return
    if (!document.hidden) {
      // 回到页面立即补一次，再恢复定时
      refresh()
    }
  }

  if (typeof document !== 'undefined' && pauseWhenHidden) {
    document.addEventListener('visibilitychange', onVisibilityChange)
  }

  if (immediate) {
    void refresh()
  }
  start()

  onBeforeUnmount(() => {
    stop()
    if (typeof document !== 'undefined' && pauseWhenHidden) {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  })

  return {
    loading: readonly(loading),
    lastUpdated: readonly(lastUpdated),
    failureCount: readonly(failureCount),
    start,
    stop,
    refresh,
  }
}
