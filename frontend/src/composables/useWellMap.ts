/**
 * 驾驶舱地图资源统一管理：
 * - mapbox-gl 按需动态加载，token 缺失 / 样式超时 / 运行时异常时降级为静态示意图；
 * - 降级只替换地图容器内容，不影响同页的图表与告警列表；
 * - 实例、事件与资源在组件作用域销毁时统一释放（路由离开即回收）。
 */
import { onScopeDispose } from 'vue'
import { appConfig } from '@/config'
import { logger } from '@/utils/logger'
import { recordFallback } from './metrics'

/** mapbox-gl 运行时为 default 导出（UMD），类型上 Map 为命名导出 */
type MapCtor = new (options: Record<string, unknown>) => MapInstance
interface MapboxModule {
  default?: MapCtor
  Map: MapCtor
  Marker: new (element?: HTMLElement) => MarkerInstance
  Popup: new (options?: Record<string, unknown>) => PopupInstance
  accessToken: string
}
interface MapInstance {
  once(event: string, cb: (e?: { error?: Error }) => void): void
  remove(): void
}
interface MarkerInstance {
  setLngLat(lngLat: [number, number]): MarkerInstance
  setPopup(popup: PopupInstance): MarkerInstance
  addTo(map: MapInstance): MarkerInstance
}
interface PopupInstance {
  setHTML(html: string): PopupInstance
}

interface MapController {
  isFallback: boolean
  destroy: () => void
}

const WELL_POINTS: Array<{ lng: number; lat: number; name: string; status: string }> = [
  { lng: 118.5, lat: 38.2, name: 'A-01井', status: 'production' },
  { lng: 118.8, lat: 38.5, name: 'B-03井', status: 'drilling' },
  { lng: 119.1, lat: 38.3, name: 'C-02井', status: 'production' },
  { lng: 118.6, lat: 38.7, name: 'D-05井', status: 'maintenance' }
]

const STATUS_COLOR: Record<string, string> = {
  production: '#22c55e',
  drilling: '#3b82f6',
  maintenance: '#f59e0b'
}

const STATUS_TEXT: Record<string, string> = {
  production: '生产中',
  drilling: '钻井中',
  maintenance: '待修井'
}

/** 静态降级示意图：保持与正式地图一致的井位分布视觉 */
export function renderStaticFallback(container: HTMLElement, reason: string): MapController {
  recordFallback('map', reason)
  logger.warn('map', 'fallback to static view:', reason)

  const width = container.clientWidth || 500
  const height = container.clientHeight || 350
  const [centerLng, centerLat] = appConfig.map.center

  const project = (lng: number, lat: number) => {
    const span = 1.0
    const x = ((lng - centerLng) / span + 0.5) * width
    const y = (0.5 - (lat - centerLat) / span) * height
    return { x, y }
  }

  const markers = WELL_POINTS.map(w => {
    const { x, y } = project(w.lng, w.lat)
    return `
      <g class="map-marker">
        <circle cx="${x}" cy="${y}" r="7" fill="${STATUS_COLOR[w.status] || '#f59e0b'}" stroke="#fff" stroke-width="2"/>
        <title>${w.name}（${STATUS_TEXT[w.status] || w.status}）</title>
      </g>`
  }).join('')

  container.classList.add('map-container--fallback')
  container.innerHTML = `
    <div class="map-fallback-tip">井位分布图（离线示意图）· ${reason}</div>
    <svg class="map-fallback-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
      ${markers}
    </svg>`

  return { isFallback: true, destroy() {} }
}

/**
 * 在容器内初始化地图。任何失败路径都保证返回可用的（可能是降级）controller，
 * 调用方据此执行 destroy 即可，无需重复 try/catch。
 */
export async function initWellMap(container: HTMLElement): Promise<MapController> {
  const { enabled, accessToken } = appConfig.map

  if (!enabled) return renderStaticFallback(container, '地图功能未启用')
  if (!accessToken) return renderStaticFallback(container, '地图令牌未配置')

  let mapbox: MapboxModule
  try {
    // Vite/ESM 下为 default 导出；部分打包形态为命名导出，二者兼容
    const mod = (await import('mapbox-gl')) as unknown as MapboxModule & { default?: MapboxModule }
    mapbox = mod.Map ? mod : (mod.default as MapboxModule)
  } catch (err) {
    return renderStaticFallback(container, `地图资源加载失败: ${(err as Error)?.message || err}`)
  }

  mapbox.accessToken = accessToken

  let loadTimer: ReturnType<typeof setTimeout> | undefined

  let map: MapInstance | undefined
  try {
    // 清理上一次降级内容，确保 Mapbox 在空容器内挂载
    container.classList.remove('map-container--fallback')
    container.innerHTML = ''
    map = new mapbox.Map({
      container,
      style: appConfig.map.style,
      center: appConfig.map.center,
      zoom: appConfig.map.zoom
    })

    await new Promise<void>((resolve, reject) => {
      let settled = false
      const finish = (err?: Error) => {
        if (settled) return
        settled = true
        clearTimeout(loadTimer)
        err ? reject(err) : resolve()
      }
      // error 事件会在单个瓦片失败时也触发，仅在 load 未完成前视为致命错误
      map!.once('load', () => finish())
      map!.once('error', e => finish(new Error(e?.error?.message || 'map error')))
      loadTimer = setTimeout(() => finish(new Error('样式加载超时')), appConfig.map.loadTimeout)
    })

    WELL_POINTS.forEach(well => {
      const el = document.createElement('div')
      el.className = 'well-marker'
      el.style.backgroundColor = STATUS_COLOR[well.status] || '#f59e0b'
      el.style.width = '16px'
      el.style.height = '16px'
      el.style.borderRadius = '50%'
      el.style.border = '2px solid #fff'
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)'

      new mapbox.Marker(el)
        .setLngLat([well.lng, well.lat])
        .setPopup(new mapbox.Popup({ offset: 25 }).setHTML(`<h4>${well.name}</h4><p>状态: ${STATUS_TEXT[well.status] || well.status}</p>`))
        .addTo(map!)
    })

    logger.info('map', 'map ready with', WELL_POINTS.length, 'wells')
  } catch (err) {
    map?.remove()
    return renderStaticFallback(container, `${(err as Error)?.message || err}`)
  }

  return {
    isFallback: false,
    destroy() {
      map?.remove()
      map = undefined
    }
  }
}

/**
 * 组件作用域内使用的地图生命周期封装：
 * - init 可重复调用（刷新 / 重进幂等，旧实例先销毁）；
 * - 异步初始化未完成即离开页面时，完成后会自动销毁，不残留 Mapbox 资源。
 */
export function useWellMap() {
  let controller: MapController | null = null
  let disposed = false

  const destroy = () => {
    disposed = true
    controller?.destroy()
    controller = null
  }

  const init = async (container: HTMLElement) => {
    if (controller) controller.destroy()
    disposed = false
    const created = await initWellMap(container)
    if (disposed) {
      // 资源在异步加载期间页面已离开
      created.destroy()
      return null
    }
    controller = created
    return created
  }

  onScopeDispose(destroy)
  return { init, destroy }
}
