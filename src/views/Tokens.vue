<template>
  <div class="tokens-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="title-group">
        <h1 class="page-title">
          <span class="title-icon">◈</span>
          <span class="title-main">成本追踪</span>
          <span class="title-sub">TOKENS & COST ANALYTICS // Token 使用量与成本分析</span>
        </h1>
      </div>
      <div class="header-actions">
        <select v-model="timeRange" class="time-select" @change="changeTimeRange">
          <option value="today">今日</option>
          <option value="week">本周</option>
          <option value="month">本月</option>
          <option value="all">全部</option>
        </select>
        <button class="btn btn-secondary btn-sm" @click="refreshData">
          <span>⟳</span> 刷新
        </button>
        <button class="btn btn-primary btn-sm" @click="exportReport">
          <span>⬇</span> 导出报告
        </button>
      </div>
    </div>

    <!-- 概览统计卡片 -->
    <div class="overview-cards">
      <div class="overview-card">
        <div class="card-header">
          <span class="card-icon">📊</span>
          <span class="card-label">总 Token 消耗</span>
        </div>
        <div class="card-value">{{ formatNumber(stats?.totalTokens || 0) }}</div>
        <div class="card-trend positive">
          <span>实时监控</span>
          <span class="trend-label">动态更新</span>
        </div>
      </div>

      <div class="overview-card">
        <div class="card-header">
          <span class="card-icon">💰</span>
          <span class="card-label">估算成本</span>
        </div>
        <div class="card-value">{{ formatCurrency(stats?.totalCost || 0) }}</div>
        <div class="card-trend positive">
          <span>USD</span>
          <span class="trend-label">美元结算</span>
        </div>
      </div>

      <div class="overview-card">
        <div class="card-header">
          <span class="card-icon">📝</span>
          <span class="card-label">输入 Token</span>
        </div>
        <div class="card-value">{{ formatNumber(stats?.inputTokens || 0) }}</div>
        <div class="card-subvalue">
          占总量的 {{ stats?.totalTokens ? ((stats.inputTokens / stats.totalTokens) * 100).toFixed(1) : 0 }}%
        </div>
      </div>

      <div class="overview-card">
        <div class="card-header">
          <span class="card-icon">💬</span>
          <span class="card-label">输出 Token</span>
        </div>
        <div class="card-value">{{ formatNumber(stats?.outputTokens || 0) }}</div>
        <div class="card-subvalue">
          占总量的 {{ stats?.totalTokens ? ((stats.outputTokens / stats.totalTokens) * 100).toFixed(1) : 0 }}%
        </div>
      </div>

      <div class="overview-card">
        <div class="card-header">
          <span class="card-icon">🤖</span>
          <span class="card-label">API 调用次数</span>
        </div>
        <div class="card-value">{{ formatNumber(stats?.apiCalls || 0) }}</div>
        <div class="card-trend positive">
          <span>累计</span>
          <span class="trend-label">调用统计</span>
        </div>
      </div>

      <div class="overview-card">
        <div class="card-header">
          <span class="card-icon">⚡</span>
          <span class="card-label">平均响应时间</span>
        </div>
        <div class="card-value">{{ stats?.avgResponseTime || 0 }}ms</div>
        <div class="card-trend positive">
          <span>延迟</span>
          <span class="trend-label">性能指标</span>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="charts-section" v-if="chartData.length > 0">
      <!-- Token 使用趋势图 -->
      <div class="chart-card">
        <div class="chart-header">
          <h3 class="chart-title">Token 使用趋势</h3>
          <div class="chart-legend">
            <span class="legend-item">
              <span class="legend-dot input"></span>
              输入
            </span>
            <span class="legend-item">
              <span class="legend-dot output"></span>
              输出
            </span>
          </div>
        </div>
        <div class="chart-container">
          <div class="bar-chart">
            <div v-for="(day, index) in chartData" :key="index" class="bar-group">
              <div class="bars">
                <div class="bar input" :style="{ height: Math.min((day.input / 50000) * 100, 100) + '%' }"></div>
                <div class="bar output" :style="{ height: Math.min((day.output / 30000) * 100, 100) + '%' }"></div>
              </div>
              <div class="bar-label">{{ formatDate(day.date) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 模型使用占比 -->
      <div class="chart-card">
        <div class="chart-header">
          <h3 class="chart-title">模型使用分布</h3>
        </div>
        <div class="chart-container">
          <div class="model-list">
            <div
              v-for="model in modelUsage"
              :key="model.model"
              class="model-item"
            >
              <div class="model-info">
                <span class="model-name">{{ model.model }}</span>
                <span class="model-tokens">{{ formatNumber(model.tokens) }} tokens</span>
              </div>
              <div class="model-bar">
                <div
                  class="model-fill"
                  :style="{ width: model.percentage + '%' }"
                ></div>
              </div>
              <div class="model-percent">{{ model.percentage }}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 无数据提示 -->
    <div v-else class="empty-state">
      <div class="empty-icon">📊</div>
      <p class="empty-text">暂无数据</p>
      <button class="btn btn-primary" @click="refreshData">刷新数据</button>
    </div>

    <!-- Agent 成本排行 -->
    <div class="section-card" v-if="agentRanking.length > 0">
      <div class="section-header">
        <h3 class="section-title">Agent 成本排行</h3>
      </div>
      <div class="agent-table">
        <table>
          <thead>
            <tr>
              <th>排名</th>
              <th>Agent</th>
              <th>Token 消耗</th>
              <th>调用次数</th>
              <th>估算成本</th>
              <th>占比</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(agent, index) in agentRanking"
              :key="agent.agentId"
              class="agent-row"
            >
              <td>
                <span :class="['rank', 'rank-' + (index + 1)]">
                  {{ index + 1 }}
                </span>
              </td>
              <td>
                <div class="agent-info">
                  <span class="agent-icon">{{ getAgentIcon(agent.agentId) }}</span>
                  <span class="agent-name">{{ formatAgentName(agent.agentName) }}</span>
                </div>
              </td>
              <td class="mono">{{ formatNumber(agent.tokens) }}</td>
              <td class="mono">--</td>
              <td class="mono">{{ formatCurrency(agent.cost) }}</td>
              <td>
                <div class="mini-bar">
                  <div
                    class="mini-fill"
                    :style="{ width: agent.percentage + '%' }"
                  ></div>
                </div>
                <span class="mini-percent">{{ agent.percentage }}%</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 最近使用记录 -->
    <div class="section-card" v-if="recentUsage.length > 0">
      <div class="section-header">
        <h3 class="section-title">最近使用记录</h3>
        <button class="btn btn-secondary btn-sm" @click="viewAll">查看全部</button>
      </div>
      <div class="usage-list">
        <div
          v-for="record in recentUsage"
          :key="record.id"
          class="usage-item"
        >
          <div class="usage-left">
            <span class="usage-icon">{{ getAgentIcon(record.agentId) }}</span>
            <div class="usage-info">
              <span class="usage-agent">{{ formatAgentName(record.agentName) }}</span>
              <span class="usage-action">{{ record.endpoint }}</span>
            </div>
          </div>
          <div class="usage-right">
            <span class="usage-tokens">+{{ formatNumber(record.totalTokens) }} tokens</span>
            <span class="usage-time">{{ formatTime(record.timestamp) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 无数据提示 -->
    <div v-if="agentRanking.length === 0 && recentUsage.length === 0" class="empty-state">
      <div class="empty-icon">📋</div>
      <p class="empty-text">暂无使用记录</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTokensStore } from '@/stores/tokens'
import type { AgentCost } from '@/api'
import { useNotification } from '@/composables/useNotification'

const tokensStore = useTokensStore()
const notification = useNotification()

const timeRange = ref('week')

// 使用 store 中的数据
const stats = computed(() => tokensStore.stats)
const chartData = computed(() => tokensStore.trend)
const modelUsage = computed(() => tokensStore.modelUsage)
const agentRanking = computed(() => {
  const totalTokens = tokensStore.agentCosts.reduce((sum, agent) => sum + agent.tokens, 0) || 1
  return tokensStore.agentCosts.map((agent): AgentCost & { percentage: number } => ({
    ...agent,
    percentage: Math.round((agent.tokens / totalTokens) * 100)
  }))
})
const recentUsage = computed(() => tokensStore.recentUsage)

// 格式化数字
const formatNumber = (num: number): string => {
  if (!num) return '0'
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toLocaleString()
}

// 格式化金额
const formatCurrency = (num: number): string => {
  if (!num) return '$0.00'
  return '$' + num.toFixed(2)
}

// 格式化时间
const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// 格式化日期
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return days[date.getDay()]
}

// 格式化 Agent 名称
const formatAgentName = (name: string): string => {
  const map: Record<string, string> = {
    'xiaomu': '小呦',
    'xiaokai': '小开',
    'xiaochan': '小产',
    'xiaoyan': '小研',
    'xiaoce': '小测'
  }
  return map[name] || name
}

// 获取图标
const getAgentIcon = (name: string): string => {
  const map: Record<string, string> = {
    'xiaomu': '🤖',
    'xiaokai': '💻',
    'xiaochan': '📋',
    'xiaoyan': '🔬',
    'xiaoce': '🛡️'
  }
  return map[name] || '⚙️'
}

const refreshData = async () => {
  await tokensStore.fetchTokenStats(timeRange.value as any)
}

const exportReport = async () => {
  try {
    await tokensStore.exportReport(timeRange.value)
  } catch (e: any) {
    notification.error('导出失败：' + e.message)
  }
}

const viewAll = () => {
  console.log('Viewing all usage records...')
  // TODO: 打开完整记录列表
}

// 监听时间范围变化
const changeTimeRange = () => {
  refreshData()
}

onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.tokens-page {
  max-width: 1400px;
  margin: 0 auto;
}

/* ========== 页面头部 ========== */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--grid-line);
}

.title-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.page-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
}

.title-main {
  font-size: 26px;
  font-weight: 700;
  color: var(--color-primary);
  text-shadow: 0 0 20px rgba(0, 240, 255, 0.4);
  letter-spacing: 0.1em;
}

.title-sub {
  font-size: 12px;
  color: var(--color-secondary);
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.title-icon {
  display: none;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.time-select {
  padding: 8px 16px;
  background: var(--bg-base);
  border: 1px solid var(--border-default);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 13px;
  font-family: var(--font-mono);
  cursor: pointer;
  outline: none;
}

.time-select:focus {
  border-color: var(--color-primary);
}

/* ========== 概览卡片 ========== */
.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.overview-card {
  background: var(--bg-panel);
  border: 1px solid var(--grid-line);
  border-radius: 10px;
  padding: 20px;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
}

.overview-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
  opacity: 0.6;
}

.overview-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 8px 24px rgba(0, 240, 255, 0.15);
  transform: translateY(-4px);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.card-icon {
  font-size: 20px;
}

.card-label {
  font-size: 12px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  text-transform: uppercase;
}

.card-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-primary);
  font-family: var(--font-mono);
  margin-bottom: 8px;
}

.card-subvalue {
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.card-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-family: var(--font-mono);
  padding: 4px 8px;
  border-radius: 4px;
  width: fit-content;
}

.card-trend.positive {
  background: rgba(0, 255, 136, 0.1);
  color: var(--color-success);
}

.card-trend.negative {
  background: rgba(255, 51, 102, 0.1);
  color: var(--color-error);
}

.trend-label {
  color: var(--text-muted);
}

/* ========== 图表区域 ========== */
.charts-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

@media (max-width: 1024px) {
  .charts-section {
    grid-template-columns: 1fr;
  }
}

.chart-card {
  background: var(--bg-panel);
  border: 1px solid var(--grid-line);
  border-radius: 10px;
  padding: 20px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.chart-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 0;
}

.chart-legend {
  display: flex;
  gap: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.legend-dot.input {
  background: var(--color-primary);
}

.legend-dot.output {
  background: var(--color-secondary);
}

.chart-container {
  height: 200px;
}

/* ========== 柱状图表 ========== */
.bar-chart {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 100%;
  padding-top: 20px;
}

.bar-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.bars {
  display: flex;
  gap: 4px;
  align-items: flex-end;
  height: 140px;
}

.bar {
  width: 12px;
  border-radius: 2px;
  transition: height 0.3s;
}

.bar.input {
  background: linear-gradient(180deg, var(--color-primary), rgba(0, 240, 255, 0.3));
}

.bar.output {
  background: linear-gradient(180deg, var(--color-secondary), rgba(189, 0, 255, 0.3));
}

.bar-label {
  font-size: 11px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

/* ========== 模型列表 ========== */
.model-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.model-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.model-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.model-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: var(--font-mono);
}

.model-tokens {
  font-size: 12px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.model-bar {
  height: 8px;
  background: var(--bg-base);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--grid-line-dim);
}

.model-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
  border-radius: 4px;
  transition: width 0.5s;
}

.model-percent {
  font-size: 11px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  text-align: right;
}

/* ========== 章节卡片 ========== */
.section-card {
  background: var(--bg-panel);
  border: 1px solid var(--grid-line);
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 0;
}

/* ========== 表格样式 ========== */
.agent-table {
  overflow-x: auto;
}

.agent-table table {
  width: 100%;
  border-collapse: collapse;
}

.agent-table th {
  text-align: left;
  padding: 12px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  font-family: var(--font-mono);
  border-bottom: 1px solid var(--grid-line);
}

.agent-table td {
  padding: 12px;
  border-bottom: 1px solid var(--grid-line-dim);
}

.agent-row:hover {
  background: rgba(0, 240, 255, 0.05);
}

.rank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
  font-family: var(--font-mono);
}

.rank-1 {
  background: linear-gradient(135deg, #ffd700, #ffb700);
  color: #000;
}

.rank-2 {
  background: linear-gradient(135deg, #c0c0c0, #a0a0a0);
  color: #000;
}

.rank-3 {
  background: linear-gradient(135deg, #cd7f32, #b87333);
  color: #fff;
}

.rank-4, .rank-5 {
  background: var(--bg-base);
  color: var(--text-secondary);
}

.agent-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.agent-icon {
  font-size: 18px;
}

.agent-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.mono {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-secondary);
}

.mini-bar {
  display: inline-block;
  width: 80px;
  height: 6px;
  background: var(--bg-base);
  border-radius: 3px;
  overflow: hidden;
  vertical-align: middle;
  margin-right: 8px;
  border: 1px solid var(--grid-line-dim);
}

.mini-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
  border-radius: 3px;
}

.mini-percent {
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

/* ========== 使用记录列表 ========== */
.usage-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.usage-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--bg-base);
  border: 1px solid var(--grid-line-dim);
  border-radius: 8px;
  transition: all 0.2s;
}

.usage-item:hover {
  border-color: var(--color-primary);
  background: rgba(0, 240, 255, 0.05);
}

.usage-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.usage-icon {
  font-size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(0, 240, 255, 0.15) 0%, rgba(189, 0, 255, 0.1) 100%);
  border: 1px solid rgba(0, 240, 255, 0.2);
  border-radius: 8px;
}

.usage-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.usage-agent {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.usage-action {
  font-size: 12px;
  color: var(--text-tertiary);
}

.usage-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.usage-tokens {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary);
  font-family: var(--font-mono);
}

.usage-time {
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

/* ========== 通用按钮样式 ========== */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.btn-icon {
  font-size: 14px;
}

.btn-sm {
  padding: 8px 12px;
  font-size: 11px;
}

.btn-primary {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  border-color: transparent;
  color: var(--text-inverse);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0, 240, 255, 0.3);
}

.btn-secondary {
  background: var(--bg-surface);
  border-color: var(--border-default);
  color: var(--text-secondary);
}

.btn-secondary:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

/* ========== 亮色主题样式 ========== */
:root.light-theme .page-header {
  border-bottom-color: #e5e7eb;
}

:root.light-theme .title-main {
  color: #1e293b;
  text-shadow: none;
  font-weight: 800;
}

:root.light-theme .title-sub {
  color: #64748b;
}

:root.light-theme .overview-card {
  background: #ffffff;
  border-color: #e5e7eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

:root.light-theme .overview-card::before {
  background: linear-gradient(90deg, #2563eb, #6366f1);
  opacity: 1;
}

:root.light-theme .card-label {
  color: #64748b;
}

:root.light-theme .card-value {
  color: #2563eb;
}

:root.light-theme .chart-card {
  background: #ffffff;
  border-color: #e5e7eb;
}

:root.light-theme .chart-title {
  color: #1e293b;
}

:root.light-theme .section-card {
  background: #ffffff;
  border-color: #e5e7eb;
}

:root.light-theme .section-title {
  color: #1e293b;
}

:root.light-theme .agent-table th {
  color: #64748b;
  border-bottom-color: #e5e7eb;
}

:root.light-theme .agent-table td {
  border-bottom-color: #f3f4f6;
}

:root.light-theme .agent-row:hover {
  background: rgba(37, 99, 235, 0.05);
}

:root.light-theme .usage-item {
  background: #f9fafb;
  border-color: #e5e7eb;
}

:root.light-theme .usage-item:hover {
  border-color: #2563eb;
  background: rgba(37, 99, 235, 0.05);
}

:root.light-theme .usage-agent {
  color: #1e293b;
}

:root.light-theme .time-select {
  background: #f9fafb;
  border-color: #e5e7eb;
  color: #1e293b;
}
</style>
