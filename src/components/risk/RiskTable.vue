<template>
  <div class="risk-table">
    <el-table
      :data="data"
      v-loading="loading"
      stripe
      border
      style="width: 100%"
      row-key="id"
      @row-click="handleRowClick"
    >
      <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip>
        <template #default="{ row }">
          <span class="risk-title" @click.stop="$emit('view', row.id)">
            {{ row.title }}
          </span>
        </template>
      </el-table-column>

      <el-table-column label="类别" width="110">
        <template #default="{ row }">
          <span>{{ categoryLabels[row.category] }}</span>
        </template>
      </el-table-column>

      <el-table-column label="等级" width="90" align="center">
        <template #default="{ row }">
          <RiskLevelBadge :level="row.level" />
        </template>
      </el-table-column>

      <el-table-column label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag size="small" :type="statusTagType(row.status)">
            {{ statusLabels[row.status] }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="概率" width="70" align="center">
        <template #default="{ row }">
          {{ row.probability }}/5
        </template>
      </el-table-column>

      <el-table-column label="影响" width="70" align="center">
        <template #default="{ row }">
          {{ row.impact }}/5
        </template>
      </el-table-column>

      <el-table-column prop="owner" label="责任人" width="100" />

      <el-table-column label="截止日期" width="130">
        <template #default="{ row }">
          <span v-if="row.dueDate" :class="{ 'date-overdue': isOverdue(row) }">
            {{ formatDate(row.dueDate) }}
          </span>
          <span v-else class="text-muted">-</span>
        </template>
      </el-table-column>

      <el-table-column label="预警" width="80" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.alertStatus === 'triggered'" size="small" type="danger" effect="dark">
            预警
          </el-tag>
          <el-tag v-else-if="row.alertStatus === 'pending'" size="small" type="warning">
            待处理
          </el-tag>
          <span v-else class="text-muted">-</span>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="160" fixed="right" align="center">
        <template #default="{ row }">
          <el-button text type="primary" size="small" @click.stop="$emit('view', row.id)">
            详情
          </el-button>
          <el-button text type="primary" size="small" @click.stop="$emit('edit', row)">
            编辑
          </el-button>
          <el-button text type="danger" size="small" @click.stop="$emit('delete', row)">
            删除
          </el-button>
        </template>
      </el-table-column>

      <template #empty>
        <el-empty description="暂无风险数据" />
      </template>
    </el-table>

    <div class="risk-table__pagination">
      <el-pagination
        :current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @update:current-page="$emit('update:currentPage', $event)"
        @update:page-size="$emit('update:pageSize', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { CATEGORY_LABELS, STATUS_LABELS, type RiskItem, type RiskStatus } from '@/types/risk'
import RiskLevelBadge from './RiskLevelBadge.vue'

defineProps<{
  data: RiskItem[]
  loading: boolean
  total: number
  currentPage: number
  pageSize: number
}>()

defineEmits<{
  (event: 'update:currentPage', value: number): void
  (event: 'update:pageSize', value: number): void
  (event: 'view', id: string): void
  (event: 'edit', risk: RiskItem): void
  (event: 'delete', risk: RiskItem): void
}>()

const categoryLabels = CATEGORY_LABELS
const statusLabels = STATUS_LABELS

function statusTagType(status: RiskStatus) {
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
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

function isOverdue(row: RiskItem): boolean {
  if (!row.dueDate) return false
  if (row.status === 'closed' || row.status === 'accepted') return false
  return new Date(row.dueDate) < new Date()
}

function handleRowClick(row: RiskItem) {
  // handled by @click.stop on title cell
}
</script>

<style scoped>
.risk-table__pagination {
  display: flex;
  justify-content: flex-end;
  padding: 16px 0;
}

.risk-title {
  color: var(--text-primary);
  cursor: pointer;
  font-weight: 500;
}

.risk-title:hover {
  color: var(--color-primary);
}

.date-overdue {
  color: var(--color-error);
  font-weight: 600;
}

.text-muted {
  color: var(--text-muted);
}

:deep(.el-table__row) {
  cursor: pointer;
}
</style>
