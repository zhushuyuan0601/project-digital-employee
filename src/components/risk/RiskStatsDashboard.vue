<template>
  <div class="risk-stats-dashboard">
    <!-- KPI Cards -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">风险总数</div>
        <div class="kpi-value">{{ stats?.total ?? 0 }}</div>
      </div>
      <div class="kpi-card kpi-card--danger">
        <div class="kpi-label">高风险数</div>
        <div class="kpi-value">{{ (stats?.byLevel.high ?? 0) + (stats?.byLevel.critical ?? 0) }}</div>
      </div>
      <div class="kpi-card kpi-card--warning">
        <div class="kpi-label">已过期数</div>
        <div class="kpi-value">{{ stats?.overdueCount ?? 0 }}</div>
      </div>
      <div class="kpi-card kpi-card--danger kpi-card--pulse">
        <div class="kpi-label">预警中</div>
        <div class="kpi-value">{{ stats?.triggeredAlertCount ?? 0 }}</div>
      </div>
    </div>

    <!-- Charts Grid -->
    <div class="charts-grid">
      <!-- Level Distribution -->
      <div class="chart-card">
        <h3 class="chart-title">等级分布</h3>
        <div class="bar-chart">
          <div
            v-for="level in levelBars"
            :key="level.key"
            class="bar-row"
          >
            <div class="bar-label">
              <RiskLevelBadge :level="level.key as any" />
            </div>
            <div class="bar-track">
              <div
                class="bar-fill"
                :style="{
                  width: `${level.percent}%`,
                  backgroundColor: level.color,
                }"
              />
            </div>
            <div class="bar-count">
              {{ level.count }}
              <span class="bar-percent">({{ level.percent }}%)</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Category Distribution -->
      <div class="chart-card">
        <h3 class="chart-title">类别分布</h3>
        <div class="bar-chart">
          <div
            v-for="cat in categoryBars"
            :key="cat.key"
            class="bar-row"
          >
            <div class="bar-label bar-label--text">{{ cat.label }}</div>
            <div class="bar-track">
              <div
                class="bar-fill bar-fill--secondary"
                :style="{ width: `${cat.percent}%` }"
              />
            </div>
            <div class="bar-count">
              {{ cat.count }}
            </div>
          </div>
        </div>
      </div>

      <!-- Status Distribution -->
      <div class="chart-card">
        <h3 class="chart-title">状态分布</h3>
        <div class="bar-chart">
          <div
            v-for="st in statusBars"
            :key="st.key"
            class="bar-row"
          >
            <div class="bar-label bar-label--text">{{ st.label }}</div>
            <div class="bar-track">
              <div
                class="bar-fill bar-fill--secondary"
                :style="{ width: `${st.percent}%` }"
              />
            </div>
            <div class="bar-count">
              {{ st.count }}
            </div>
          </div>
        </div>
      </div>

      <!-- 7-Day Trend -->
      <div class="chart-card chart-card--wide">
        <h3 class="chart-title">近 7 天趋势</h3>
        <div class="trend-chart">
          <div class="trend-legend">
            <span class="legend-item">
              <span class="legend-dot legend-dot--open" />
              新增
            </span>
            <span class="legend-item">
              <span class="legend-dot legend-dot--closed" />
              关闭
            </span>
          </div>
          <div class="trend-bars">
            <div
              v-for="day in trendData"
              :key="day.date"
              class="trend-column"
            >
              <div class="trend-pair">
                <div
                  class="trend-bar trend-bar--open"
                  :style="{ height: `${day.openHeight}px` }"
                  :title="`新增: ${day.openCount}`"
                />
                <div
                  class="trend-bar trend-bar--closed"
                  :style="{ height: `${day.closedHeight}px` }"
                  :title="`关闭: ${day.closedCount}`"
                />
              </div>
              <div class="trend-date">{{ day.label }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RiskStats } from '@/types/risk'
import RiskLevelBadge from './RiskLevelBadge.vue'
import { LEVEL_CONFIG_MAP, CATEGORY_LABELS, STATUS_LABELS } from '@/types/risk'

const props = defineProps<{
  stats: RiskStats | null
}>()

const levelBars = computed(() => {
  const total = props.stats?.total ?? 0
  return (['critical', 'high', 'medium', 'low'] as const).map(key => ({
    key,
    label: LEVEL_CONFIG_MAP[key].label,
    count: props.stats?.byLevel[key] ?? 0,
    percent: total > 0 ? Math.round((props.stats?.byLevel[key] ?? 0) / total * 100) : 0,
    color: LEVEL_CONFIG_MAP[key].color,
  }))
})

const categoryBars = computed(() => {
  const total = props.stats?.total ?? 0
  const entries = Object.entries(CATEGORY_LABELS)
  const maxCount = Math.max(...entries.map(([key]) => props.stats?.byCategory[key as keyof typeof props.stats.byCategory] ?? 0), 1)
  return entries.map(([key, label]) => ({
    key,
    label,
    count: props.stats?.byCategory[key as keyof typeof props.stats.byCategory] ?? 0,
    percent: Math.round((props.stats?.byCategory[key as keyof typeof props.stats.byCategory] ?? 0) / maxCount * 100),
  }))
})

const statusBars = computed(() => {
  const total = props.stats?.total ?? 0
  const entries = Object.entries(STATUS_LABELS)
  const maxCount = Math.max(...entries.map(([key]) => props.stats?.byStatus[key as keyof typeof props.stats.byStatus] ?? 0), 1)
  return entries.map(([key, label]) => ({
    key,
    label,
    count: props.stats?.byStatus[key as keyof typeof props.stats.byStatus] ?? 0,
    percent: Math.round((props.stats?.byStatus[key as keyof typeof props.stats.byStatus] ?? 0) / maxCount * 100),
  }))
})

const trendData = computed(() => {
  const trend = props.stats?.trendLast7Days ?? []
  const maxCount = Math.max(...trend.map(d => Math.max(d.openCount, d.closedCount)), 1)
  const maxBarHeight = 120

  return trend.map(d => {
    const date = new Date(d.date)
    const label = `${date.getMonth() + 1}/${date.getDate()}`
    return {
      ...d,
      label,
      openHeight: Math.max((d.openCount / maxCount) * maxBarHeight, 4),
      closedHeight: Math.max((d.closedCount / maxCount) * maxBarHeight, 4),
    }
  })
})
</script>

<style scoped>
.risk-stats-dashboard {
  padding: 4px 0;
}

/* KPI Cards */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.kpi-card {
  padding: 20px;
  border-radius: 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  text-align: center;
}

.kpi-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.kpi-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
}

.kpi-card--danger .kpi-value {
  color: var(--color-error);
}

.kpi-card--warning .kpi-value {
  color: var(--color-warning);
}

.kpi-card--pulse {
  animation: kpi-pulse 2s ease-in-out infinite;
}

@keyframes kpi-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(245, 108, 108, 0.2); }
  50% { box-shadow: 0 0 0 8px rgba(245, 108, 108, 0); }
}

/* Charts */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.chart-card {
  padding: 20px;
  border-radius: 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
}

.chart-card--wide {
  grid-column: span 2;
}

.chart-title {
  margin: 0 0 16px;
  font-size: 0.95rem;
  color: var(--text-primary);
}

/* Bar Chart */
.bar-chart {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bar-row {
  display: grid;
  grid-template-columns: 70px 1fr 80px;
  align-items: center;
  gap: 12px;
}

.bar-label--text {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.bar-track {
  height: 20px;
  background: var(--bg-surface);
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.bar-fill--secondary {
  background: var(--color-primary);
}

.bar-count {
  font-size: 0.85rem;
  color: var(--text-secondary);
  text-align: right;
}

.bar-percent {
  color: var(--text-muted);
  font-size: 0.75rem;
}

/* Trend Chart */
.trend-chart {
  padding-top: 8px;
}

.trend-legend {
  display: flex;
  gap: 20px;
  margin-bottom: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.legend-dot--open {
  background: var(--color-primary);
}

.legend-dot--closed {
  background: var(--color-success);
}

.trend-bars {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 160px;
  padding-bottom: 24px;
  position: relative;
}

.trend-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.trend-pair {
  display: flex;
  gap: 4px;
  align-items: flex-end;
  height: 130px;
}

.trend-bar {
  width: 20px;
  border-radius: 3px 3px 0 0;
  transition: height 0.5s ease;
}

.trend-bar--open {
  background: var(--color-primary);
}

.trend-bar--closed {
  background: var(--color-success);
}

.trend-date {
  font-size: 0.75rem;
  color: var(--text-muted);
}

@media (max-width: 900px) {
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .charts-grid {
    grid-template-columns: 1fr;
  }
  .chart-card--wide {
    grid-column: span 1;
  }
}
</style>
