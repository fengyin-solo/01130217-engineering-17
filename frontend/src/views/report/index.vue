<template>
  <div class="report-container">
    <el-card class="mb-20">
      <template #header>
        <div class="card-header">
          <span>报表中心</span>
          <div>
            <el-select v-model="reportType" placeholder="选择报表类型" style="width: 200px; margin-right: 10px;">
              <el-option label="生产日报" value="daily" />
              <el-option label="生产周报" value="weekly" />
              <el-option label="生产月报" value="monthly" />
              <el-option label="钻井进度报表" value="drilling" />
              <el-option label="设备运行报表" value="equipment" />
              <el-option label="HSE报表" value="hse" />
            </el-select>
            <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" style="width: 300px; margin-right: 10px;" />
            <el-button type="primary">查询</el-button>
            <el-button>导出Excel</el-button>
          </div>
        </div>
      </template>

      <el-row :gutter="20" class="mb-20">
        <el-col :span="8">
          <div class="summary-card">
            <div class="summary-label">总产油量</div>
            <div class="summary-value">12,586</div>
            <div class="summary-unit">吨</div>
            <div class="summary-trend up">
              <el-icon><TrendCharts /></el-icon>
              <span>较上期 +8.5%</span>
            </div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="summary-card">
            <div class="summary-label">总产水量</div>
            <div class="summary-value">35,241</div>
            <div class="summary-unit">吨</div>
            <div class="summary-trend down">
              <el-icon><TrendCharts /></el-icon>
              <span>较上期 -3.2%</span>
            </div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="summary-card">
            <div class="summary-label">平均含水率</div>
            <div class="summary-value">73.68</div>
            <div class="summary-unit">%</div>
            <div class="summary-trend up">
              <el-icon><TrendCharts /></el-icon>
              <span>较上期 +1.2%</span>
            </div>
          </div>
        </el-col>
      </el-row>

      <el-row :gutter="20" class="mb-20">
        <el-col :span="16">
          <div class="chart-box">
            <h4>产量趋势分析</h4>
            <div ref="trendChart" class="chart-large"></div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="chart-box">
            <h4>区块产量占比</h4>
            <div ref="pieChart" class="chart-medium"></div>
          </div>
        </el-col>
      </el-row>

      <div class="table-box">
        <h4>详细数据</h4>
        <el-table :data="reportData" border stripe style="width: 100%">
          <el-table-column prop="date" label="日期" width="120" />
          <el-table-column prop="wellName" label="井名" width="100" />
          <el-table-column prop="oilProduction" label="产油量(t)" width="120" />
          <el-table-column prop="waterProduction" label="产水量(t)" width="120" />
          <el-table-column prop="gasProduction" label="产气量(m³)" width="120" />
          <el-table-column prop="waterCut" label="含水率(%)" width="120">
            <template #default="{ row }">
              <el-progress :percentage="row.waterCut" :stroke-width="10" />
            </template>
          </el-table-column>
          <el-table-column prop="workingHours" label="生产时长(h)" width="120" />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === '正常' ? 'success' : 'warning'" size="small">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { createChart } from '@/composables/useChartManager'

const reportType = ref('daily')
const dateRange = ref('')
const trendChart = ref<HTMLElement>()
const pieChart = ref<HTMLElement>()

const reportData = ref([
  { date: '2024-01-15', wellName: 'A-01井', oilProduction: 125.6, waterProduction: 352.1, gasProduction: 850, waterCut: 73.7, workingHours: 24, status: '正常' },
  { date: '2024-01-15', wellName: 'B-03井', oilProduction: 98.3, waterProduction: 285.6, gasProduction: 720, waterCut: 74.4, workingHours: 24, status: '正常' },
  { date: '2024-01-15', wellName: 'C-02井', oilProduction: 156.2, waterProduction: 412.3, gasProduction: 980, waterCut: 72.5, workingHours: 22, status: '正常' },
  { date: '2024-01-15', wellName: 'D-05井', oilProduction: 85.4, waterProduction: 268.9, gasProduction: 650, waterCut: 75.9, workingHours: 24, status: '异常' },
  { date: '2024-01-15', wellName: 'E-01井', oilProduction: 112.8, waterProduction: 325.4, gasProduction: 790, waterCut: 74.2, workingHours: 24, status: '正常' }
])

const initTrendChart = () => {
  if (!trendChart.value) return
  const dates = ['1/10', '1/11', '1/12', '1/13', '1/14', '1/15', '1/16', '1/17', '1/18', '1/19', '1/20']
  createChart(trendChart.value, {
    tooltip: { trigger: 'axis' },
    legend: { data: ['产油量', '产水量'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: dates },
    yAxis: { type: 'value' },
    series: [
      { name: '产油量', type: 'line', smooth: true, stack: 'Total', areaStyle: { color: 'rgba(59,130,246,0.1)' }, data: [520, 535, 560, 545, 578, 578.3, 580, 592, 605, 610, 625], itemStyle: { color: '#3b82f6' } },
      { name: '产水量', type: 'line', smooth: true, stack: 'Total', areaStyle: { color: 'rgba(34,197,94,0.1)' }, data: [1640, 1680, 1650, 1700, 1720, 1644.3, 1680, 1710, 1730, 1750, 1780], itemStyle: { color: '#22c55e' } }
    ]
  })
}

const initPieChart = () => {
  if (!pieChart.value) return
  createChart(pieChart.value, {
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', left: 'left' },
    series: [{
      name: '区块产量',
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}: {c}t\n({d}%)' },
      emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' } },
      data: [
        { value: 2586, name: 'A区块', itemStyle: { color: '#3b82f6' } },
        { value: 3245, name: 'B区块', itemStyle: { color: '#22c55e' } },
        { value: 4123, name: 'C区块', itemStyle: { color: '#f59e0b' } },
        { value: 1856, name: 'D区块', itemStyle: { color: '#8b5cf6' } },
        { value: 776, name: 'E区块', itemStyle: { color: '#ef4444' } }
      ]
    }]
  })
}

onMounted(() => {
  initTrendChart()
  initPieChart()
})
</script>

<style scoped lang="scss">
.report-container {
  width: 100%;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
}

.summary-card {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 8px;
  padding: 25px;
  text-align: center;
  
  .summary-label {
    font-size: 14px;
    color: #64748b;
    margin-bottom: 10px;
  }
  
  .summary-value {
    font-size: 36px;
    font-weight: 700;
    color: #1e293b;
    line-height: 1;
  }
  
  .summary-unit {
    font-size: 14px;
    color: #64748b;
    margin-bottom: 10px;
  }
  
  .summary-trend {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    font-size: 13px;
    
    &.up {
      color: #22c55e;
    }
    
    &.down {
      color: #ef4444;
    }
  }
}

.chart-box, .table-box {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  
  h4 {
    margin: 0 0 15px 0;
    font-size: 16px;
    color: #1e293b;
  }
}

.chart-large {
  width: 100%;
  height: 280px;
}

.chart-medium {
  width: 100%;
  height: 280px;
}

.mb-20 {
  margin-bottom: 20px;
}
</style>
