import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import App from './App.vue'
import router from './router'
import './styles/index.scss'
import { useHealthStore } from '@/store/modules/health'
import { logger } from '@/utils/logger'

const app = createApp(App)
const pinia = createPinia()

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(pinia)
app.use(router)
app.use(ElementPlus, { locale: zhCn })

// 统一初始化：健康检查单例在 pinia 就绪后建立（store setup 内完成首次探测，
// 刷新 / 重进仅创建一次，不重复绑定轮询）
useHealthStore()

app.mount('#app')
logger.info('app', `mounted (${import.meta.env.MODE})`)
