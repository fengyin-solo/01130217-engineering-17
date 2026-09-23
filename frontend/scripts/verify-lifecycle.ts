/**
 * 驾驶舱资源生命周期 headless 校验：
 * 1. 模拟 组件挂载(scope.run) -> 路由离开(scope.stop) -> 重新挂载；
 * 2. 断言：图表实例随 scope 销毁全部释放、window resize 监听只绑定一次、
 *    interval 定时器随 scope 自动清理、重复进入不重复绑定；
 * 3. 地图无 token 时统一降级为静态示意图，不抛异常、计入可定位指标。
 *
 * 运行方式见 package.json: npm run verify:lifecycle
 */
import { JSDOM } from 'jsdom'
import { effectScope } from 'vue'
import * as echarts from 'echarts'
import { createChart, useManagedInterval, getRegistryStats } from '../src/composables/useChartManager'
import { initWellMap } from '../src/composables/useWellMap'
import { fallbackCount } from '../src/composables/metrics'

async function main() {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="a"></div><div id="b"></div></body></html>', {
    pretendToBeVisual: true
  })

  const g = dom.window as unknown as Record<string, unknown> & typeof globalThis
  ;(globalThis as Record<string, unknown>).window = g
  for (const key of ['document', 'navigator', 'HTMLElement', 'Element', 'Node', 'ResizeObserver', 'getComputedStyle', 'Event', 'MouseEvent'] as const) {
    if (!(globalThis as Record<string, unknown>)[key] && g[key] !== undefined) {
      ;(globalThis as Record<string, unknown>)[key] = g[key]
    }
  }
  if (!(globalThis as Record<string, unknown>).ResizeObserver) {
    ;(globalThis as Record<string, unknown>).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  }

  const document = g.document as Document
  let failures = 0
  const assert = (cond: boolean, message: string) => {
    if (!cond) {
      failures++
      console.error('✗', message)
    } else {
      console.log('✓', message)
    }
  }

  const el1 = document.getElementById('a')!
  const el2 = document.getElementById('b')!

  // ---- 第一次进入页面（组件 setup ≈ scope.run） ----
  const scope1 = effectScope()
  scope1.run(() => {
    createChart(el1, { series: [] })
    createChart(el2, { series: [] })
  })
  assert(getRegistryStats().charts === 2, '初次进入：登记 2 个图表')
  assert(getRegistryStats().resizeBound === true, '全局 resize / visibilitychange 监听只绑定一次')

  // ---- 路由离开：组件 scope stop 触发 onScopeDispose ----
  scope1.stop()
  assert(getRegistryStats().charts === 0, '离开页面后图表实例全部释放')
  assert(echarts.getInstanceByDom(el1) === undefined, '离开后 DOM 上无残留 ECharts 实例 (1)')
  assert(echarts.getInstanceByDom(el2) === undefined, '离开后 DOM 上无残留 ECharts 实例 (2)')
  assert(getRegistryStats().resizeBound === false, '无活跃图表时全局 resize 监听自动解绑')

  // ---- 重新进入：实例不重复、监听不叠加 ----
  const scope2 = effectScope()
  scope2.run(() => {
    createChart(el1, { series: [] })
    createChart(el1, { series: [{ type: 'line', data: [1] }] }) // 幂等：复用实例并更新配置
  })
  assert(getRegistryStats().charts === 1, '刷新/重进：同一容器复用实例，不重复绑定')

  // ---- 数据刷新定时器随 scope 自动清理 ----
  scope2.run(() => {
    useManagedInterval(() => {}, 10_000)
  })
  assert(getRegistryStats().timers === 1, '数据刷新定时器已登记')
  scope2.stop()
  assert(getRegistryStats().timers === 0, '离开页面后数据刷新定时器自动清理')

  // ---- 地图失败统一降级（无 token，不抛出、不影响其余看板） ----
  const mapEl = document.createElement('div')
  mapEl.style.width = '500px'
  mapEl.style.height = '350px'
  document.body.appendChild(mapEl)
  const fallbackBefore = fallbackCount.value
  const controller = await initWellMap(mapEl)
  assert(controller.isFallback === true, '令牌未配置时地图降级为静态示意图')
  assert(fallbackCount.value === fallbackBefore + 1, '降级事件计入可定位反馈指标')
  assert(mapEl.querySelector('svg') !== null, '降级示意图包含井位标记')
  assert(mapEl.querySelector('.map-fallback-tip') !== null, '降级示意图给出可说明的降级原因')
  controller.destroy()

  console.log(failures === 0 ? '\n所有生命周期校验通过' : `\n${failures} 项校验失败`)
  return failures === 0
}

main().then(ok => process.exit(ok ? 0 : 1))
