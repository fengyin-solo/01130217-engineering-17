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
          <div ref="productionTrendChart" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>井状态分布</span>
            </div>
          </template>
          <div ref="wellStatusChart" class="chart-container"></div>
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
          <div ref="mapContainer" class="map-container"></div>
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
import { ref, onMounted } from 'vue'
import { createChart, useManagedInterval } from '@/composables/useChartManager'
import { useWellMap } from '@/composables/useWellMap'
import { appConfig } from '@/config'
import { logger } from '@/utils/logger'
import 'mapbox-gl/dist/mapbox-gl.css'

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

const productionTrendChart = ref<HTMLElement>()
const wellStatusChart = ref<HTMLElement>()
const mapContainer = ref<HTMLElement>()

// 地图实例随组件作用域统一释放（含异步加载中途离开页面的场景）
const wellMap = useWellMap()

const getAlarmType = (level: string) => {
  const map: Record<string, any> = {
    '严重': 'danger',
    '警告': 'warning',
    '提示': 'info'
  }
  return map[level] || 'info'
}

const initProductionTrendChart = () => {
  if (!productionTrendChart.value) return
  createChart(productionTrendChart.value, {
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
}

const initWellStatusChart = () => {
  if (!wellStatusChart.value) return
  createChart(wellStatusChart.value, {
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
}

/** 看板数据统一刷新：单张图表渲染失败不影响其余看板 */
const refreshDashboard = () => {
  logger.debug('dashboard', 'refresh statistics')
  // 当前为静态看板数据；接入接口后仅需在此处更新 statistics / alarmList
}

onMounted(() => {
  // 初始化幂等：createChart 内部复用已有实例，刷新 / 重进不会重复绑定
  initProductionTrendChart()
  initWellStatusChart()
  if (mapContainer.value) wellMap.init(mapContainer.value)

  if (appConfig.refresh.dashboard > 0) {
    useManagedInterval(refreshDashboard, appConfig.refresh.dashboard)
  }
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

.chart-container {
  width: 100%;
  height: 300px;
}

.map-container {
  width: 100%;
  height: 350px;
  background: #f8fafc;
  border-radius: 4px;
}
</style>
