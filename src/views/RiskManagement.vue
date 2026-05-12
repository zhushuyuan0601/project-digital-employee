<template>
  <div class="risk-management">
    <div class="page-header">
      <div class="page-header__left">
        <h2 class="page-title">项目风险管理</h2>
        <span class="page-subtitle">风险登记、评估、预警与统计分析</span>
      </div>
      <div class="page-header__right">
        <AlertBadge :count="store.unacknowledgedAlertCount" @click="showAlertDrawer = true" />
        <el-button type="primary" @click="openCreateDialog">
          <el-icon><Plus /></el-icon>
          新增风险
        </el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="risk-tabs">
      <!-- Tab 1: Risk List -->
      <el-tab-pane label="风险列表" name="list">
        <RiskFilterBar
          :keyword="store.filterKeyword"
          :level="store.filterLevel"
          :status="store.filterStatus"
          :category="store.filterCategory"
          :owner="store.filterOwner"
          :owners="store.uniqueOwners"
          @update:keyword="store.filterKeyword = $event"
          @update:level="store.filterLevel = $event"
          @update:status="store.filterStatus = $event"
          @update:category="store.filterCategory = $event"
          @update:owner="store.filterOwner = $event"
          @reset="store.resetFilters()"
        />

        <RiskTable
          :data="store.risks"
          :loading="store.loading"
          :total="store.total"
          :current-page="store.currentPage"
          :page-size="store.pageSize"
          @update:current-page="handlePageChange"
          @update:page-size="handlePageSizeChange"
          @view="handleViewRisk"
          @edit="handleEditRisk"
          @delete="handleDeleteRisk"
        />
      </el-tab-pane>

      <!-- Tab 2: Stats Dashboard -->
      <el-tab-pane label="统计看板" name="stats">
        <div style="padding: 8px 0;">
          <RiskStatsDashboard :stats="store.stats" />
        </div>
      </el-tab-pane>

      <!-- Tab 3: Alert Rules -->
      <el-tab-pane label="预警规则" name="rules">
        <AlertRulePanel />
      </el-tab-pane>
    </el-tabs>

    <!-- Risk Form Dialog -->
    <RiskFormDialog
      v-model:visible="formVisible"
      :risk="editingRisk"
      :submitting="store.loading"
      @submit="handleFormSubmit"
    />

    <!-- Risk Detail Drawer -->
    <RiskDetailDrawer
      v-model:visible="detailVisible"
      :risk="viewingRisk"
      @edit="openEditDialog(editingRisk)"
      @close-risk="handleCloseRisk"
      @delete="handleDeleteRiskFromDetail"
    />

    <!-- Alert Notifications Drawer -->
    <el-drawer
      v-model="showAlertDrawer"
      title="预警通知"
      size="400px"
    >
      <div v-if="store.alertNotifications.length === 0" class="alert-empty">
        <el-empty description="暂无预警通知" />
      </div>
      <div v-else class="alert-list">
        <div
          v-for="alert in store.alertNotifications"
          :key="alert.id"
          class="alert-item"
          :class="{ 'alert-item--acknowledged': alert.acknowledged || store.acknowledgedAlertIds.has(alert.id) }"
        >
          <div class="alert-item__content">
            <div class="alert-item__message">{{ alert.message }}</div>
            <div class="alert-item__meta">
              <span>{{ alert.ruleName }}</span>
              <span>{{ formatDate(alert.triggeredAt) }}</span>
            </div>
          </div>
          <el-button
            v-if="!alert.acknowledged"
            text
            type="primary"
            size="small"
            @click="store.acknowledgeAlert(alert.id)"
          >
            确认
          </el-button>
        </div>
      </div>
      <template #footer>
        <el-button text type="danger" @click="store.clearAlerts()">
          清空所有通知
        </el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { useRisksStore } from '@/stores/risks'
import { useRiskAlert } from '@/composables/useRiskAlert'
import type { RiskItem } from '@/types/risk'
import RiskTable from '@/components/risk/RiskTable.vue'
import RiskFilterBar from '@/components/risk/RiskFilterBar.vue'
import RiskFormDialog from '@/components/risk/RiskFormDialog.vue'
import RiskDetailDrawer from '@/components/risk/RiskDetailDrawer.vue'
import RiskStatsDashboard from '@/components/risk/RiskStatsDashboard.vue'
import AlertRulePanel from '@/components/risk/AlertRulePanel.vue'
import AlertBadge from '@/components/risk/AlertBadge.vue'

const store = useRisksStore()

// Initialize alert polling
useRiskAlert()

const activeTab = ref('list')
const formVisible = ref(false)
const detailVisible = ref(false)
const showAlertDrawer = ref(false)
const editingRisk = ref<RiskItem | null>(null)
const viewingRisk = ref<RiskItem | null>(null)

onMounted(async () => {
  await store.refreshAll()
})

// Refresh data when tab changes
watch(activeTab, async (tab) => {
  if (tab === 'stats') {
    await store.fetchStats()
  } else if (tab === 'rules') {
    await store.fetchAlertRules()
  }
})

function handlePageChange(page: number) {
  store.currentPage = page
  store.fetchRisks()
}

function handlePageSizeChange(size: number) {
  store.pageSize = size
  store.currentPage = 1
  store.fetchRisks()
}

function openCreateDialog() {
  editingRisk.value = null
  formVisible.value = true
}

function openEditDialog(risk: RiskItem) {
  editingRisk.value = risk
  detailVisible.value = false
  formVisible.value = true
}

function handleViewRisk(id: string) {
  viewingRisk.value = store.risks.find(r => r.id === id) || null
  detailVisible.value = true
}

function handleEditRisk(risk: RiskItem) {
  editingRisk.value = risk
  formVisible.value = true
}

async function handleDeleteRisk(risk: RiskItem) {
  await store.deleteRisk(risk.id)
}

async function handleDeleteRiskFromDetail() {
  if (viewingRisk.value) {
    detailVisible.value = false
    await store.deleteRisk(viewingRisk.value.id)
  }
}

async function handleCloseRisk() {
  if (viewingRisk.value) {
    await store.updateRisk(viewingRisk.value.id, {
      status: 'closed',
    })
    detailVisible.value = false
  }
}

async function handleFormSubmit(data: Partial<RiskItem>) {
  if (editingRisk.value) {
    await store.updateRisk(editingRisk.value.id, data)
  } else {
    await store.createRisk({
      projectId: 'default',
      title: data.title || '',
      description: data.description || '',
      category: data.category || 'other',
      level: data.level || 'low',
      status: data.status || 'open',
      probability: (data.probability || 1) as RiskItem['probability'],
      impact: (data.impact || 1) as RiskItem['impact'],
      owner: data.owner || '',
      createdBy: '当前用户',
      dueDate: data.dueDate || null,
      mitigationPlan: data.mitigationPlan || '',
      resolution: data.resolution || '',
      alertStatus: 'none',
      lastAlertAt: null,
      tags: data.tags || [],
    })
  }
  formVisible.value = false
  await store.fetchRisks()
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN')
}
</script>

<style scoped>
.risk-management {
  padding: 24px;
  max-width: 1400px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header__left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  margin: 0;
  font-size: 1.4rem;
  color: var(--text-primary);
}

.page-subtitle {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.page-header__right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.risk-tabs {
  margin-top: 8px;
}

.alert-empty {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.alert-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.alert-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-radius: 8px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
}

.alert-item--acknowledged {
  opacity: 0.6;
}

.alert-item__content {
  flex: 1;
  min-width: 0;
}

.alert-item__message {
  font-size: 0.9rem;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.alert-item__meta {
  display: flex;
  gap: 12px;
  font-size: 0.75rem;
  color: var(--text-muted);
}
</style>
