<template>
  <div class="alert-rule-panel">
    <div class="panel-header">
      <h3>预警规则配置</h3>
      <el-button type="primary" size="small" @click="openCreateDialog">
        <el-icon><Plus /></el-icon>
        新增规则
      </el-button>
    </div>

    <el-table :data="rules" v-loading="loading" stripe border style="width: 100%;">
      <el-table-column prop="name" label="规则名称" min-width="160" />

      <el-table-column label="触发条件" min-width="240">
        <template #default="{ row }">
          <div class="condition-list">
            <span v-if="row.triggerCondition.levelThreshold" class="condition-item">
              等级 ≥ {{ levelLabels[row.triggerCondition.levelThreshold] }}
            </span>
            <span v-if="row.triggerCondition.daysBeforeDue !== null" class="condition-item">
              <template v-if="row.triggerCondition.daysBeforeDue === 0">
                已过期
              </template>
              <template v-else>
                截止前 ≤ {{ row.triggerCondition.daysBeforeDue }} 天
              </template>
            </span>
            <span class="condition-item condition-sub">
              状态: {{ row.triggerCondition.statusFilter.map(s => statusLabels[s]).join('、') }}
            </span>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="通知方式" width="100" align="center">
        <template #default="{ row }">
          <el-tag size="small">{{ row.notificationType === 'in-app' ? '站内通知' : row.notificationType }}</el-tag>
        </template>
      </el-table-column>

      <el-table-column label="冷却期" width="100" align="center">
        <template #default="{ row }">
          {{ formatCooldown(row.cooldownMinutes) }}
        </template>
      </el-table-column>

      <el-table-column label="启用" width="80" align="center">
        <template #default="{ row }">
          <el-switch
            :model-value="row.enabled"
            @change="handleToggle(row, $event)"
          />
        </template>
      </el-table-column>

      <el-table-column label="操作" width="160" align="center">
        <template #default="{ row }">
          <el-button text type="primary" size="small" @click="openEditDialog(row)">
            编辑
          </el-button>
          <el-button text type="danger" size="small" @click="handleDelete(row)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- Rule Edit/Create Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingRule ? '编辑规则' : '新增规则'"
      width="520px"
      :close-on-click-modal="false"
    >
      <el-form :model="ruleForm" label-width="90px">
        <el-form-item label="规则名称">
          <el-input v-model="ruleForm.name" placeholder="请输入规则名称" />
        </el-form-item>

        <el-form-item label="等级阈值">
          <el-select v-model="ruleForm.levelThreshold" placeholder="不限" clearable style="width: 100%;">
            <el-option value="critical" label="紧急" />
            <el-option value="high" label="高" />
            <el-option value="medium" label="中" />
            <el-option value="low" label="低" />
          </el-select>
        </el-form-item>

        <el-form-item label="截止天数">
          <el-input-number
            v-model="ruleForm.daysBeforeDue"
            :min="0"
            :max="30"
            :step="1"
            controls-position="right"
            placeholder="0=已过期"
            style="width: 100%;"
          />
          <div class="form-hint">0 表示已过期触发，留空表示不限制</div>
        </el-form-item>

        <el-form-item label="状态过滤">
          <el-select
            v-model="ruleForm.statusFilter"
            multiple
            collapse-tags
            placeholder="选择状态"
            style="width: 100%;"
          >
            <el-option
              v-for="item in statusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="冷却期(分钟)">
          <el-input-number
            v-model="ruleForm.cooldownMinutes"
            :min="15"
            :max="1440"
            :step="15"
            controls-position="right"
            style="width: 100%;"
          />
          <div class="form-hint">范围：15 分钟 - 24 小时（1440 分钟）</div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveRule">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { STATUS_LABELS, type AlertRule, type RiskLevel, type RiskStatus } from '@/types/risk'
import { useRisksStore } from '@/stores/risks'

const store = useRisksStore()

const rules = computed(() => store.alertRules)
const loading = computed(() => store.loading)

const dialogVisible = ref(false)
const editingRule = ref<AlertRule | null>(null)

const ruleForm = ref({
  name: '',
  levelThreshold: null as RiskLevel | null,
  daysBeforeDue: null as number | null,
  statusFilter: ['open', 'monitoring', 'mitigating'] as RiskStatus[],
  cooldownMinutes: 240,
})

const statusOptions = Object.entries(STATUS_LABELS).map(([value, label]) => ({
  value: value as RiskStatus,
  label,
}))

const levelLabels: Record<RiskLevel, string> = {
  critical: '紧急',
  high: '高',
  medium: '中',
  low: '低',
}

function formatCooldown(minutes: number): string {
  if (minutes >= 1440) return `${minutes / 1440} 天`
  if (minutes >= 60) return `${minutes / 60} 小时`
  return `${minutes} 分钟`
}

function openCreateDialog() {
  editingRule.value = null
  ruleForm.value = {
    name: '',
    levelThreshold: null,
    daysBeforeDue: null,
    statusFilter: ['open', 'monitoring', 'mitigating'],
    cooldownMinutes: 240,
  }
  dialogVisible.value = true
}

function openEditDialog(rule: AlertRule) {
  editingRule.value = rule
  ruleForm.value = {
    name: rule.name,
    levelThreshold: rule.triggerCondition.levelThreshold,
    daysBeforeDue: rule.triggerCondition.daysBeforeDue,
    statusFilter: [...rule.triggerCondition.statusFilter],
    cooldownMinutes: rule.cooldownMinutes,
  }
  dialogVisible.value = true
}

async function handleSaveRule() {
  if (!ruleForm.value.name) return

  const input = {
    name: ruleForm.value.name,
    enabled: true,
    triggerCondition: {
      levelThreshold: ruleForm.value.levelThreshold,
      daysBeforeDue: ruleForm.value.daysBeforeDue,
      statusFilter: ruleForm.value.statusFilter,
    },
    notificationType: 'in-app' as const,
    cooldownMinutes: ruleForm.value.cooldownMinutes,
  }

  if (editingRule.value) {
    await store.updateAlertRule(editingRule.value.id, input)
  } else {
    await store.createAlertRule(input)
  }

  dialogVisible.value = false
}

async function handleToggle(rule: AlertRule, enabled: boolean) {
  await store.updateAlertRule(rule.id, { enabled })
}

async function handleDelete(rule: AlertRule) {
  await store.deleteAlertRule(rule.id)
}
</script>

<style scoped>
.alert-rule-panel {
  padding: 4px 0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.panel-header h3 {
  margin: 0;
  font-size: 1rem;
  color: var(--text-primary);
}

.condition-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.condition-item {
  font-size: 0.85rem;
  color: var(--text-primary);
}

.condition-sub {
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.form-hint {
  color: var(--text-muted);
  font-size: 0.75rem;
  margin-top: 4px;
}
</style>
