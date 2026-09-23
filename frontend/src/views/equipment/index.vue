<template>
  <div class="equipment-container">
    <el-row :gutter="20" class="mb-20">
      <el-col :span="6">
        <div class="stat-card" @click="filterByStatus('')">
          <div class="stat-value">{{ equipmentStats.total }}</div>
          <div class="stat-label">设备总数</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card running" @click="filterByStatus('运行中')">
          <div class="stat-value">{{ equipmentStats.running }}</div>
          <div class="stat-label">运行中</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card maintenance" @click="filterByStatus('待维护')">
          <div class="stat-value">{{ equipmentStats.maintenance }}</div>
          <div class="stat-label">待维护</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card fault" @click="filterByStatus('故障')">
          <div class="stat-value">{{ equipmentStats.fault }}</div>
          <div class="stat-label">故障</div>
        </div>
      </el-col>
    </el-row>

    <el-card class="mb-20">
      <template #header>
        <div class="card-header">
          <span>设备列表</span>
          <div>
            <el-button type="primary" size="small">新增设备</el-button>
            <el-button size="small">批量导入</el-button>
          </div>
        </div>
      </template>
      
      <el-form :inline="true" :model="filterForm" class="filter-form mb-20">
        <el-form-item label="设备名称">
          <el-input v-model="filterForm.equipmentName" placeholder="请输入设备名称" clearable @input="handleFilter" />
        </el-form-item>
        <el-form-item label="设备类型">
          <el-select v-model="filterForm.equipmentType" placeholder="请选择设备类型" clearable @change="handleFilter">
            <el-option label="全部" value="" />
            <el-option label="抽油机" value="抽油机" />
            <el-option label="阀门" value="阀门" />
            <el-option label="传感器" value="传感器" />
            <el-option label="电机" value="电机" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="请选择状态" clearable @change="handleFilter">
            <el-option label="全部" value="" />
            <el-option label="运行中" value="运行中" />
            <el-option label="待维护" value="待维护" />
            <el-option label="故障" value="故障" />
            <el-option label="停机" value="停机" />
          </el-select>
        </el-form-item>
        <el-form-item label="维护日期范围">
          <el-date-picker
            v-model="filterForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            @change="handleFilter"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="filteredEquipmentList" border stripe style="width: 100%" v-loading="loading">
        <el-table-column prop="equipmentCode" label="设备编码" width="120" />
        <el-table-column prop="equipmentName" label="设备名称" width="150" />
        <el-table-column prop="equipmentType" label="设备类型" width="120" />
        <el-table-column prop="model" label="型号规格" width="150" />
        <el-table-column prop="installLocation" label="安装位置" width="150" />
        <el-table-column prop="wellName" label="所属井" width="100" />
        <el-table-column prop="runningHours" label="运行时长(h)" width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastMaintenanceDate" label="上次维护日期" width="130" />
        <el-table-column prop="nextMaintenanceDate" label="下次维护日期" width="130">
          <template #default="{ row }">
            <span :class="{ 'text-danger': isOverdue(row.nextMaintenanceDate) }">
              {{ row.nextMaintenanceDate }}
              <el-tag v-if="isOverdue(row.nextMaintenanceDate)" type="danger" size="small" class="ml-5">逾期</el-tag>
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="viewMaintenanceRecords(row)">维护记录</el-button>
            <el-button type="success" size="small" link @click="openMaintenanceDialog(row)">维护登记</el-button>
            <el-button type="danger" size="small" link>删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-row :gutter="20">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>设备类型分布</span>
          </template>
          <div ref="typeChart" class="chart-medium"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>待维护设备提醒</span>
              <el-badge :value="overdueCount" class="item" type="danger" />
            </div>
          </template>
          <el-timeline>
            <el-timeline-item 
              v-for="(item, index) in maintenanceList" 
              :key="index" 
              :timestamp="item.date" 
              :type="item.type"
              @click="handleMaintenanceClick(item)"
              class="timeline-item"
            >
              <div class="timeline-content">
                <span class="equipment-name">{{ item.equipmentName }}</span>
                <span class="content">{{ item.content }}</span>
                <el-button type="primary" size="small" link @click.stop="openMaintenanceDialog(item)">立即维护</el-button>
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog
      v-model="maintenanceDialogVisible"
      title="维护登记"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="maintenanceForm" :rules="maintenanceRules" ref="maintenanceFormRef" label-width="100px">
        <el-form-item label="设备名称" prop="equipmentName">
          <el-input v-model="maintenanceForm.equipmentName" disabled />
        </el-form-item>
        <el-form-item label="设备编码" prop="equipmentCode">
          <el-input v-model="maintenanceForm.equipmentCode" disabled />
        </el-form-item>
        <el-form-item label="维护类型" prop="maintenanceType">
          <el-select v-model="maintenanceForm.maintenanceType" placeholder="请选择维护类型">
            <el-option label="常规维护" value="常规维护" />
            <el-option label="故障维修" value="故障维修" />
            <el-option label="定期保养" value="定期保养" />
            <el-option label="紧急维修" value="紧急维修" />
          </el-select>
        </el-form-item>
        <el-form-item label="维护日期" prop="maintenanceDate">
          <el-date-picker
            v-model="maintenanceForm.maintenanceDate"
            type="date"
            placeholder="选择维护日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="维护人员" prop="maintenancePerson">
          <el-input v-model="maintenanceForm.maintenancePerson" placeholder="请输入维护人员" />
        </el-form-item>
        <el-form-item label="维护内容" prop="maintenanceContent">
          <el-input
            v-model="maintenanceForm.maintenanceContent"
            type="textarea"
            :rows="4"
            placeholder="请详细描述维护内容"
          />
        </el-form-item>
        <el-form-item label="维护结果" prop="maintenanceResult">
          <el-radio-group v-model="maintenanceForm.maintenanceResult">
            <el-radio label="完成">完成</el-radio>
            <el-radio label="进行中">进行中</el-radio>
            <el-radio label="待跟进">待跟进</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="维护费用" prop="cost">
          <el-input-number v-model="maintenanceForm.cost" :min="0" :precision="2" placeholder="元" />
        </el-form-item>
        <el-form-item label="下次维护日期" prop="nextMaintenanceDate">
          <el-date-picker
            v-model="maintenanceForm.nextMaintenanceDate"
            type="date"
            placeholder="选择下次维护日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="maintenanceForm.remark"
            type="textarea"
            :rows="2"
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="maintenanceDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitMaintenance" :loading="submitLoading">提交</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="recordDialogVisible"
      title="维护记录"
      width="800px"
    >
      <div class="record-info">
        <span class="label">设备名称：</span>
        <span class="value">{{ currentEquipment?.equipmentName }}</span>
        <span class="label ml-20">设备编码：</span>
        <span class="value">{{ currentEquipment?.equipmentCode }}</span>
      </div>
      <el-table :data="maintenanceRecords" border stripe style="width: 100%; margin-top: 15px;">
        <el-table-column prop="maintenanceDate" label="维护日期" width="120" />
        <el-table-column prop="maintenanceType" label="维护类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getMaintenanceTypeColor(row.maintenanceType)" size="small">{{ row.maintenanceType }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="maintenancePerson" label="维护人员" width="100" />
        <el-table-column prop="maintenanceContent" label="维护内容" min-width="200" show-overflow-tooltip />
        <el-table-column prop="maintenanceResult" label="维护结果" width="100">
          <template #default="{ row }">
            <el-tag :type="getResultColor(row.maintenanceResult)" size="small">{{ row.maintenanceResult }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="cost" label="费用(元)" width="100">
          <template #default="{ row }">
            {{ row.cost || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
      </el-table>
      <template #footer>
        <el-button @click="recordDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { createChart } from '@/composables/useChartManager'
import type { MaintenanceRecord } from '@/api/equipment'

const typeChart = ref<HTMLElement>()
const loading = ref(false)
const submitLoading = ref(false)
const maintenanceDialogVisible = ref(false)
const recordDialogVisible = ref(false)
const maintenanceFormRef = ref<FormInstance>()

const currentEquipment = ref<any>(null)

const filterForm = reactive({
  equipmentName: '',
  equipmentType: '',
  status: '',
  dateRange: [] as string[]
})

const maintenanceForm = reactive({
  equipmentId: null as number | null,
  equipmentName: '',
  equipmentCode: '',
  maintenanceType: '',
  maintenanceDate: '',
  maintenancePerson: '',
  maintenanceContent: '',
  maintenanceResult: '',
  cost: 0,
  nextMaintenanceDate: '',
  remark: ''
})

const maintenanceRules: FormRules = {
  maintenanceType: [{ required: true, message: '请选择维护类型', trigger: 'change' }],
  maintenanceDate: [{ required: true, message: '请选择维护日期', trigger: 'change' }],
  maintenancePerson: [{ required: true, message: '请输入维护人员', trigger: 'blur' }],
  maintenanceContent: [{ required: true, message: '请输入维护内容', trigger: 'blur' }],
  maintenanceResult: [{ required: true, message: '请选择维护结果', trigger: 'change' }]
}

const equipmentStats = ref({
  total: 156,
  running: 128,
  maintenance: 18,
  fault: 10
})

const equipmentList = ref([
  { id: 1, equipmentCode: 'PUMP-001', equipmentName: '抽油机A1', equipmentType: '抽油机', model: 'CYJ12-4.8-73HB', installLocation: 'A井场1号', wellName: 'A-01井', runningHours: 8520, status: '运行中', lastMaintenanceDate: '2024-01-10', nextMaintenanceDate: '2024-02-10' },
  { id: 2, equipmentCode: 'PUMP-002', equipmentName: '抽油机B3', equipmentType: '抽油机', model: 'CYJ10-3-53HB', installLocation: 'B井场3号', wellName: 'B-03井', runningHours: 6350, status: '运行中', lastMaintenanceDate: '2024-01-05', nextMaintenanceDate: '2024-02-05' },
  { id: 3, equipmentCode: 'VALVE-001', equipmentName: '阀门组C2', equipmentType: '阀门', model: 'Z41H-16C DN100', installLocation: 'C井场2号', wellName: 'C-02井', runningHours: 12500, status: '待维护', lastMaintenanceDate: '2023-12-20', nextMaintenanceDate: '2024-01-20' },
  { id: 4, equipmentCode: 'SENSOR-001', equipmentName: '压力传感器D5', equipmentType: '传感器', model: 'PT-300', installLocation: 'D井场5号', wellName: 'D-05井', runningHours: 3200, status: '故障', lastMaintenanceDate: '2023-11-15', nextMaintenanceDate: '2023-12-15' },
  { id: 5, equipmentCode: 'MOTOR-001', equipmentName: '电机E1', equipmentType: '电机', model: 'Y2-315M-4', installLocation: 'E井场1号', wellName: 'E-01井', runningHours: 9800, status: '运行中', lastMaintenanceDate: '2024-01-08', nextMaintenanceDate: '2024-02-08' },
  { id: 6, equipmentCode: 'PUMP-003', equipmentName: '抽油机C1', equipmentType: '抽油机', model: 'CYJ12-4.8-73HB', installLocation: 'C井场1号', wellName: 'C-01井', runningHours: 7200, status: '待维护', lastMaintenanceDate: '2023-11-25', nextMaintenanceDate: '2023-12-25' },
  { id: 7, equipmentCode: 'VALVE-002', equipmentName: '阀门组A3', equipmentType: '阀门', model: 'Z41H-16C DN80', installLocation: 'A井场3号', wellName: 'A-03井', runningHours: 9500, status: '运行中', lastMaintenanceDate: '2024-01-12', nextMaintenanceDate: '2024-02-12' }
])

const maintenanceList = ref([
  { id: 3, date: '2024-01-20', equipmentName: '阀门组C2', equipmentCode: 'VALVE-001', content: '到期需要进行常规维护', type: 'warning' },
  { id: 4, date: '2024-01-25', equipmentName: '压力传感器D5', equipmentCode: 'SENSOR-001', content: '故障待维修', type: 'danger' },
  { id: 6, date: '2023-12-25', equipmentName: '抽油机C1', equipmentCode: 'PUMP-003', content: '已逾期，请尽快安排维护', type: 'danger' },
  { id: 2, date: '2024-02-05', equipmentName: '抽油机B3', equipmentCode: 'PUMP-002', content: '即将到期维护', type: 'primary' },
  { id: 5, date: '2024-02-08', equipmentName: '电机E1', equipmentCode: 'MOTOR-001', content: '即将到期维护', type: 'primary' },
  { id: 1, date: '2024-02-10', equipmentName: '抽油机A1', equipmentCode: 'PUMP-001', content: '即将到期维护', type: 'primary' }
])

const maintenanceRecords = ref<MaintenanceRecord[]>([
  { id: 1, equipmentId: 1, equipmentName: '抽油机A1', equipmentCode: 'PUMP-001', maintenanceType: '常规维护', maintenanceDate: '2024-01-10', maintenancePerson: '张三', maintenanceContent: '检查润滑油、紧固螺丝、清洁设备表面', maintenanceResult: '完成', cost: 500, remark: '运行正常' },
  { id: 2, equipmentId: 1, equipmentName: '抽油机A1', equipmentCode: 'PUMP-001', maintenanceType: '定期保养', maintenanceDate: '2023-10-15', maintenancePerson: '李四', maintenanceContent: '更换油封、检查皮带张力', maintenanceResult: '完成', cost: 1200, remark: '皮带磨损正常' },
  { id: 3, equipmentId: 3, equipmentName: '阀门组C2', equipmentCode: 'VALVE-001', maintenanceType: '常规维护', maintenanceDate: '2023-12-20', maintenancePerson: '王五', maintenanceContent: '阀门开关测试、密封检查', maintenanceResult: '完成', cost: 200, remark: '一切正常' }
])

const overdueCount = computed(() => {
  return maintenanceList.value.filter(item => item.type === 'danger').length
})

const filteredEquipmentList = computed(() => {
  let result = [...equipmentList.value]
  
  if (filterForm.equipmentName) {
    result = result.filter(item => 
      item.equipmentName.includes(filterForm.equipmentName)
    )
  }
  
  if (filterForm.equipmentType) {
    result = result.filter(item => 
      item.equipmentType === filterForm.equipmentType
    )
  }
  
  if (filterForm.status) {
    result = result.filter(item => 
      item.status === filterForm.status
    )
  }
  
  if (filterForm.dateRange && filterForm.dateRange.length === 2) {
    const [start, end] = filterForm.dateRange
    result = result.filter(item => {
      const nextDate = new Date(item.nextMaintenanceDate)
      return nextDate >= new Date(start) && nextDate <= new Date(end)
    })
  }
  
  return result
})

const getStatusType = (status: string) => {
  const map: Record<string, any> = {
    '运行中': 'success',
    '待维护': 'warning',
    '故障': 'danger',
    '停机': 'info'
  }
  return map[status] || 'info'
}

const getMaintenanceTypeColor = (type: string) => {
  const map: Record<string, any> = {
    '常规维护': 'info',
    '故障维修': 'danger',
    '定期保养': 'success',
    '紧急维修': 'warning'
  }
  return map[type] || 'info'
}

const getResultColor = (result: string) => {
  const map: Record<string, any> = {
    '完成': 'success',
    '进行中': 'warning',
    '待跟进': 'danger'
  }
  return map[result] || 'info'
}

const isOverdue = (date: string) => {
  return new Date(date) < new Date()
}

const handleFilter = () => {
  console.log('Filter applied:', filterForm)
}

const resetFilter = () => {
  filterForm.equipmentName = ''
  filterForm.equipmentType = ''
  filterForm.status = ''
  filterForm.dateRange = []
}

const filterByStatus = (status: string) => {
  filterForm.status = status
  handleFilter()
}

const openMaintenanceDialog = (row: any) => {
  const today = new Date().toISOString().split('T')[0]
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  
  maintenanceForm.equipmentId = row.id
  maintenanceForm.equipmentName = row.equipmentName
  maintenanceForm.equipmentCode = row.equipmentCode || row.equipmentCode
  maintenanceForm.maintenanceType = ''
  maintenanceForm.maintenanceDate = today
  maintenanceForm.maintenancePerson = ''
  maintenanceForm.maintenanceContent = ''
  maintenanceForm.maintenanceResult = ''
  maintenanceForm.cost = 0
  maintenanceForm.nextMaintenanceDate = nextMonth
  maintenanceForm.remark = ''
  
  maintenanceDialogVisible.value = true
}

const submitMaintenance = async () => {
  if (!maintenanceFormRef.value) return
  
  await maintenanceFormRef.value.validate((valid) => {
    if (valid) {
      submitLoading.value = true
      
      setTimeout(() => {
        const newRecord: MaintenanceRecord = {
          id: Date.now(),
          equipmentId: maintenanceForm.equipmentId!,
          equipmentName: maintenanceForm.equipmentName,
          equipmentCode: maintenanceForm.equipmentCode,
          maintenanceType: maintenanceForm.maintenanceType,
          maintenanceDate: maintenanceForm.maintenanceDate,
          maintenancePerson: maintenanceForm.maintenancePerson,
          maintenanceContent: maintenanceForm.maintenanceContent,
          maintenanceResult: maintenanceForm.maintenanceResult,
          cost: maintenanceForm.cost,
          remark: maintenanceForm.remark,
          createdAt: new Date().toISOString()
        }
        
        maintenanceRecords.value.unshift(newRecord)
        
        const equipment = equipmentList.value.find(e => e.id === maintenanceForm.equipmentId)
        if (equipment) {
          equipment.lastMaintenanceDate = maintenanceForm.maintenanceDate
          equipment.nextMaintenanceDate = maintenanceForm.nextMaintenanceDate
          if (maintenanceForm.maintenanceResult === '完成') {
            equipment.status = '运行中'
          }
        }
        
        const reminderIndex = maintenanceList.value.findIndex(m => m.id === maintenanceForm.equipmentId)
        if (reminderIndex > -1) {
          maintenanceList.value.splice(reminderIndex, 1)
        }
        
        if (equipment) {
          equipmentStats.value.maintenance--
          equipmentStats.value.running++
        }
        
        ElMessage.success('维护登记成功！')
        maintenanceDialogVisible.value = false
        submitLoading.value = false
      }, 500)
    }
  })
}

const viewMaintenanceRecords = (row: any) => {
  currentEquipment.value = row
  recordDialogVisible.value = true
}

const handleMaintenanceClick = (item: any) => {
  console.log('Clicked reminder:', item)
}

const initChart = () => {
  if (!typeChart.value) return
  createChart(typeChart.value, {
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', right: 10, top: 'center' },
    series: [{
      name: '设备类型',
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['40%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' } },
      labelLine: { show: false },
      data: [
        { value: 68, name: '抽油机', itemStyle: { color: '#3b82f6' } },
        { value: 42, name: '阀门', itemStyle: { color: '#22c55e' } },
        { value: 25, name: '传感器', itemStyle: { color: '#f59e0b' } },
        { value: 12, name: '电机', itemStyle: { color: '#ef4444' } },
        { value: 9, name: '其他', itemStyle: { color: '#8b5cf6' } }
      ]
    }]
  })
}

onMounted(() => {
  initChart()
})
</script>

<style scoped lang="scss">
.equipment-container {
  width: 100%;
}

.stat-card {
  padding: 25px;
  border-radius: 8px;
  background: #fff;
  text-align: center;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.3s;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.12);
  }
  
  &.running {
    .stat-value {
      color: #22c55e;
    }
  }
  
  &.maintenance {
    .stat-value {
      color: #f59e0b;
    }
  }
  
  &.fault {
    .stat-value {
      color: #ef4444;
    }
  }
  
  .stat-value {
    font-size: 36px;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 8px;
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

.filter-form {
  padding: 10px 0;
  background: #f8fafc;
  border-radius: 8px;
  margin-bottom: 0;
  
  :deep(.el-form-item) {
    margin-bottom: 0;
  }
}

.chart-medium {
  width: 100%;
  height: 300px;
}

.text-danger {
  color: #ef4444;
}

.ml-5 {
  margin-left: 5px;
}

.ml-10 {
  margin-left: 10px;
}

.ml-20 {
  margin-left: 20px;
}

.mb-20 {
  margin-bottom: 20px;
}

.timeline-item {
  cursor: pointer;
  
  &:hover {
    .timeline-content {
      background: #f8fafc;
    }
  }
}

.timeline-content {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  padding: 5px 0;
  border-radius: 4px;
  transition: background 0.3s;
  
  .equipment-name {
    font-weight: 600;
    margin-right: 10px;
  }
  
  .content {
    color: #64748b;
    margin-right: 10px;
  }
}

.record-info {
  padding: 10px;
  background: #f8fafc;
  border-radius: 8px;
  
  .label {
    color: #64748b;
  }
  
  .value {
    font-weight: 600;
    color: #1e293b;
  }
}

.item {
  margin-left: 10px;
}
</style>
