<template>
  <div class="dashboard-container">
    <el-row :gutter="20" class="mb-20">
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon well">
            <el-icon><Position /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.wellCount || 0 }}</div>
            <div class="stat-label">总井数</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon drilling">
            <el-icon><Monitor /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.drillingCount || 0 }}</div>
            <div class="stat-label">钻井中</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon production">
            <el-icon><TrendCharts /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.productionCount || 0 }}</div>
            <div class="stat-label">生产中</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon alarm">
            <el-icon><Warning /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.alarmCount || 0 }}</div>
            <div class="stat-label">告警数量</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="mb-20">
      <el-col :span="16">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>产量趋势</span>
            </div>
          </template>
          <div class="chart-wrapper">
            <div ref="productionTrendEl" class="chart-container"></div>
            <div v-if="productionTrendDegraded" class="chart-fallback">
              <el-icon :size="28"><WarningFilled /></el-icon>
              <p>图表资源加载失败，已暂时隐藏该图表</p>
              <el-button size="small" type="primary" @click="retryCharts">重试</el-button>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>井状态分布</span>
            </div>
          </template>
          <div class="chart-wrapper">
            <div ref="wellStatusEl" class="chart-container"></div>
            <div v-if="wellStatusDegraded" class="chart-fallback">
              <el-icon :size="28"><WarningFilled /></el-icon>
              <p>图表资源加载失败，已暂时隐藏该图表</p>
              <el-button size="small" type="primary" @click="retryCharts">重试</el-button>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="12">
        <el-card class="map-card">
          <template #header>
            <div class="card-header">
              <span>井位分布图</span>
            </div>
          </template>
          <div class="chart-wrapper">
            <div ref="mapContainer" class="map-container"></div>
            <div v-if="mapDegraded" class="chart-fallback map-fallback">
              <el-icon :size="28"><LocationInfo /></el-icon>
              <p>地图服务暂不可用（{{ mapDegradedReason }}），井位分布信息可在「井位管理」中查看</p>
              <el-button size="small" type="primary" @click="initMap">重试</el-button>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card class="list-card">
          <template #header>
            <div class="card-header">
              <span>实时告警</span>
              <el-button type="primary" size="small">查看全部</el-button>
            </div>
          </template>
          <el-table :data="alarmList" style="width: 100%">
            <el-table-column prop="wellName" label="井名" width="100" />
            <el-table-column prop="alarmType" label="告警类型" width="120" />
            <el-table-column prop="level" label="级别" width="100">
              <template #default="{ row }">
                <el-tag :type="getAlarmType(row.level)" size="small">{{ row.level }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="time" label="时间" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useEChart } from '@/composables/useEChart'
import { useRefresh } from '@/composables/useRefresh'
import { createWellMap, type MapHandle } from '@/utils/map-manager'
import { createLogger } from '@/utils/logger'
import type { EChartsCoreOption } from 'echarts'

const logger = createLogger('dashboard')

const statistics = ref({
  wellCount: 156,
  drillingCount: 12,
  productionCount: 89,
  alarmCount: 5
})

const alarmList = ref([
  { wellName: 'A-01井', alarmType: '钻压异常', level: '严重', time: '2024-01-15 10:30' },
  { wellName: 'B-03井', alarmType: '温度超标', level: '警告', time: '2024-01-15 10:25' },
  { wellName: 'C-02井', alarmType: '设备故障', level: '严重', time: '2024-01-15 10:15' },
  { wellName: 'D-05井', alarmType: '产量偏低', level: '提示', time: '2024-01-15 10:00' },
  { wellName: 'E-01井', alarmType: '环保指标', level: '警告', time: '2024-01-15 09:45' }
])

const mapContainer = ref<HTMLElement>()
const mapDegraded = ref(false)
const mapDegradedReason = ref('')
let mapHandle: MapHandle | null = null

// 图表实例、resize 监听与 dispose 全部由 useEChart / chartRegistry 统一收口
const productionTrendEl = ref<HTMLElement>()
const wellStatusEl = ref<HTMLElement>()
const {
  render: renderProductionTrend,
  degraded: productionTrendDegraded
} = useEChart(productionTrendEl, { name: 'dashboard.productionTrend' })
const {
  render: renderWellStatus,
  degraded: wellStatusDegraded
} = useEChart(wellStatusEl, { name: 'dashboard.wellStatus' })

const getAlarmType = (level: string) => {
  const map: Record<string, any> = {
    '严重': 'danger',
    '警告': 'warning',
    '提示': 'info'
  }
  return map[level] || 'info'
}

const getProductionTrendOption = (): EChartsCoreOption => ({
  tooltip: { trigger: 'axis' },
  legend: { data: ['日产油量', '日产水量'] },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: ['1月', '2月', '3月', '4月', '5月', '6月', '7月']
  },
  yAxis: { type: 'value' },
  series: [
    {
      name: '日产油量',
      type: 'line',
      smooth: true,
      data: [120, 132, 101, 134, 90, 230, 210],
      itemStyle: { color: '#3b82f6' }
    },
    {
      name: '日产水量',
      type: 'line',
      smooth: true,
      data: [220, 182, 191, 234, 290, 330, 310],
      itemStyle: { color: '#06b6d4' }
    }
  ]
})

const getWellStatusOption = (): EChartsCoreOption => ({
  tooltip: { trigger: 'item' },
  legend: { orient: 'vertical', left: 'left' },
  series: [
    {
      name: '井状态',
      type: 'pie',
      radius: '60%',
      data: [
        { value: 89, name: '生产中', itemStyle: { color: '#22c55e' } },
        { value: 12, name: '钻井中', itemStyle: { color: '#3b82f6' } },
        { value: 35, name: '待修井', itemStyle: { color: '#f59e0b' } },
        { value: 20, name: '关停井', itemStyle: { color: '#ef4444' } }
      ],
      emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
    }
  ]
})

const renderCharts = async () => {
  // 各图表独立 catch：一个失败不影响另一个，也不影响地图和告警列表
  await Promise.allSettled([
    renderProductionTrend(getProductionTrendOption()),
    renderWellStatus(getWellStatusOption())
  ])
}

const retryCharts = () => {
  logger.info('用户触发图表重试')
  renderCharts()
}

const WELL_MARKERS = [
  { lng: 118.5, lat: 38.2, name: 'A-01井', status: 'production' },
  { lng: 118.8, lat: 38.5, name: 'B-03井', status: 'drilling' },
  { lng: 119.1, lat: 38.3, name: 'C-02井', status: 'production' },
  { lng: 118.6, lat: 38.7, name: 'D-05井', status: 'maintenance' }
]

const initMap = async () => {
  if (!mapContainer.value) return
  // 重进 / 重试前先释放旧实例，保证不会叠加地图监听
  mapHandle?.destroy()
  mapHandle = null
  mapDegraded.value = false
  mapDegradedReason.value = ''

  const wells = WELL_MARKERS.map((well) => ({
    ...well,
    color:
      well.status === 'production'
        ? '#22c55e'
        : well.status === 'drilling'
          ? '#3b82f6'
          : '#f59e0b'
  }))

  const handle = await createWellMap(mapContainer.value, wells)
  if (handle.ok) {
    mapHandle = handle
  } else {
    // 地图统一降级：仅本卡片展示提示，其余看板不受影响
    mapDegraded.value = true
    mapDegradedReason.value =
      handle.reason === 'no-token'
        ? '未配置访问令牌'
        : handle.reason === 'load-failed'
          ? '地图资源加载失败'
          : '地图初始化失败'
  }
}

/** 驾驶舱数据刷新任务（定时调用由 useRefresh 统一管理） */
const loadDashboard = async () => {
  await renderCharts()
}

// 刷新间隔、页面隐藏暂停、定时器释放统一走全局配置
useRefresh(loadDashboard, {
  name: 'dashboard',
  immediate: false
})

onMounted(() => {
  void renderCharts()
  void initMap()
  logger.debug('驾驶舱挂载')
})

// 离开驾驶舱时释放地图（图表实例由 useEChart 的 onBeforeUnmount 统一释放），
// 即使地图仍在加载，destroy 也是幂等安全的
onBeforeUnmount(() => {
  mapHandle?.destroy()
  mapHandle = null
})
</script>

<style scoped lang="scss">
.dashboard-container {
  width: 100%;
}

.stat-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.08);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #fff;

  &.well { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
  &.drilling { background: linear-gradient(135deg, #8b5cf6, #6d28d9); }
  &.production { background: linear-gradient(135deg, #22c55e, #16a34a); }
  &.alarm { background: linear-gradient(135deg, #ef4444, #dc2626); }
}

.stat-content {
  flex: 1;

  .stat-value {
    font-size: 28px;
    font-weight: 600;
    color: #1e293b;
    line-height: 1;
    margin-bottom: 6px;
  }

  .stat-label {
    font-size: 14px;
    color: #64748b;
  }
}

.chart-card,
.map-card,
.list-card {
  height: 100%;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  color: #1e293b;
}

.chart-wrapper {
  position: relative;
}

.chart-container {
  width: 100%;
  height: 300px;
}

.chart-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 4px;
  color: #64748b;
  font-size: 13px;
  text-align: center;

  p {
    margin: 0;
  }
}

.map-container {
  width: 100%;
  height: 350px;
  background: #f8fafc;
  border-radius: 4px;
}

.map-fallback {
  height: 350px;
}
</style>
