# 单井全生命周期管理系统（前端）

## 开发与构建

```bash
npm install
npm run dev         # 本地开发（含 /health.json 开发态健康端点）
npm run type-check  # 仅做类型检查
npm run build       # 类型检查 + 生产构建，构建结束打印版本/构建时间
npm run preview     # 预览生产构建
```

## 环境配置（本地开发 / 部署统一）

所有环境变量在 `.env.development` / `.env.production` 中配置，由
`src/config/index.ts` 统一解析，业务代码不再硬编码：

| 变量 | 说明 | 默认 |
| --- | --- | --- |
| `VITE_MAPBOX_TOKEN` | Mapbox 令牌；为空或占位值时地图统一降级 | 空 |
| `VITE_REFRESH_INTERVAL` | 驾驶舱数据刷新间隔(ms)，0 关闭 | 30000 |
| `VITE_HEALTH_URL` | 健康检查地址 | `/health.json` |
| `VITE_HEALTH_TIMEOUT` | 健康检查超时(ms) | 5000 |
| `VITE_HEALTH_RETRIES` | 健康检查失败重试次数 | 2 |
| `VITE_METRICS_LOG` | 是否输出关键指标日志 | dev 开 / prod 关 |

部署真实地图时注入令牌：

```bash
VITE_MAPBOX_TOKEN=pk.xxx npm run build
```

## 资源生命周期与降级

- 图表：`useEChart` + `chartRegistry` 统一 init / resize / dispose；
  全应用只有一个 window resize 监听（ResizeObserver 兜底），
  组件卸载自动释放，刷新或重进驾驶舱不会重复绑定。
- 地图：`createWellMap` 按需加载 mapbox-gl，token 缺失、资源加载或
  style/瓦片失败时只让地图卡片降级并提供“重试”，不影响其余看板。
- 数据刷新：`useRefresh` 统一管理定时器、页面隐藏暂停、重入防重，
  卸载自动清理；上一次任务未结束时跳过本次调度。
- 全局错误：Vue errorHandler、unhandledrejection、window error
  统一记录，局部异常不阻断页面。

## 健康检查与排查反馈

- 应用启动自动探测 `/health.json`（开发态由 vite 中间件提供，
  部署态使用 `public/health.json` 静态文件），失败按配置重试；
  顶栏健康指示灯展示状态，点击可重新检查，悬浮可见版本、构建时间。
- 浏览器控制台排查入口：
  - `window.__WLMS__`：健康状态 / 主动复查
  - `window.__WLMS_METRICS__`：图表初始化、地图、刷新、健康检查等关键指标
  - 日志统一带 `[WLMS][环境][模块]` 前缀，便于按模块定位
