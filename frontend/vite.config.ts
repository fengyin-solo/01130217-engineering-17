import { defineConfig, PluginOption } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { readFileSync } from 'fs'

// 从 package.json 读取版本号，构建时注入，便于健康检查与日志定位版本
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))

/** 打印可定位的构建结果（版本、构建时间、产物） */
function buildInfoPlugin(): PluginOption {
  return {
    name: 'wlms-build-info',
    apply: 'build',
    closeBundle() {
      const info = {
        name: pkg.name,
        version: pkg.version,
        buildTime: new Date().toISOString(),
      }
      // eslint-disable-next-line no-console
      console.log('\n[WLMS build]', JSON.stringify(info), '\n')
    },
  }
}

/** 本地开发环境健康检查端点，与部署环境 /health.json 路径保持一致 */
function devHealthPlugin(): PluginOption {
  return {
    name: 'wlms-dev-health',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/health.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(
          JSON.stringify({
            status: 'ok',
            service: pkg.name,
            env: 'development',
            version: pkg.version,
          })
        )
      })
    },
  }
}

export default defineConfig({
  plugins: [vue(), devHealthPlugin(), buildInfoPlugin()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
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
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        // echarts / mapbox 独立分包，资源加载失败时只影响对应看板模块
        manualChunks: {
          echarts: ['echarts'],
          mapbox: ['mapbox-gl'],
        },
      },
    },
  },
})
