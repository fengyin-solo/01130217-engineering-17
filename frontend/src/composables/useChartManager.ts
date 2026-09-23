/**
 * 图表实例 / 监听器 / 定时器统一生命周期管理。
 *
 * 设计目标：
 * - 任意视图只通过 createChart 获取实例，禁止再自行
 *   addEventListener('resize')，全应用共用一个 resize 监听；
 * - createChart 幂等：同一容器反复进入（刷新 / 重进驾驶舱）只会复用已绑定实例；
 * - 组件作用域销毁时（onScopeDispose）自动 dispose 图表、断开 ResizeObserver、
 *   清理定时器，路由切换后不残留监听、不叠加；
 * - 单张图表初始化或渲染异常时仅在其容器内渲染降级占位，不抛出、不影响其余看板。
 */
import { onScopeDispose } from 'vue'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import { logger } from '@/utils/logger'
import { recordFallback } from './metrics'

type ChartInstance = echarts.ECharts
type TimerId = ReturnType<typeof setInterval>

const charts = new Set<ChartInstance>()
const timers = new Set<TimerId>()
const resizeTargets = new WeakMap<ChartInstance, ResizeObserver>()

let globalResizeBound = false

/** 全应用唯一的 resize 监听，只在存在活跃图表时绑定 */
function ensureGlobalResize() {
  if (globalResizeBound) return
  window.addEventListener('resize', resizeAllCharts)
  document.addEventListener('visibilitychange', onVisibilityChange)
  globalResizeBound = true
  logger.debug('chart-manager', 'global resize listener bound')
}

function teardownGlobalResize() {
  if (charts.size > 0) return
  window.removeEventListener('resize', resizeAllCharts)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  globalResizeBound = false
  logger.debug('chart-manager', 'global resize listener removed')
}

function resizeAllCharts() {
  charts.forEach(chart => {
    if (!chart.isDisposed()) chart.resize()
  })
}

/** 标签页重新可见时触发一次 resize，避免后台期间容器尺寸变化导致画布错位 */
function onVisibilityChange() {
  if (document.visibilityState === 'visible') resizeAllCharts()
}

/** 在图表容器内渲染统一降级占位，局部异常不外溢 */
function renderFallback(el: HTMLElement, message: string, reason: string) {
  const existing = el.querySelector('.chart-fallback')
  if (existing) {
    existing.textContent = message
    return
  }
  recordFallback('chart', reason)
  el.innerHTML = ''
  const fallback = document.createElement('div')
  fallback.className = 'chart-fallback'
  fallback.textContent = message
  el.appendChild(fallback)
}

/** 无 Canvas 2D 环境（旧浏览器 / SSR / 测试 DOM）时自动回退 SVG 渲染器 */
function pickRenderer() {
  const canvas = document.createElement('canvas')
  return canvas.getContext?.('2d') ? undefined : { renderer: 'svg' as const }
}

/**
 * 在指定容器上创建（或复用）ECharts 实例并写入配置。
 * 返回的实例已登记到当前组件作用域，离开页面自动销毁，调用方无需手动 dispose。
 */
export function createChart(el: HTMLElement, option: EChartsOption): ChartInstance | null {
  // 幂等：该容器上已有实例时直接复用，杜绝重复 init 造成的实例与监听叠加
  const existing = echarts.getInstanceByDom(el)
  const chart = existing ?? echarts.init(el, undefined, pickRenderer())
  const createdHere = !existing

  if (createdHere) {
    charts.add(chart)
    ensureGlobalResize()

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => {
        if (!chart.isDisposed()) chart.resize()
      })
      ro.observe(el)
      resizeTargets.set(chart, ro)
    }

    onScopeDispose(() => destroyChart(chart))
  }

  try {
    chart.setOption(option)
  } catch (err) {
    const reason = (err as Error)?.message || 'setOption failed'
    logger.error('chart-manager', 'setOption failed:', err)
    renderFallback(el, '图表加载失败，请稍后刷新重试', reason)
    // 渲染失败的新实例不留下孤儿：立即按统一路径释放
    if (createdHere) destroyChart(chart)
    return null
  }

  return chart
}

/** 实例销毁：从全局登记中摘除、断开尺寸观察、必要时回收全局监听 */
function destroyChart(chart: ChartInstance) {
  if (chart.isDisposed()) return
  resizeTargets.get(chart)?.disconnect()
  resizeTargets.delete(chart)
  charts.delete(chart)
  chart.dispose()
  teardownGlobalResize()
}

/** 定时器统一入口：随当前组件作用域自动 clearInterval，防止离开页面后继续刷新 */
export function useManagedInterval(handler: () => void, interval: number) {
  const id = setInterval(handler, interval)
  timers.add(id)

  const clear = () => {
    clearInterval(id)
    timers.delete(id)
  }

  onScopeDispose(clear)

  return { id, clear }
}

/** 组件作用域内使用的一次性延时，离开页面自动取消，防止卸载后回调操作已销毁的图表 */
export function useManagedTimeout(handler: () => void, timeout: number) {
  const id = setTimeout(() => {
    timers.delete(id)
    handler()
  }, timeout)
  timers.add(id)

  const clear = () => {
    clearTimeout(id)
    timers.delete(id)
  }

  onScopeDispose(clear)
  return { id, clear }
}

/** 仅供健康检查 / 测试观察当前资源占用 */
export function getRegistryStats() {
  return {
    charts: charts.size,
    timers: timers.size,
    resizeBound: globalResizeBound
  }
}
