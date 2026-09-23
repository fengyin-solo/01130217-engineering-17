/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 应用名称 */
  readonly VITE_APP_TITLE: string
  /** 当前运行环境（development / production） */
  readonly VITE_APP_ENV: string
  /** Mapbox 访问令牌，未配置时地图走降级展示 */
  readonly VITE_MAPBOX_TOKEN: string
  /** 驾驶舱数据刷新间隔（毫秒），0 为关闭 */
  readonly VITE_REFRESH_INTERVAL: string
  /** 健康检查地址 */
  readonly VITE_HEALTH_URL: string
  /** 健康检查超时时间（毫秒） */
  readonly VITE_HEALTH_TIMEOUT: string
  /** 健康检查失败重试次数 */
  readonly VITE_HEALTH_RETRIES: string
  /** 是否输出关键指标日志 */
  readonly VITE_METRICS_LOG: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare const __APP_VERSION__: string
declare const __BUILD_TIME__: string

interface Window {
  /** 运行时指标排查入口（实现见 utils/logger.ts） */
  __WLMS_METRICS__?: import('./utils/logger').MetricsCollector
  /** 运行时健康状态排查入口 */
  __WLMS__?: {
    health: () => Record<string, unknown>
    recheck: () => Promise<boolean>
  }
}
