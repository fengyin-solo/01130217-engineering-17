import type mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { mapConfig, hasValidMapToken } from '@/config'
import { createLogger, metrics } from '@/utils/logger'

const logger = createLogger('map')

/** 地图初始化结果，供页面判断是否需要降级 */
export interface MapHandle {
  ok: boolean
  reason?: 'no-token' | 'load-failed' | 'init-failed'
  map?: mapboxgl.Map
  markers?: mapboxgl.Marker[]
  /** 释放地图、标记与事件（幂等，可在 load 完成前调用） */
  destroy: () => void
}

interface MarkerSpec {
  lng: number
  lat: number
  name: string
  status: string
  color: string
}

let mapModulePromise: Promise<typeof mapboxgl> | null = null

/** mapbox-gl 按需加载，全应用只加载一次，失败后可重试 */
function loadMapbox(): Promise<typeof mapboxgl> {
  if (!mapModulePromise) {
    mapModulePromise = import('mapbox-gl').then((m) => m.default ?? m).catch((error) => {
      mapModulePromise = null
      throw error
    })
  }
  return mapModulePromise
}

function createFallback(reason: MapHandle['reason']): MapHandle {
  logger.warn('地图不可用，使用降级展示', { reason })
  metrics.record('dashboard.map.init', 0, 'fail', { reason })
  return {
    ok: false,
    reason,
    destroy: () => {
      /* 降级态无需释放 */
    },
  }
}

/**
 * 地图统一初始化：
 * - 本地 / 部署统一校验 token 与资源加载，任一失败返回降级句柄；
 * - 局部异常（地图失败）不会抛出到页面，不影响其余看板；
 * - 返回的 destroy 幂等，离开页面时（即使 load 未完成）完整移除地图、标记与事件。
 */
export async function createWellMap(
  container: HTMLElement,
  wells: MarkerSpec[]
): Promise<MapHandle> {
  if (!hasValidMapToken()) {
    return createFallback('no-token')
  }

  const start = performance.now()
  let mapbox: typeof mapboxgl
  try {
    mapbox = await loadMapbox()
  } catch (error) {
    logger.error('mapbox-gl 资源加载失败', error)
    return createFallback('load-failed')
  }

  let map: mapboxgl.Map
  try {
    mapbox.accessToken = mapConfig.accessToken
    map = new mapbox.Map({
      container,
      style: mapConfig.style,
      center: mapConfig.center,
      zoom: mapConfig.zoom,
    })
  } catch (error) {
    logger.error('地图初始化失败', error)
    return createFallback('init-failed')
  }

  const markers: mapboxgl.Marker[] = []
  let settled = false
  let destroyed = false
  let onLoad: () => void = () => {}
  let onError: (e?: { error?: unknown }) => void = () => {}

  const cleanupListeners = () => {
    map.off('load', onLoad)
    map.off('error', onError)
  }

  const destroy = () => {
    if (destroyed) return
    destroyed = true
    cleanupListeners()
    markers.forEach((marker) => marker.remove())
    markers.length = 0
    try {
      map.remove()
    } catch (error) {
      logger.warn('地图销毁异常（可忽略）', error)
    }
  }

  return new Promise<MapHandle>((resolve) => {
    const fail = (reason: MapHandle['reason']) => {
      if (settled) return
      settled = true
      destroy()
      resolve(createFallback(reason))
    }

    onError = (e) => {
      logger.error('地图资源加载错误（style / 瓦片失败）', e?.error)
      fail('load-failed')
    }

    onLoad = () => {
      if (settled) return
      settled = true
      cleanupListeners()

      // load 完成前页面已离开：直接销毁，不再做任何标记 / 回调
      if (destroyed) {
        destroy()
        resolve({ ok: false, reason: 'init-failed', destroy })
        return
      }

      // 瓦片后续失败不再整体降级，仅记录，保证看板其余部分可用
      map.on('error', (e) => logger.warn('地图运行时错误', e?.error))

      try {
        wells.forEach((well) => {
          const el = document.createElement('div')
          el.className = 'well-marker'
          el.style.backgroundColor = well.color
          el.style.width = '16px'
          el.style.height = '16px'
          el.style.borderRadius = '50%'
          el.style.border = '2px solid #fff'
          el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)'

          markers.push(
            new mapbox.Marker(el)
              .setLngLat([well.lng, well.lat])
              .setPopup(
                new mapbox.Popup({ offset: 25 }).setHTML(
                  `<h4>${well.name}</h4><p>状态: ${well.status}</p>`
                )
              )
              .addTo(map)
          )
        })
      } catch (error) {
        logger.error('井位标记创建失败', error)
        metrics.record('dashboard.map.markers', performance.now() - start, 'fail')
        // 标记失败不影响地图主体
      }

      metrics.record('dashboard.map.init', performance.now() - start, 'ok')
      logger.info('地图初始化完成', { wells: wells.length })

      resolve({
        ok: true,
        map,
        markers,
        destroy,
      })
    }

    map.once('load', onLoad)
    map.once('error', onError)
  })
}
