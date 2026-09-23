import { defineConfig } from 'vite'
import type { ConfigEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

/**
 * 本地开发与部署共用同一份配置：
 * 环境差异收敛到 .env.*（见 src/config），此处只处理构建策略。
 */
export default defineConfig(({ mode }: ConfigEnv) => ({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  // 部署产物内置 sourcemap，便于线上图表 / 接口异常定位
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // 大体积依赖独立分包：地图失败或按需加载时不拖垮主包
          echarts: ['echarts'],
          mapbox: ['mapbox-gl'],
          vendor: ['vue', 'vue-router', 'pinia', 'element-plus']
        }
      }
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
  // 构建过程可定位反馈：模块大小与分包信息始终输出
  logLevel: 'info',
  define: {
    __BUILD_MODE__: JSON.stringify(mode)
  }
}))
