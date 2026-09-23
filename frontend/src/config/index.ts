/**
 * 统一运行时配置：开发与部署环境共用同一套初始化 / 销毁 / 降级逻辑，
 * 差异仅通过 import.meta.env 的环境变量收敛在这里。
 */

const num = (v: string | undefined, fallback: number) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

const bool = (v: string | undefined, fallback: boolean) => {
  if (v === undefined || v === '') return fallback
  return v !== 'false' && v !== '0'
}

// 兼容 Vite 之外的运行环境（headless 校验脚本 / 测试）
const env: ImportMetaEnv | Record<string, string | undefined> =
  (import.meta as { env?: ImportMetaEnv }).env ?? {}

export const appConfig = {
  apiBaseUrl: env.VITE_API_BASE_URL || '/api',
  health: {
    url: env.VITE_HEALTH_URL || '/api/health',
    timeout: num(env.VITE_HEALTH_TIMEOUT, 5000),
    /** 健康状态轮询间隔，0 表示不轮询 */
    interval: num(env.VITE_HEALTH_INTERVAL, 0)
  },
  map: {
    enabled: bool(env.VITE_MAP_ENABLED, true),
    accessToken: env.VITE_MAPBOX_TOKEN || '',
    style: env.VITE_MAP_STYLE || 'mapbox://styles/mapbox/light-v11',
    /** 样式/瓦片加载超时，超时后按资源加载失败处理并降级 */
    loadTimeout: num(env.VITE_MAP_LOAD_TIMEOUT, 8000),
    center: [118.8, 38.5] as [number, number],
    zoom: 6
  },
  refresh: {
    /** 综合驾驶舱看板数据刷新间隔，0 表示不自动刷新 */
    dashboard: num(env.VITE_DASHBOARD_REFRESH_INTERVAL, 30000),
    /** 钻井实时参数刷新间隔 */
    drilling: num(env.VITE_DRILLING_REFRESH_INTERVAL, 2000)
  }
}

export type AppConfig = typeof appConfig

export const isDev: boolean = Boolean((import.meta as { env?: ImportMetaEnv }).env?.DEV)
