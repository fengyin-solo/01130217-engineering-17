<template>
  <div class="hse-container">
    <el-row :gutter="20" class="mb-20">
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon"><el-icon><Warning /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.riskCount }}</div>
            <div class="stat-label">风险总数</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card high">
          <div class="stat-icon"><el-icon><CircleClose /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.highRisk }}</div>
            <div class="stat-label">高风险</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card medium">
          <div class="stat-icon"><el-icon><WarningFilled /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.mediumRisk }}</div>
            <div class="stat-label">中风险</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card low">
          <div class="stat-icon"><el-icon><InfoFilled /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.lowRisk }}</div>
            <div class="stat-label">低风险</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="mb-20">
      <el-col :span="14">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>环保监测数据</span>
              <el-button type="primary" size="small">实时刷新</el-button>
            </div>
          </template>
          <div ref="monitorChart" class="chart-large"></div>
        </el-card>
      </el-col>
      <el-col :span="10">
        <el-card>
          <template #header>
            <span>风险等级分布</span>
          </template>
          <div ref="riskChart" class="chart-medium"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>安全隐患排查</span>
              <el-button type="primary" size="small">新增隐患</el-button>
            </div>
          </template>
          <el-table :data="hazardList" size="small">
            <el-table-column prop="hazardCode" label="隐患编号" width="100" />
            <el-table-column prop="hazardDesc" label="隐患描述" width="200" />
            <el-table-column prop="location" label="位置" width="100" />
            <el-table-column prop="level" label="等级" width="80">
              <template #default="{ row }">
                <el-tag :type="getLevelType(row.level)" size="small">{{ row.level }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.status === '已整改' ? 'success' : 'warning'" size="small">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="foundDate" label="发现日期" width="100" />
            <el-table-column label="操作" width="100">
              <template #default>
                <el-button type="primary" size="small" link>处理</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>应急预案</span>
          </template>
          <el-collapse accordion>
            <el-collapse-item title="火灾应急预案" name="1">
              <div class="plan-content">
                <p>1. 立即启动火灾报警装置</p>
                <p>2. 组织人员疏散到安全区域</p>
                <p>3. 使用灭火器进行初期灭火</p>
                <p>4. 拨打消防电话请求支援</p>
              </div>
            </el-collapse-item>
            <el-collapse-item title="溢油应急预案" name="2">
              <div class="plan-content">
                <p>1. 立即停止相关作业</p>
                <p>2. 围堵泄漏源防止扩散</p>
                <p>3. 使用吸油材料进行清理</p>
                <p>4. 向上级汇报情况</p>
              </div>
            </el-collapse-item>
            <el-collapse-item title="硫化氢泄漏应急预案" name="3">
              <div class="plan-content">
                <p>1. 立即佩戴防毒面具</p>
                <p>2. 撤离到上风方向安全区域</p>
                <p>3. 监测硫化氢浓度变化</p>
                <p>4. 启动应急响应机制</p>
              </div>
            </el-collapse-item>
            <el-collapse-item title="人员受伤应急预案" name="4">
              <div class="plan-content">
                <p>1. 确保现场安全后再救援</p>
                <p>2. 进行初步医疗处置</p>
                <p>3. 拨打急救电话送医治疗</p>
                <p>4. 保护事故现场等待调查</p>
              </div>
            </el-collapse-item>
          </el-collapse>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { createChart } from '@/composables/useChartManager'

const monitorChart = ref<HTMLElement>()
const riskChart = ref<HTMLElement>()

const stats = ref({
  riskCount: 28,
  highRisk: 3,
  mediumRisk: 12,
  lowRisk: 13
})

const hazardList = ref([
  { hazardCode: 'HZ-2024001', hazardDesc: '井场消防器材过期', location: 'A井场', level: '高', status: '待整改', foundDate: '2024-01-10' },
  { hazardCode: 'HZ-2024002', hazardDesc: '安全护栏损坏', location: 'B井场', level: '中', status: '待整改', foundDate: '2024-01-12' },
  { hazardCode: 'HZ-2024003', hazardDesc: '电气线路老化', location: 'C井场', level: '高', status: '已整改', foundDate: '2024-01-08' },
  { hazardCode: 'HZ-2024004', hazardDesc: '应急照明故障', location: 'D井场', level: '低', status: '待整改', foundDate: '2024-01-15' },
  { hazardCode: 'HZ-2024005', hazardDesc: '防护用品不足', location: 'E井场', level: '中', status: '已整改', foundDate: '2024-01-05' }
])

const getLevelType = (level: string) => {
  const map: Record<string, any> = {
    '高': 'danger',
    '中': 'warning',
    '低': 'info'
  }
  return map[level] || 'info'
}

const initMonitorChart = () => {
  if (!monitorChart.value) return
  const times = Array.from({ length: 12 }, (_, i) => `${i * 2}:00`)
  createChart(monitorChart.value, {
    tooltip: { trigger: 'axis' },
    legend: { data: ['COD', '氨氮', '石油类', '硫化物'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: times },
    yAxis: { type: 'value' },
    series: [
      { name: 'COD', type: 'line', smooth: true, data: [45, 48, 52, 49, 55, 58, 52, 50, 48, 52, 55, 50], itemStyle: { color: '#3b82f6' } },
      { name: '氨氮', type: 'line', smooth: true, data: [2.1, 2.3, 2.5, 2.2, 2.8, 3.0, 2.6, 2.4, 2.3, 2.5, 2.7, 2.4], itemStyle: { color: '#22c55e' } },
      { name: '石油类', type: 'line', smooth: true, data: [0.8, 0.9, 1.2, 1.0, 1.5, 1.8, 1.4, 1.2, 1.0, 1.3, 1.6, 1.2], itemStyle: { color: '#f59e0b' } },
      { name: '硫化物', type: 'line', smooth: true, data: [0.3, 0.35, 0.4, 0.38, 0.45, 0.5, 0.42, 0.38, 0.35, 0.4, 0.45, 0.4], itemStyle: { color: '#ef4444' } }
    ]
  })
}

const initRiskChart = () => {
  if (!riskChart.value) return
  createChart(riskChart.value, {
    tooltip: { trigger: 'item' },
    series: [{
      name: '风险分布',
      type: 'pie',
      radius: ['40%', '70%'],
      data: [
        { value: 3, name: '高风险', itemStyle: { color: '#ef4444' } },
        { value: 12, name: '中风险', itemStyle: { color: '#f59e0b' } },
        { value: 13, name: '低风险', itemStyle: { color: '#3b82f6' } }
      ],
      label: { formatter: '{b}: {c} ({d}%)' }
    }]
  })
}

onMounted(() => {
  initMonitorChart()
  initRiskChart()
})
</script>

<style scoped lang="scss">
.hse-container {
  width: 100%;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.08);
  
  &.high {
    .stat-value {
      color: #ef4444;
    }
    .stat-icon {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }
  }
  
  &.medium {
    .stat-value {
      color: #f59e0b;
    }
    .stat-icon {
      background: rgba(245, 158, 11, 0.1);
      color: #f59e0b;
    }
  }
  
  &.low {
    .stat-value {
      color: #3b82f6;
    }
    .stat-icon {
      background: rgba(59, 130, 246, 0.1);
      color: #3b82f6;
    }
  }
  
  .stat-icon {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    background: rgba(100, 116, 139, 0.1);
    color: #64748b;
  }
  
  .stat-value {
    font-size: 32px;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 5px;
  }
  
  .stat-label {
    font-size: 14px;
    color: #64748b;
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

.chart-medium {
  width: 100%;
  height: 300px;
}

.plan-content {
  p {
    margin: 8px 0;
    color: #475569;
    line-height: 1.6;
  }
}
</style>
