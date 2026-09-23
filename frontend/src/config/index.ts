/**
 * 全局运行配置（本地开发 / 部署环境统一入口）
 *
 * 所有与环境相关的值只在此处解析一次，业务代码统一从这里读取，
 * 禁止再在组件内硬编码 token、刷新间隔、超时等配置。
 */

const env = import.meta.env

/** 解析数字型环境变量，非法值回退到默认值 */
const toNumber = (value: string | undefined, fallback: number): number => {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

/** 解析布尔型环境变量 */
const toBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) return fallback
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
}

export const appConfig = Object.freeze({
  /** 应用标题 */
  title: env.VITE_APP_TITLE || '单井全生命周期管理系统',
  /** 运行环境：development / production */
  env: env.VITE_APP_ENV || env.MODE || 'development',
  /** 是否本地开发环境 */
  isDev: env.DEV,
  /** 是否生产构建 */
  isProd: env.PROD,
  /** 构建版本号（构建时由 vite define 注入） */
  version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev',
  /** 构建时间（构建时由 vite define 注入） */
  buildTime: typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : '',
})

/** 地图相关配置 */
export const mapConfig = Object.freeze({
  /**
   * Mapbox 令牌。为空或仍是示例占位值时视为未配置，直接降级。
   * 部署时通过 VITE_MAPBOX_TOKEN 注入。
   */
  accessToken: env.VITE_MAPBOX_TOKEN || '',
  style: 'mapbox://styles/mapbox/light-v11',
  center: [118.8, 38.5] as [number, number],
  zoom: 6,
})

/** 数据刷新配置（驾驶舱等页面共用） */
export const refreshConfig = Object.freeze({
  /** 自动刷新间隔（毫秒），0 表示关闭 */
  interval: toNumber(env.VITE_REFRESH_INTERVAL, 30000),
  /** 页面隐藏时是否暂停刷新 */
  pauseWhenHidden: true,
})

/** 健康检查配置 */
export const healthConfig = Object.freeze({
  url: env.VITE_HEALTH_URL || '/health.json',
  timeout: toNumber(env.VITE_HEALTH_TIMEOUT, 5000),
  retries: toNumber(env.VITE_HEALTH_RETRIES, 2),
})

/** 指标 / 日志配置 */
export const metricsConfig = Object.freeze({
  enableLog: toBoolean(env.VITE_METRICS_LOG, env.DEV),
})

/** Mapbox 占位令牌特征（历史 mock token 视为未配置） */
const PLACEHOLDER_TOKEN_PATTERN = /mocktoken|^\s*$|\.Q$/

export const hasValidMapToken = (): boolean =>
  Boolean(mapConfig.accessToken) && !PLACEHOLDER_TOKEN_PATTERN.test(mapConfig.accessToken.trim())
