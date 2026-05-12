<template>
  <el-drawer
    :model-value="visible"
    title="风险详情"
    size="480px"
    @update:model-value="$emit('update:visible', $event)"
  >
    <template v-if="risk">
      <div class="risk-detail">
        <div class="detail-header">
          <h3 class="detail-title">{{ risk.title }}</h3>
          <div class="detail-badges">
            <RiskLevelBadge :level="risk.level" />
            <el-tag size="small" :type="statusTagType(risk.status)">
              {{ statusLabels[risk.status] }}
            </el-tag>
          </div>
        </div>

        <el-descriptions :column="1" border>
          <el-descriptions-item label="风险类别">
            {{ categoryLabels[risk.category] }}
          </el-descriptions-item>
          <el-descriptions-item label="发生概率">
            {{ risk.probability }} / 5
          </el-descriptions-item>
          <el-descriptions-item label="影响程度">
            {{ risk.impact }} / 5
          </el-descriptions-item>
          <el-descriptions-item label="责任人">
            {{ risk.owner }}
          </el-descriptions-item>
          <el-descriptions-item label="创建人">
            {{ risk.createdBy }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDate(risk.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间">
            {{ formatDate(risk.updatedAt) }}
          </el-descriptions-item>
          <el-descriptions-item v-if="risk.dueDate" label="截止日期">
            <span :class="{ 'date-overdue': isOverdue(risk.dueDate, risk.status) }">
              {{ formatDate(risk.dueDate) }}
              <el-icon v-if="isOverdue(risk.dueDate, risk.status)" class="overdue-icon"><WarningFilled /></el-icon>
            </span>
          </el-descriptions-item>
        </el-descriptions>

        <div class="detail-section">
          <h4>风险描述</h4>
          <p class="detail-text">{{ risk.description }}</p>
        </div>

        <div v-if="risk.mitigationPlan" class="detail-section">
          <h4>缓解措施</h4>
          <p class="detail-text">{{ risk.mitigationPlan }}</p>
        </div>

        <div v-if="risk.resolution" class="detail-section">
          <h4>解决说明</h4>
          <p class="detail-text">{{ risk.resolution }}</p>
        </div>

        <div v-if="risk.tags.length" class="detail-section">
          <h4>标签</h4>
          <div class="tag-list">
            <el-tag v-for="tag in risk.tags" :key="tag" size="small">{{ tag }}</el-tag>
          </div>
        </div>

        <div class="detail-actions">
          <el-button type="primary" @click="$emit('edit')">编辑</el-button>
          <el-button
            v-if="risk.status !== 'closed' && risk.status !== 'accepted'"
            type="success"
            @click="$emit('close-risk')"
          >
            关闭
          </el-button>
          <el-button type="danger" plain @click="$emit('delete')">删除</el-button>
        </div>
      </div>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { WarningFilled } from '@element-plus/icons-vue'
import { CATEGORY_LABELS, STATUS_LABELS, type RiskItem, type RiskStatus } from '@/types/risk'
import RiskLevelBadge from './RiskLevelBadge.vue'

defineProps<{
  visible: boolean
  risk: RiskItem | null
}>()

defineEmits<{
  (event: 'update:visible', value: boolean): void
  (event: 'edit'): void
  (event: 'close-risk'): void
  (event: 'delete'): void
}>()

const statusLabels = STATUS_LABELS
const categoryLabels = CATEGORY_LABELS

function statusTagType(status: RiskStatus): 'success' | 'info' | 'warning' | 'danger' {
  const map: Record<RiskStatus, 'success' | 'info' | 'warning' | 'danger'> = {
    open: 'info',
    monitoring: 'warning',
    mitigating: 'warning',
    closed: 'success',
    accepted: 'info',
  }
  return map[status]
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN')
}

function isOverdue(dueDate: string, status: RiskStatus): boolean {
  if (status === 'closed' || status === 'accepted') return false
  return new Date(dueDate) < new Date()
}
</script>

<style scoped>
.risk-detail {
  padding: 0 4px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  gap: 12px;
}

.detail-title {
  margin: 0;
  font-size: 1.1rem;
  line-height: 1.4;
  color: var(--text-primary);
}

.detail-badges {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.detail-section {
  margin-top: 20px;
}

.detail-section h4 {
  margin: 0 0 8px;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.detail-text {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--text-primary);
  white-space: pre-wrap;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--border-subtle);
}

.date-overdue {
  color: var(--color-error);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.overdue-icon {
  width: 14px;
  height: 14px;
}
</style>
