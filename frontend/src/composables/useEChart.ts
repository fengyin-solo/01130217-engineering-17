import { ref, shallowRef, onBeforeUnmount, type Ref } from 'vue'
import type { ECharts, EChartsCoreOption } from 'echarts'
import { chartRegistry } from '@/utils/chart-manager'
import { createLogger, metrics } from '@/utils/logger'

const logger = createLogger('useEChart')

export interface UseEChartOptions {
  /** 指标打点名称，用于在日志中定位，例如 dashboard.productionTrend */
  name?: string
}

export interface UseEChartReturn {
  /** 图表容器 ref（未从外部传入时使用） */
  target: Ref<HTMLElement | undefined>
  /** 当前图表实例（可能为 null） */
  chart: Ref<ECharts | null>
  /** 是否处于降级展示（资源加载 / 初始化失败） */
  degraded: Ref<boolean>
  /**
   * 渲染图表：首次会初始化实例，之后复用同一实例。
   * 组件刷新数据时重复调用即可，不会重复绑定监听器。
   */
  render: (option: EChartsCoreOption) => Promise<void>
  /** 手动释放（一般无需调用，卸载时自动执行） */
  destroy: () => Promise<void>
}

/**
 * 图表统一生命周期：
 * init / setOption / resize / dispose 全部收口到 chartRegistry；
 * 组件卸载时自动释放，刷新或重进页面不会重复绑定。
 */
export function useEChart(options?: UseEChartOptions): UseEChartReturn
export function useEChart(
  target: Ref<HTMLElement | undefined>,
  options?: UseEChartOptions
): UseEChartReturn
export function useEChart(
  targetOrOptions?: Ref<HTMLElement | undefined> | UseEChartOptions,
  maybeOptions?: UseEChartOptions
): UseEChartReturn {
  const options =
    'value' in (targetOrOptions ?? {})
      ? (maybeOptions ?? {})
      : ((targetOrOptions as UseEChartOptions | undefined) ?? {})
  const target =
    targetOrOptions && 'value' in targetOrOptions
      ? (targetOrOptions as Ref<HTMLElement | undefined>)
      : ref<HTMLElement>()
  const chart = shallowRef<ECharts | null>(null)
  const degraded = ref(false)
  const metricName = options.name || 'chart'
  let disposed = false

  const render = async (option: EChartsCoreOption) => {
    const el = target.value
    if (!el || disposed) return

    const start = performance.now()
    const instance = await chartRegistry.init(el)
    // 初始化过程中组件可能已卸载
    if (disposed || !el.isConnected) {
      if (instance) await chartRegistry.dispose(el)
      return
    }

    if (!instance) {
      degraded.value = true
      metrics.record(`${metricName}.init`, performance.now() - start, 'fail')
      return
    }

    const ok = chartRegistry.setOption(instance, option)
    degraded.value = !ok
    chart.value = instance
    metrics.record(
      `${metricName}.render`,
      performance.now() - start,
      ok ? 'ok' : 'fail'
    )
    if (!ok) logger.warn('图表渲染失败，已切换降级展示', { name: metricName })
  }

  const destroy = async () => {
    disposed = true
    const el = target.value
    if (el) await chartRegistry.dispose(el)
    chart.value = null
  }

  onBeforeUnmount(destroy)

  return { target, chart, degraded, render, destroy }
}
