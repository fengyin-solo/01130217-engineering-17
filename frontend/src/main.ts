import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import App from './App.vue'
import router from './router'
import { setupErrorHandler } from './plugins/error-handler'
import { runHealthCheck, useHealthStore } from './store/modules/health'
import { chartRegistry } from './utils/chart-manager'
import { createLogger } from './utils/logger'
import { appConfig } from './config'
import './styles/index.scss'

const logger = createLogger('bootstrap')
const app = createApp(App)
const pinia = createPinia()

// 统一错误兜底：在任何组件挂载前安装，保证局部异常不影响整体看板
setupErrorHandler(app)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(pinia)
app.use(router)
app.use(ElementPlus, { locale: zhCn })

app.mount('#app')

// 启动后做一次健康检查（单例、带重试），失败只记录与提示状态，不阻塞页面
const healthStore = useHealthStore()
void runHealthCheck(healthStore)

// 运行时排查入口：window.__WLMS__（健康状态 / 主动复查 / 指标见 __WLMS_METRICS__）
window.__WLMS__ = {
  health: () => ({
    status: healthStore.status,
    checkedAt: healthStore.checkedAt,
    error: healthStore.error,
    version: appConfig.version,
    env: appConfig.env,
    buildTime: appConfig.buildTime,
  }),
  recheck: () => healthStore.recheck(),
}

// 页面被浏览器回收时释放全部图表资源
window.addEventListener('pagehide', () => {
  chartRegistry.disposeAll()
})

logger.info('应用启动完成', {
  version: appConfig.version,
  env: appConfig.env,
  buildTime: appConfig.buildTime,
})
