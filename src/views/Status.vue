<template>
  <div class="status-container">
    <!-- 顶部导航栏 -->
    <div class="top-nav">
      <div class="nav-left">
        <div class="logo-wrapper">
          <span class="logo-icon">◈</span>
          <span class="logo-text">AI 数字员工</span>
        </div>
      </div>
      <div class="nav-tabs">
        <button class="tab-btn active" type="button">
          <span class="tab-icon">📊</span>
          服务仪表盘
        </button>
      </div>
      <div class="nav-right">
        <span class="time-display">{{ currentTime }}</span>
      </div>
    </div>

    <!-- 服务仪表盘 -->
    <div class="dashboard-content">
      <!-- 服务状态卡片 -->
      <div class="service-cards">
        <div class="service-card card-blue">
          <div class="card-header">
            <div class="card-icon-wrapper blue">
              <span class="card-icon">⚡</span>
            </div>
            <span class="card-status online">● 在线</span>
          </div>
          <div class="card-body">
            <div class="card-label">网关服务</div>
            <div class="card-value">
              <span class="value-number">98.5</span>
              <span class="value-unit">正常率 %</span>
            </div>
            <div class="card-trend positive">
              <span>↑ 较昨日 +2.3%</span>
            </div>
          </div>
        </div>

        <div class="service-card card-green">
          <div class="card-header">
            <div class="card-icon-wrapper green">
              <span class="card-icon">◉</span>
            </div>
            <span class="card-status online">● 运行中</span>
          </div>
          <div class="card-body">
            <div class="card-label">团队成员</div>
            <div class="card-value">
              <span class="value-number">{{ agents }}</span>
              <span class="value-unit">个在线</span>
            </div>
            <div class="card-trend positive">
              <span>↑ 新增 2 个</span>
            </div>
          </div>
        </div>

        <div class="service-card card-purple">
          <div class="card-header">
            <div class="card-icon-wrapper purple">
              <span class="card-icon">◎</span>
            </div>
            <span class="card-status busy">● 高负载</span>
          </div>
          <div class="card-body">
            <div class="card-label">内存使用</div>
            <div class="card-value">
              <span class="value-number">{{ memoryUsage }}</span>
              <span class="value-unit">MB</span>
            </div>
            <div class="card-trend neutral">
              <span>→ 稳定运行</span>
            </div>
          </div>
        </div>

        <div class="service-card card-orange">
          <div class="card-header">
            <div class="card-icon-wrapper orange">
              <span class="card-icon">❖</span>
            </div>
            <span class="card-status">● 消耗统计</span>
          </div>
          <div class="card-body">
            <div class="card-label">Tokens 今日</div>
            <div class="card-value">
              <span class="value-number">{{ tokensUsed }}</span>
              <span class="value-unit">K</span>
            </div>
            <div class="card-trend positive">
              <span>↑ 较昨日 +15%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 系统信息 -->
      <div class="info-section">
        <h3 class="section-title">
          <span class="title-icon">⚙</span>
          系统信息
        </h3>
        <div class="info-grid">
          <div class="info-card">
            <div class="info-icon">🕐</div>
            <div class="info-content">
              <span class="info-label">运行时长</span>
              <span class="info-value">{{ uptime }}</span>
            </div>
          </div>
          <div class="info-card">
            <div class="info-icon">🔧</div>
            <div class="info-content">
              <span class="info-label">CPU 负载</span>
              <span class="info-value" :class="cpuColor">{{ cpuUsage }}%</span>
            </div>
          </div>
          <div class="info-card">
            <div class="info-icon">📦</div>
            <div class="info-content">
              <span class="info-label">版本</span>
              <span class="info-value">{{ version }}</span>
            </div>
          </div>
          <div class="info-card">
            <div class="info-icon">🔩</div>
            <div class="info-content">
              <span class="info-label">Node 版本</span>
              <span class="info-value">{{ nodeVersion }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 服务监控图表区 -->
      <div class="monitor-section">
        <div class="monitor-card">
          <div class="monitor-header">
            <h4 class="monitor-title">请求趋势</h4>
            <span class="monitor-action">近 7 天</span>
          </div>
          <div class="chart-placeholder">
            <div class="chart-bars">
              <div class="chart-bar" style="height: 40%"></div>
              <div class="chart-bar" style="height: 65%"></div>
              <div class="chart-bar" style="height: 45%"></div>
              <div class="chart-bar" style="height: 80%"></div>
              <div class="chart-bar" style="height: 55%"></div>
              <div class="chart-bar" style="height: 90%"></div>
              <div class="chart-bar" style="height: 70%"></div>
            </div>
            <div class="chart-labels">
              <span>周一</span>
              <span>周二</span>
              <span>周三</span>
              <span>周四</span>
              <span>周五</span>
              <span>周六</span>
              <span>周日</span>
            </div>
          </div>
        </div>
        <div class="monitor-card">
          <div class="monitor-header">
            <h4 class="monitor-title">响应时间</h4>
            <span class="monitor-action">毫秒</span>
          </div>
          <div class="chart-placeholder">
            <div class="chart-line">
              <svg viewBox="0 0 400 120" class="line-svg">
                <polyline
                  points="0,80 57,60 114,90 171,40 228,70 285,30 342,55 400,45"
                  class="line-path"
                />
                <circle cx="0" cy="80" r="4" class="line-point" />
                <circle cx="57" cy="60" r="4" class="line-point" />
                <circle cx="114" cy="90" r="4" class="line-point" />
                <circle cx="171" cy="40" r="4" class="line-point" />
                <circle cx="228" cy="70" r="4" class="line-point" />
                <circle cx="285" cy="30" r="4" class="line-point" />
                <circle cx="342" cy="55" r="4" class="line-point" />
                <circle cx="400" cy="45" r="4" class="line-point" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// 状态数据
const gatewayStatus = ref('connected')
const agents = ref(11)
const memoryUsage = ref(512)
const tokensUsed = ref(256)
const uptime = ref('2 天 14 小时 32 分')
const cpuUsage = ref(25)
const version = ref('2026.3.2')
const nodeVersion = ref('v25.7.0')

// 当前时间
const currentTime = ref(new Date().toLocaleString('zh-CN'))
setInterval(() => {
  currentTime.value = new Date().toLocaleString('zh-CN')
}, 1000)

// CPU 颜色
const cpuColor = computed(() => {
  if (cpuUsage.value > 80) return 'value-danger'
  if (cpuUsage.value > 50) return 'value-warning'
  return 'value-success'
})
</script>

<style scoped>
/* ========== 容器 ========== */
.status-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f0f4ff 0%, #e8eef8 50%, #f5f0ff 100%);
  padding: 20px;
}

/* ========== 顶部导航 ========== */
.top-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  margin-bottom: 24px;
}

.nav-left {
  display: flex;
  align-items: center;
}

.logo-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 600;
  color: #374151;
}

.logo-icon {
  font-size: 28px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-tabs {
  display: flex;
  gap: 8px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: transparent;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.tab-btn.active {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.tab-icon {
  font-size: 18px;
}

.nav-right {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

.time-display {
  background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
  padding: 8px 16px;
  border-radius: 10px;
}

/* ========== 服务卡片网格 ========== */
.service-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

@media (max-width: 1400px) {
  .service-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .service-cards {
    grid-template-columns: 1fr;
  }
}

.service-card {
  background: #fff;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.service-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  border-radius: 20px 20px 0 0;
}

.service-card.card-blue::before {
  background: linear-gradient(90deg, #3b82f6, #06b6d4);
}

.service-card.card-green::before {
  background: linear-gradient(90deg, #10b981, #34d399);
}

.service-card.card-purple::before {
  background: linear-gradient(90deg, #8b5cf6, #a78bfa);
}

.service-card.card-orange::before {
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
}

.service-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.card-icon-wrapper.blue {
  background: linear-gradient(135deg, #dbeafe, #bfdbfe);
}

.card-icon-wrapper.green {
  background: linear-gradient(135deg, #d1fae5, #a7f3d0);
}

.card-icon-wrapper.purple {
  background: linear-gradient(135deg, #ede9fe, #ddd6fe);
}

.card-icon-wrapper.orange {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
}

.card-status {
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 20px;
}

.card-status.online {
  background: linear-gradient(135deg, #d1fae5, #a7f3d0);
  color: #059669;
}

.card-status.busy {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  color: #d97706;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-label {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.card-value {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.value-number {
  font-size: 36px;
  font-weight: 700;
  background: linear-gradient(135deg, #1f2937, #374151);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
}

.value-unit {
  font-size: 14px;
  color: #9ca3af;
  font-weight: 500;
}

.card-trend {
  font-size: 12px;
  font-weight: 600;
  padding: 6px 10px;
  border-radius: 8px;
  display: inline-block;
  margin-top: 8px;
}

.card-trend.positive {
  background: linear-gradient(135deg, #d1fae5, #a7f3d0);
  color: #059669;
}

.card-trend.neutral {
  background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
  color: #6b7280;
}

/* ========== 系统信息 ========== */
.info-section {
  margin-bottom: 24px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 16px;
}

.title-icon {
  font-size: 22px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

@media (max-width: 1024px) {
  .info-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.info-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
}

.info-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.info-icon {
  font-size: 32px;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.info-value {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.value-success {
  color: #059669;
}

.value-warning {
  color: #d97706;
}

.value-danger {
  color: #dc2626;
}

/* ========== 监控图表 ========== */
.monitor-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

@media (max-width: 1024px) {
  .monitor-section {
    grid-template-columns: 1fr;
  }
}

.monitor-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.monitor-title {
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
}

.monitor-action {
  font-size: 13px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 6px 12px;
  border-radius: 8px;
}

.chart-placeholder {
  height: 160px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.chart-bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 120px;
  gap: 8px;
}

.chart-bar {
  flex: 1;
  background: linear-gradient(180deg, #6366f1, #8b5cf6);
  border-radius: 8px 8px 0 0;
  min-height: 20px;
  transition: all 0.3s ease;
}

.chart-bar:hover {
  opacity: 0.8;
  transform: scaleY(1.05);
}

.chart-labels {
  display: flex;
  justify-content: space-around;
  margin-top: 12px;
}

.chart-labels span {
  font-size: 12px;
  color: #9ca3af;
}

.chart-line {
  height: 120px;
}

.line-svg {
  width: 100%;
  height: 100%;
}

.line-path {
  fill: none;
  stroke: url(#lineGradient);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.line-point {
  fill: #6366f1;
  stroke: #fff;
  stroke-width: 2;
}

/* ========== 聊天布局 ========== */
.chat-content {
  height: calc(100vh - 160px);
}

.chat-layout {
  display: flex;
  height: 100%;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

.contact-panel {
  width: 300px;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
}

.contact-header {
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.search-box {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
}

.search-input {
  width: 100%;
  padding: 12px 16px 12px 40px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  font-size: 14px;
  background: #f9fafb;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #6366f1;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.contact-list {
  flex: 1;
  overflow-y: auto;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 1px solid #f3f4f6;
}

.contact-item:hover {
  background: #f9fafb;
}

.contact-item.active {
  background: linear-gradient(135deg, #eef2ff, #e0e7ff);
  border-left: 3px solid #6366f1;
}

.contact-avatar {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 18px;
  flex-shrink: 0;
}

.contact-info {
  flex: 1;
  min-width: 0;
}

.contact-name {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.contact-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #9ca3af;
}

.status-dot.online {
  background: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
}

.status-dot.offline {
  background: #d1d5db;
}

/* ========== 聊天面板 ========== */
.chat-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.chat-user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chat-user-avatar {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 16px;
}

.chat-user-detail {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.chat-user-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.chat-user-role {
  font-size: 13px;
  color: #6b7280;
}

.chat-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #f3f4f6;
  border-color: #6366f1;
  color: #6366f1;
}

/* ========== 消息列表 ========== */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: #fafbfc;
}

.message-item {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.message-item.send {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
}

.message-bubble {
  max-width: 500px;
  padding: 16px 20px;
  border-radius: 16px;
  position: relative;
}

.message-bubble.receive {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-bottom-left-radius: 4px;
}

.message-bubble.send {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.message-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
}

.message-bubble.receive .message-meta {
  color: #6b7280;
}

.message-bubble.send .message-meta {
  color: rgba(255, 255, 255, 0.8);
}

.message-content {
  font-size: 14px;
  line-height: 1.6;
}

/* ========== 输入区域 ========== */
.chat-input-area {
  border-top: 1px solid #e5e7eb;
  padding: 16px 20px;
  background: #fff;
}

.input-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.tool-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
}

.tool-btn:hover {
  background: #f3f4f6;
  border-color: #6366f1;
}

.message-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  font-size: 14px;
  resize: none;
  font-family: inherit;
  background: #f9fafb;
  transition: all 0.2s;
}

.message-input:focus {
  outline: none;
  border-color: #6366f1;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.input-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.send-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.send-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.3);
}

.send-icon {
  font-size: 16px;
}
</style>
