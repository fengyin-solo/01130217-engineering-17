import type { ECharts, EChartsCoreOption } from 'echarts'
import { createLogger } from '@/utils/logger'
import { loadEcharts } from '@/utils/echarts'

const logger = createLogger('chart')

type EChartsModule = typeof import('echarts')

/**
 * 图表实例统一收口：
 * - echarts 按需异步加载（本地与部署一致），加载失败可被捕获并走降级；
 * - 全局只在 window 上注册一个 resize 监听（ResizeObserver 兜底容器尺寸变化）；
 * - 每个容器最多持有一个实例，重复 init 直接复用，避免反复进出路由叠加实例；
 * - 所有实例登记在案，页面卸载时 dispose 并解绑，杜绝监听器泄漏。
 */
class ChartRegistry {
  private instances = new Map<HTMLElement, ECharts>()
  private module: EChartsModule | null = null
  private resizeObserver: ResizeObserver | null = null
  private windowResizeHandler: (() => void) | null = null
  private resizeRaf = 0

  /** 惰性加载 echarts 模块（全应用只加载一次，失败可重试） */
  private async getModule(): Promise<EChartsModule | null> {
    if (this.module) return this.module
    try {
      this.module = await loadEcharts()
      return this.module
    } catch (error) {
      logger.error('echarts 资源加载失败', error)
      return null
    }
  }

  /** 惰性创建全局监听（只绑定一次） */
  private ensureGlobalListeners(): void {
    if (typeof window === 'undefined') return

    if (!this.windowResizeHandler) {
      this.windowResizeHandler = () => this.scheduleResize()
      window.addEventListener('resize', this.windowResizeHandler)
    }

    if (!this.resizeObserver && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.scheduleResize())
    }
  }

  private scheduleResize(): void {
    if (this.resizeRaf) return
    this.resizeRaf = requestAnimationFrame(() => {
      this.resizeRaf = 0
      this.resizeAll()
    })
  }

  private resizeAll(): void {
    this.instances.forEach((chart, el) => {
      // 容器已脱离文档（如已卸载但 dispose 延迟）时跳过
      if (!el.isConnected || el.clientWidth === 0) return
      chart.resize()
    })
  }

  /**
   * 在容器上初始化或复用图表实例
   * @returns 实例；资源加载或初始化失败返回 null（由调用方走降级）
   */
  async init(el: HTMLElement, theme?: string): Promise<ECharts | null> {
    const echarts = await this.getModule()
    if (!echarts) return null

    // 同一个 DOM 上已有实例时直接复用，杜绝重复绑定
    const existing = echarts.getInstanceByDom(el) as ECharts | undefined
    if (existing) {
      this.instances.set(el, existing)
      logger.debug('复用已有图表实例')
      return existing
    }

    try {
      const chart = echarts.init(el, theme)
      this.instances.set(el, chart)
      this.ensureGlobalListeners()
      if (this.resizeObserver) this.resizeObserver.observe(el)
      logger.debug('图表实例已初始化', { active: this.instances.size })
      return chart
    } catch (error) {
      logger.error('图表初始化失败', error)
      return null
    }
  }

  /** 安全写配置：失败时返回 false，由调用方降级 */
  setOption(chart: ECharts, option: EChartsCoreOption): boolean {
    try {
      chart.setOption(option)
      return true
    } catch (error) {
      logger.error('图表配置写入失败', error)
      return false
    }
  }

  /** 释放单个容器上的实例（幂等） */
  async dispose(el: HTMLElement): Promise<void> {
    if (this.resizeObserver) {
      this.resizeObserver.unobserve(el)
    }
    let chart = this.instances.get(el)
    if (!chart && this.module) {
      chart = this.module.getInstanceByDom(el) as ECharts | undefined
    }
    if (chart) {
      chart.dispose()
      logger.debug('图表实例已释放', { active: this.instances.size - 1 })
    }
    this.instances.delete(el)
  }

  /** 释放全部实例（一般只在应用卸载场景使用） */
  disposeAll(): void {
    this.instances.forEach((chart, el) => {
      if (this.resizeObserver) this.resizeObserver.unobserve(el)
      chart.dispose()
    })
    this.instances.clear()
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }
    if (this.windowResizeHandler) {
      window.removeEventListener('resize', this.windowResizeHandler)
      this.windowResizeHandler = null
    }
    if (this.resizeRaf) {
      cancelAnimationFrame(this.resizeRaf)
      this.resizeRaf = 0
    }
    logger.debug('全部图表实例已释放')
  }

  get activeCount(): number {
    return this.instances.size
  }
}

export const chartRegistry = new ChartRegistry()
