<template>
  <div class="drilling-container">
    <el-row :gutter="20" class="mb-20">
      <el-col :span="8">
        <el-select v-model="selectedWell" placeholder="请选择井" style="width: 100%">
          <el-option v-for="well in wellList" :key="well.id" :label="well.wellName" :value="well.id" />
        </el-select>
      </el-col>
      <el-col :span="16">
        <div class="drilling-status">
          <span class="status-label">当前井深:</span>
          <span class="status-value">{{ realTimeData.wellDepth }}m</span>
          <span class="status-label">机械钻速:</span>
          <span class="status-value">{{ realTimeData.rop }}m/h</span>
          <el-tag type="success" size="large">正常钻井中</el-tag>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="mb-20">
      <el-col :span="6">
        <div class="param-card">
          <div class="param-title">钻压 (WOB)</div>
          <div class="param-value">{{ realTimeData.wob }} kN</div>
          <el-progress :percentage="(realTimeData.wob / 500) * 100" :color="progressColor" />
        </div>
      </el-col>
      <el-col :span="6">
        <div class="param-card">
          <div class="param-title">转速 (RPM)</div>
          <div class="param-value">{{ realTimeData.rpm }} rpm</div>
          <el-progress :percentage="(realTimeData.rpm / 200) * 100" :color="progressColor" />
        </div>
      </el-col>
      <el-col :span="6">
        <div class="param-card">
          <div class="param-title">扭矩 (Torque)</div>
          <div class="param-value">{{ realTimeData.torque }} kN·m</div>
          <el-progress :percentage="(realTimeData.torque / 60) * 100" :color="progressColor" />
        </div>
      </el-col>
      <el-col :span="6">
        <div class="param-card">
          <div class="param-title">立管压力</div>
          <div class="param-value">{{ realTimeData.spp }} MPa</div>
          <el-progress :percentage="(realTimeData.spp / 40) * 100" :color="progressColor" />
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="mb-20">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>实时参数曲线</span>
              <el-radio-group v-model="chartPeriod" size="small">
                <el-radio-button label="1h">1小时</el-radio-button>
                <el-radio-button label="6h">6小时</el-radio-button>
                <el-radio-button label="24h">24小时</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="realTimeChart" class="chart-large"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="14">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>钻井日志</span>
              <el-button type="primary" size="small">导出日志</el-button>
            </div>
          </template>
          <el-table :data="logList" size="small" max-height="400">
            <el-table-column prop="time" label="时间" width="180" />
            <el-table-column prop="wellDepth" label="井深(m)" width="100" />
            <el-table-column prop="bitDepth" label="钻头深度(m)" width="120" />
            <el-table-column prop="wob" label="钻压(kN)" width="100" />
            <el-table-column prop="rpm" label="转速(rpm)" width="100" />
            <el-table-column prop="rop" label="钻速(m/h)" width="100" />
            <el-table-column prop="remark" label="备注" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="10">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>告警信息</span>
              <el-badge :value="alarmList.length" class="item" type="danger" />
            </div>
          </template>
          <div class="alarm-list">
            <div v-for="(alarm, index) in alarmList" :key="index" class="alarm-item" :class="'level-' + alarm.level.toLowerCase()">
              <div class="alarm-header">
                <el-tag :type="alarm.level === '严重' ? 'danger' : 'warning'" size="small">{{ alarm.level }}</el-tag>
                <span class="alarm-time">{{ alarm.time }}</span>
              </div>
              <div class="alarm-content">{{ alarm.content }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useEChart } from '@/composables/useEChart'
import { useRefresh } from '@/composables/useRefresh'

const selectedWell = ref(1)
const chartPeriod = ref('1h')
const realTimeChart = ref<HTMLElement>()

const wellList = ref([
  { id: 1, wellName: 'A-01井' },
  { id: 2, wellName: 'B-03井' },
  { id: 3, wellName: 'C-02井' }
])

const realTimeData = reactive({
  wellDepth: 2856.5,
  bitDepth: 2850.2,
  wob: 220,
  rpm: 120,
  torque: 35.5,
  rop: 8.5,
  spp: 22.5,
  mudFlowIn: 32.5,
  mudFlowOut: 31.8,
  mudDensityIn: 1.25,
  mudDensityOut: 1.28,
  mudTemperature: 45.6
})

const logList = ref([
  { time: '2024-01-15 10:30:00', wellDepth: 2856.5, bitDepth: 2850.2, wob: 220, rpm: 120, rop: 8.5, remark: '正常钻进' },
  { time: '2024-01-15 10:25:00', wellDepth: 2855.8, bitDepth: 2849.5, wob: 218, rpm: 118, rop: 8.2, remark: '正常钻进' },
  { time: '2024-01-15 10:20:00', wellDepth: 2855.1, bitDepth: 2848.8, wob: 215, rpm: 120, rop: 8.0, remark: '正常钻进' },
  { time: '2024-01-15 10:15:00', wellDepth: 2854.5, bitDepth: 2848.2, wob: 222, rpm: 122, rop: 8.3, remark: '正常钻进' },
  { time: '2024-01-15 10:10:00', wellDepth: 2853.8, bitDepth: 2847.5, wob: 218, rpm: 120, rop: 8.1, remark: '正常钻进' }
])

const alarmList = ref([
  { level: '严重', time: '10:25', content: '钻压超出上限阈值，当前值: 285kN，阈值: 250kN' },
  { level: '警告', time: '10:15', content: '泥浆出口流量波动较大，需要关注' },
  { level: '警告', time: '09:45', content: '扭矩接近上限阈值，当前值: 58kN·m' }
])

const progressColor = '#3b82f6'

const { render: renderChart } = useEChart(realTimeChart, { name: 'drilling.realtime' })

const initChart = async () => {
  if (!realTimeChart.value) return
  const times = Array.from({ length: 60 }, (_, i) => {
    const d = new Date(Date.now() - (59 - i) * 60000)
    return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`
  })

  await renderChart({
    tooltip: { trigger: 'axis' },
    legend: { data: ['钻压', '转速', '扭矩', '机械钻速'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: times },
    yAxis: [
      { type: 'value', name: '钻压(kN)', position: 'left', axisLine: { lineStyle: { color: '#3b82f6' } } },
      { type: 'value', name: '转速(rpm)', position: 'left', offset: 60, axisLine: { lineStyle: { color: '#22c55e' } } },
      { type: 'value', name: '扭矩(kN·m)', position: 'right', axisLine: { lineStyle: { color: '#f59e0b' } } },
      { type: 'value', name: '钻速(m/h)', position: 'right', offset: 60, axisLine: { lineStyle: { color: '#ef4444' } } }
    ],
    series: [
      { name: '钻压', type: 'line', smooth: true, data: Array.from({ length: 60 }, () => 200 + Math.random() * 50), yAxisIndex: 0, itemStyle: { color: '#3b82f6' } },
      { name: '转速', type: 'line', smooth: true, data: Array.from({ length: 60 }, () => 100 + Math.random() * 40), yAxisIndex: 1, itemStyle: { color: '#22c55e' } },
      { name: '扭矩', type: 'line', smooth: true, data: Array.from({ length: 60 }, () => 30 + Math.random() * 10), yAxisIndex: 2, itemStyle: { color: '#f59e0b' } },
      { name: '机械钻速', type: 'line', smooth: true, data: Array.from({ length: 60 }, () => 6 + Math.random() * 5), yAxisIndex: 3, itemStyle: { color: '#ef4444' } }
    ]
  })
}

const updateData = () => {
  realTimeData.wellDepth += 0.1
  realTimeData.bitDepth += 0.1
  realTimeData.wob = 200 + Math.random() * 50
  realTimeData.rpm = 100 + Math.random() * 40
  realTimeData.torque = 30 + Math.random() * 10
  realTimeData.rop = 6 + Math.random() * 5
}

onMounted(() => {
  void initChart()
})

// 实时数据刷新：定时器、可见性暂停与卸载释放统一由 useRefresh 管理，
// 显式 2000ms 间隔保持原实时监控频率不变
useRefresh(updateData, { name: 'drilling.realtime', interval: 2000 })
</script>

<style scoped lang="scss">
.drilling-container {
  width: 100%;
}

.drilling-status {
  display: flex;
  align-items: center;
  gap: 30px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #1e3a8a, #3b82f6);
  border-radius: 8px;
  color: #fff;
  
  .status-label {
    font-size: 14px;
    opacity: 0.8;
  }
  
  .status-value {
    font-size: 20px;
    font-weight: 600;
    margin-left: 8px;
  }
}

.param-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.08);
  
  .param-title {
    font-size: 14px;
    color: #64748b;
    margin-bottom: 10px;
  }
  
  .param-value {
    font-size: 32px;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 15px;
  }
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
}

.chart-large {
  width: 100%;
  height: 350px;
}

.alarm-list {
  max-height: 400px;
  overflow-y: auto;
}

.alarm-item {
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 10px;
  
  &.level-严重 {
    background: rgba(239, 68, 68, 0.1);
    border-left: 4px solid #ef4444;
  }
  
  &.level-警告 {
    background: rgba(245, 158, 11, 0.1);
    border-left: 4px solid #f59e0b;
  }
  
  .alarm-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  
  .alarm-time {
    font-size: 12px;
    color: #64748b;
  }
  
  .alarm-content {
    font-size: 14px;
    color: #1e293b;
  }
}
</style>
