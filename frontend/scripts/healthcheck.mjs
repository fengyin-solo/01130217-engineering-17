#!/usr/bin/env node
/**
 * 部署 / 本地环境健康检查：
 *   node scripts/healthcheck.mjs [baseURL]
 *
 * - 探测后端健康接口与首页静态资源；
 * - 输出结构化、可定位的结果（[ok]/[fail] + 耗时 + 原因）；
 * - 任一关键依赖不可用时以非零码退出，供 CI / 部署流程直接使用。
 */
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const target = process.argv[2] || process.env.HEALTH_BASE_URL || 'http://localhost:3000'
const timeout = Number(process.env.HEALTH_TIMEOUT || 5000)
const root = path.resolve(__dirname, '..')

const checks = []
const ok = (name, detail, ms) => checks.push({ name, pass: true, detail, ms })
const fail = (name, detail, ms) => checks.push({ name, pass: false, detail, ms })

async function probe(name, url, { accept = '*/*' } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  const started = Date.now()
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: accept } })
    const ms = Date.now() - started
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    ok(name, url, ms)
  } catch (err) {
    const reason = err.name === 'AbortError' ? `timeout after ${timeout}ms` : err.message
    fail(name, `${url} — ${reason}`, Date.now() - started)
  } finally {
    clearTimeout(timer)
  }
}

;(async () => {
  // 1. 构建产物自检：部署目录须包含 index.html 与带 hash 的 JS chunk
  const dist = path.join(root, 'dist')
  if (fs.existsSync(dist)) {
    const indexHtml = path.join(dist, 'index.html')
    const hasAssets = fs.existsSync(path.join(dist, 'assets'))
    if (fs.existsSync(indexHtml) && hasAssets) {
      ok('build:dist', dist, 0)
    } else {
      fail('build:dist', `${dist} 缺少 index.html 或 assets/，请先执行 npm run build`, 0)
    }
  } else {
    fail('build:dist', `${dist} 不存在（开发环境可忽略，部署前必须构建）`, 0)
  }

  // 2. 运行时探针（服务未启动时给出明确原因，而非堆栈噪声）
  if (target) {
    await probe('http:index', target, { accept: 'text/html' })
    await probe('http:api', `${target.replace(/\/$/, '')}/api/health`, { accept: 'application/json' })
  }

  const passed = checks.filter(c => c.pass).length
  for (const c of checks) {
    console.log(`${c.pass ? '[ ok ]' : '[fail]'} ${c.name.padEnd(12)} ${String(c.ms).padStart(5)}ms  ${c.detail}`)
  }
  console.log(`\n${passed}/${checks.length} checks passed → ${target}`)
  process.exit(checks.some(c => !c.pass) ? 1 : 0)
})()
