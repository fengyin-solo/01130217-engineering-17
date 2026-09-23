<template>
  <div class="production-container">
    <el-row :gutter="20" class="mb-20">
      <el-col :span="6">
        <el-select v-model="selectedWell" placeholder="选择井" style="width: 100%">
          <el-option v-for="well in wellList" :key="well.id" :label="well.wellName" :value="well.id" />
        </el-select>
      </el-col>
      <el-col :span="6">
        <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" style="width: 100%" />
      </el-col>
      <el-col :span="12" class="text-right">
        <el-button type="primary">数据采集</el-button>
        <el-button>导入数据</el-button>
        <el-button>导出报表</el-button>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="mb-20">
      <el-col :span="4">
        <div class="stat-card primary">
          <div class="stat-icon"><el-icon><Odometer /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ dailyData.oilProduction }}</div>
            <div class="stat-label">日产油量(t)</div>
          </div>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card success">
          <div class="stat-icon"><el-icon><WaterCold /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ dailyData.waterProduction }}</div>
            <div class="stat-label">日产水量(t)</div>
          </div>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card warning">
          <div class="stat-icon"><el-icon><TrendCharts /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ dailyData.waterCut }}%</div>
            <div class="stat-label">含水率</div>
          </div>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card info">
          <div class="stat-icon"><el-icon><Clock /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ dailyData.productionHours }}h</div>
            <div class="stat-label">生产时数</div>
          </div>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card danger">
          <div class="stat-icon"><el-icon><Gauge /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ dailyData.tubingPressure }}MPa</div>
            <div class="stat-label">油压</div>
          </div>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card purple">
          <div class="stat-icon"><el-icon><CircleClose /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ dailyData.casingPressure }}MPa</div>
            <div class="stat-label">套压</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="mb-20">
      <el-col :span="16">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>产量趋势</span>
              <el-radio-group v-model="chartType" size="small">
                <el-radio-button label="oil">产油量</el-radio-button>
                <el-radio-button label="water">产水量</el-radio-button>
                <el-radio-button label="waterCut">含水率</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="trendChart" class="chart-large"></div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header>
            <span>累计产量</span>
          </template>
          <div class="cumulative-stats">
            <div class="cumulative-item">
              <div class="cumulative-label">累计产油(万t)</div>
              <div class="cumulative-value">125.68</div>
            </div>
            <div class="cumulative-item">
              <div class="cumulative-label">累计产水(万t)</div>
              <div class="cumulative-value">356.23</div>
            </div>
            <div class="cumulative-item">
              <div class="cumulative-label">累计产气(万m³)</div>
              <div class="cumulative-value">89.56</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card>
      <template #header>
        <div class="card-header">
          <span>生产数据列表</span>
        </div>
      </template>
      <el-table :data="productionList" border stripe style="width: 100%">
        <el-table-column prop="reportDate" label="日期" width="120" />
        <el-table-column prop="wellName" label="井名" width="100" />
        <el-table-column prop="productionHours" label="生产时数(h)" width="120" />
        <el-table-column prop="oilProduction" label="产油量(t)" width="120" />
        <el-table-column prop="waterProduction" label="产水量(t)" width="120" />
        <el-table-column prop="gasProduction" label="产气量(m³)" width="120" />
        <el-table-column prop="waterCut" label="含水率(%)" width="120">
          <template #default="{ row }">
            <el-progress :percentage="row.waterCut" :stroke-width="12" :show-text="false" />
          </template>
        </el-table-column>
        <el-table-column prop="tubingPressure" label="油压(MPa)" width="120" />
        <el-table-column prop="casingPressure" label="套压(MPa)" width="120" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default>
            <el-button type="primary" size="small" link>编辑</el-button>
            <el-button type="danger" size="small" link>删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { createChart } from '@/composables/useChartManager'

const selectedWell = ref(1)
const dateRange = ref('')
const chartType = ref('oil')
const trendChart = ref<HTMLElement>()

const wellList = ref([
  { id: 1, wellName: 'A-01井' },
  { id: 2, wellName: 'B-03井' },
  { id: 3, wellName: 'C-02井' },
  { id: 4, wellName: 'D-05井' }
])

const dailyData = ref({
  oilProduction: 125.6,
  waterProduction: 356.2,
  waterCut: 73.9,
  productionHours: 24,
  tubingPressure: 8.5,
  casingPressure: 12.3
})

const productionList = ref([
  { reportDate: '2024-01-15', wellName: 'A-01井', productionHours: 24, oilProduction: 125.6, waterProduction: 356.2, gasProduction: 8500, waterCut: 73.9, tubingPressure: 8.5, casingPressure: 12.3 },
  { reportDate: '2024-01-14', wellName: 'A-01井', productionHours: 24, oilProduction: 128.3, waterProduction: 348.5, gasProduction: 8650, waterCut: 73.1, tubingPressure: 8.6, casingPressure: 12.2 },
  { reportDate: '2024-01-13', wellName: 'A-01井', productionHours: 22, oilProduction: 115.2, waterProduction: 332.1, gasProduction: 8200, waterCut: 74.2, tubingPressure: 8.4, casingPressure: 12.5 },
  { reportDate: '2024-01-12', wellName: 'A-01井', productionHours: 24, oilProduction: 130.5, waterProduction: 362.8, gasProduction: 8800, waterCut: 73.5, tubingPressure: 8.7, casingPressure: 12.1 },
  { reportDate: '2024-01-11', wellName: 'A-01井', productionHours: 24, oilProduction: 126.8, waterProduction: 358.4, gasProduction: 8550, waterCut: 73.8, tubingPressure: 8.5, casingPressure: 12.3 }
])

const initChart = () => {
  if (!trendChart.value) return
  const dates = ['1-10', '1-11', '1-12', '1-13', '1-14', '1-15', '1-16', '1-17', '1-18', '1-19', '1-20']
  createChart(trendChart.value, {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: dates },
    yAxis: { type: 'value' },
    series: [{
      name: '产油量',
      type: 'line',
      smooth: true,
      areaStyle: { color: 'rgba(59, 130, 246, 0.1)' },
      data: [120, 125, 128, 115, 130, 126, 125, 123, 128, 132, 135],
      itemStyle: { color: '#3b82f6' }
    }]
  })
}

onMounted(() => {
  initChart()
})
</script>

<style scoped lang="scss">
.production-container {
  width: 100%;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px;
  border-radius: 8px;
  color: #fff;
  
  &.primary { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
  &.success { background: linear-gradient(135deg, #22c55e, #16a34a); }
  &.warning { background: linear-gradient(135deg, #f59e0b, #d97706); }
  &.info { background: linear-gradient(135deg, #06b6d4, #0891b2); }
  &.danger { background: linear-gradient(135deg, #ef4444, #dc2626); }
  &.purple { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }
  
  .stat-icon {
    font-size: 36px;
    opacity: 0.9;
  }
  
  .stat-value {
    font-size: 28px;
    font-weight: 600;
    line-height: 1;
    margin-bottom: 5px;
  }
  
  .stat-label {
    font-size: 14px;
    opacity: 0.9;
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
  height: 300px;
}

.cumulative-stats {
  padding: 10px 0;
}

.cumulative-item {
  padding: 20px 0;
  border-bottom: 1px solid #f1f5f9;
  
  &:last-child {
    border-bottom: none;
  }
  
  .cumulative-label {
    font-size: 14px;
    color: #64748b;
    margin-bottom: 8px;
  }
  
  .cumulative-value {
    font-size: 32px;
    font-weight: 600;
    color: #1e293b;
  }
}

.text-right {
  text-align: right;
}
</style>
