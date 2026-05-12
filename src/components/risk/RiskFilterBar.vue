<template>
  <div class="risk-filter-bar">
    <div class="filter-row">
      <el-input
        :model-value="keyword"
        placeholder="搜索风险标题或描述..."
        clearable
        prefix-icon="Search"
        class="filter-search"
        @update:model-value="$emit('update:keyword', $event)"
        @clear="$emit('update:keyword', '')"
      />

      <el-select
        :model-value="level"
        placeholder="风险等级"
        multiple
        collapse-tags
        collapse-tags-tooltip
        clearable
        class="filter-select"
        @update:model-value="$emit('update:level', $event)"
      >
        <el-option
          v-for="item in levelOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        >
          <div style="display: flex; align-items: center; gap: 6px;">
            <RiskLevelBadge :level="item.value" />
          </div>
        </el-option>
      </el-select>

      <el-select
        :model-value="status"
        placeholder="风险状态"
        multiple
        collapse-tags
        collapse-tags-tooltip
        clearable
        class="filter-select"
        @update:model-value="$emit('update:status', $event)"
      >
        <el-option
          v-for="item in statusOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>

      <el-select
        :model-value="category"
        placeholder="风险类别"
        multiple
        collapse-tags
        collapse-tags-tooltip
        clearable
        class="filter-select"
        @update:model-value="$emit('update:category', $event)"
      >
        <el-option
          v-for="item in categoryOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>

      <el-select
        :model-value="owner"
        placeholder="责任人"
        clearable
        class="filter-select filter-owner"
        @update:model-value="$emit('update:owner', $event)"
      >
        <el-option
          v-for="o in owners"
          :key="o"
          :label="o"
          :value="o"
        />
      </el-select>

      <el-button text type="primary" @click="$emit('reset')">
        <el-icon><Refresh /></el-icon>
        重置
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Refresh } from '@element-plus/icons-vue'
import { CATEGORY_LABELS, STATUS_LABELS, type RiskLevel, type RiskStatus, type RiskCategory } from '@/types/risk'
import RiskLevelBadge from './RiskLevelBadge.vue'

defineProps<{
  keyword: string
  level: RiskLevel[]
  status: RiskStatus[]
  category: RiskCategory[]
  owner: string
  owners: string[]
}>()

defineEmits<{
  (event: 'update:keyword', value: string): void
  (event: 'update:level', value: RiskLevel[]): void
  (event: 'update:status', value: RiskStatus[]): void
  (event: 'update:category', value: RiskCategory[]): void
  (event: 'update:owner', value: string): void
  (event: 'reset'): void
}>()

const levelOptions: Array<{ value: RiskLevel; label: string }> = [
  { value: 'critical', label: '紧急' },
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
]

const statusOptions = Object.entries(STATUS_LABELS).map(([value, label]) => ({
  value: value as RiskStatus,
  label,
}))

const categoryOptions = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  value: value as RiskCategory,
  label,
}))
</script>

<style scoped>
.risk-filter-bar {
  padding: 16px 0;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.filter-search {
  width: 280px;
}

.filter-select {
  width: 160px;
}

.filter-owner {
  width: 140px;
}
</style>
