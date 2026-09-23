/**
 * 统一日志：所有图表 / 地图 / 健康检查相关反馈均带模块标签输出，
 * 生产环境只保留 warn / error，避免控制台噪声同时保证问题可定位。
 */
import { isDev } from '@/config'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

function format(scope: string, args: unknown[]) {
  return [`%c[${scope}]`, 'color:#3b82f6;font-weight:600', ...args]
}

export const logger = {
  debug(scope: string, ...args: unknown[]) {
    if (isDev) console.debug(...format(scope, args))
  },
  info(scope: string, ...args: unknown[]) {
    if (isDev) console.info(...format(scope, args))
  },
  warn(scope: string, ...args: unknown[]) {
    console.warn(...format(scope, args))
  },
  error(scope: string, ...args: unknown[]) {
    console.error(...format(scope, args))
  }
}

/** 关键指标埋点：开发环境直接打印，生产环境可在此对接上报接口而不改调用方 */
export function reportMetric(name: string, value = 1, extra?: Record<string, unknown>) {
  logger.debug('metric', { name, value, ...extra })
}
