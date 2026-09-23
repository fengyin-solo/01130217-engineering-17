import type { App } from 'vue'
import { createLogger, metrics } from '@/utils/logger'

const logger = createLogger('error')

/**
 * 全局错误兜底：
 * - Vue 组件内未捕获的渲染 / 生命周期 / watcher 异常；
 * - 未被 Promise 链处理的 rejection；
 * - window error（含脚本、静态资源加载失败）。
 *
 * 统一记录后不再向上抛出：局部异常只记录与打点，
 * 避免一张图表 / 一个资源失败拖垮整个看板。
 */
export function setupErrorHandler(app: App): void {
  app.config.errorHandler = (error, _instance, info) => {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('组件运行异常', { message, info })
    metrics.record('app.vue.error', 0, 'fail', { info, error: message })
  }

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    const message = reason instanceof Error ? reason.message : String(reason)
    logger.error('未处理的 Promise 异常', { message })
    metrics.record('app.promise.error', 0, 'fail', { error: message })
    // 阻止控制台再抛未捕获警告
    event.preventDefault()
  })

  window.addEventListener('error', (event) => {
    // 资源加载失败（script / link / img 等）的 target 为具体元素
    const target = event.target as EventTarget | null
    if (target && target instanceof HTMLElement) {
      const url =
        (target as HTMLScriptElement).src ||
        (target as HTMLLinkElement).href ||
        target.outerHTML?.slice(0, 120) ||
        ''
      logger.error('静态资源加载失败', { tag: target.tagName, url })
      metrics.record('app.resource.error', 0, 'fail', {
        tag: target.tagName,
        url: String(url),
      })
    } else {
      logger.error('运行时错误', {
        message: event.message,
        source: event.filename,
        line: event.lineno,
      })
      metrics.record('app.runtime.error', 0, 'fail', { message: event.message })
    }
  }, true)

  logger.debug('全局错误处理已安装')
}
