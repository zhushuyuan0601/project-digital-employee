<template>
  <div class="skills-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="title-group">
        <h1 class="page-title">
          <span class="title-icon">◈</span>
          <span class="title-main">技能中心</span>
          <span class="title-sub">SKILLS HUB // 浏览与安装 Agent 技能</span>
        </h1>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary btn-sm" @click="refreshSkills">
          <span>⟳</span> 刷新
        </button>
        <button class="btn btn-primary btn-sm" @click="showInstallModal = true">
          <span>⬇</span> 安装技能
        </button>
      </div>
    </div>

    <!-- 搜索与过滤 -->
    <div class="skills-filter">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="搜索技能..."
        />
      </div>
      <div class="filter-group">
        <select v-model="categoryFilter" class="filter-select">
          <option value="">全部分类</option>
          <option value="tool">工具类</option>
          <option value="analysis">分析类</option>
          <option value="communication">通信类</option>
          <option value="automation">自动化</option>
          <option value="security">安全类</option>
        </select>
        <select v-model="statusFilter" class="filter-select">
          <option value="">全部状态</option>
          <option value="installed">已安装</option>
          <option value="available">未安装</option>
          <option value="update">可更新</option>
        </select>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner">
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
      </div>
      <p class="loading-text">正在加载技能库...</p>
    </div>

    <!-- 技能网格 -->
    <div v-else class="skills-grid">
      <div
        v-for="skill in filteredSkills"
        :key="skill.id"
        class="skill-card"
        :class="{ 'is-installed': skill.installed, 'has-update': skill.updateAvailable }"
      >
        <!-- 卡片头部 -->
        <div class="skill-card__header">
          <div class="skill-card__icon">{{ skill.icon }}</div>
          <div class="skill-card__info">
            <div class="skill-card__name">{{ skill.name }}</div>
            <div class="skill-card__author">by {{ skill.author }}</div>
          </div>
          <div class="skill-card__version">v{{ skill.version }}</div>
        </div>

        <!-- 卡片主体 -->
        <div class="skill-card__body">
          <p class="skill-card__description">{{ skill.description }}</p>

          <div class="skill-card__meta">
            <span class="skill-tag">{{ skill.category }}</span>
            <span class="skill-meta">
              <span class="meta-icon">⬇</span>
              {{ skill.downloads }}
            </span>
            <span class="skill-meta">
              <span class="meta-icon">★</span>
              {{ skill.rating }}
            </span>
          </div>
        </div>

        <!-- 卡片底部 -->
        <div class="skill-card__footer">
          <div class="status-badge" v-if="skill.installed">
            <span class="status-dot"></span>
            <span class="status-text">已安装</span>
          </div>
          <div class="status-badge update" v-else-if="skill.updateAvailable">
            <span class="status-dot"></span>
            <span class="status-text">可更新</span>
          </div>
          <div class="skill-actions">
            <button
              v-if="!skill.installed"
              class="btn btn-primary btn-sm"
              @click="installSkill(skill)"
            >
              <span class="btn-icon">⬇</span>
              安装
            </button>
            <button
              v-else-if="skill.updateAvailable"
              class="btn btn-warning btn-sm"
              @click="updateSkill(skill)"
            >
              <span class="btn-icon">⟳</span>
              更新
            </button>
            <button
              v-else
              class="btn btn-secondary btn-sm"
              @click="uninstallSkill(skill)"
            >
              <span class="btn-icon">✕</span>
              卸载
            </button>
            <button
              class="btn btn-secondary btn-sm"
              @click="viewSkillDetail(skill)"
            >
              <span class="btn-icon">◈</span>
              详情
            </button>
          </div>
        </div>

        <!-- 安全扫描指示器 -->
        <div v-if="skill.securityScan" class="security-scan">
          <span :class="['scan-icon', skill.securityScan.status]">
            {{ skill.securityScan.status === 'safe' ? '✓' : '⚠' }}
          </span>
          <span class="scan-text">
            {{ skill.securityScan.status === 'safe' ? '安全扫描通过' : '存在风险' }}
          </span>
        </div>
      </div>
    </div>

    <!-- 安装技能弹窗 -->
    <div v-if="showInstallModal" class="modal-overlay" @click="showInstallModal = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>安装技能</h3>
          <button class="modal-close" @click="showInstallModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="install-options">
            <div class="install-option">
              <label>从 URL 安装</label>
              <input
                v-model="installUrl"
                type="text"
                class="install-input"
                placeholder="输入技能 URL (如：https://github.com/...)"
              />
            </div>
            <div class="install-divider">
              <span>或</span>
            </div>
            <div class="install-option">
              <label>从技能市场选择</label>
              <div class="quick-skills">
                <div
                  v-for="skill in availableSkills"
                  :key="skill.id"
                  class="quick-skill-item"
                  @click="installSkill(skill)"
                >
                  <span class="quick-skill-icon">{{ skill.icon }}</span>
                  <span class="quick-skill-name">{{ skill.name }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showInstallModal = false">取消</button>
          <button
            class="btn btn-primary"
            :disabled="!installUrl"
            @click="installFromUrl"
          >
            安装
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSkillsStore } from '@/stores/skills'
import type { Skill } from '@/api'

const skillsStore = useSkillsStore()

const searchQuery = ref('')
const categoryFilter = ref('')
const statusFilter = ref('')
const showInstallModal = ref(false)
const installUrl = ref('')
const quickInstallSkill = ref('')

// 使用 store 中的数据
const skills = computed(() => skillsStore.skills)
const isLoading = computed(() => skillsStore.loading)
const error = computed(() => skillsStore.error)

const availableSkills = computed(() => skills.value.filter(s => !s.installed))

const filteredSkills = computed(() => {
  return skills.value.filter(skill => {
    // 搜索过滤
    const matchesSearch = !searchQuery.value ||
      skill.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchQuery.value.toLowerCase())

    // 分类过滤
    const matchesCategory = !categoryFilter.value || skill.category === categoryFilter.value

    // 状态过滤
    let matchesStatus = true
    if (statusFilter.value === 'installed') matchesStatus = skill.installed
    else if (statusFilter.value === 'available') matchesStatus = !skill.installed
    else if (statusFilter.value === 'update') matchesStatus = skill.updateAvailable

    return matchesSearch && matchesCategory && matchesStatus
  })
})

const refreshSkills = async () => {
  await skillsStore.fetchSkills()
}

const installSkill = async (skill: Skill | { url: string }) => {
  try {
    await skillsStore.installSkill(skill)
    showInstallModal.value = false
    installUrl.value = ''
  } catch (e: any) {
    alert('安装失败：' + e.message)
  }
}

const updateSkill = async (skill: Skill) => {
  try {
    await skillsStore.updateSkill(skill.id)
  } catch (e: any) {
    alert('更新失败：' + e.message)
  }
}

const uninstallSkill = async (skill: Skill) => {
  if (confirm(`确定要卸载 ${skill.name} 吗？`)) {
    try {
      await skillsStore.uninstallSkill(skill.id)
    } catch (e: any) {
      alert('卸载失败：' + e.message)
    }
  }
}

const getSecurityStatus = (skill: Skill) => {
  if (!skill.securityScan) return { text: '未扫描', class: '' }
  const map = {
    safe: { text: '通过', class: 'safe' },
    warning: { text: '警告', class: 'warning' },
    danger: { text: '危险', class: 'danger' },
    pending: { text: '未扫描', class: '' }
  }
  return map[skill.securityScan.status as keyof typeof map] || { text: '未知', class: '' }
}

const installFromUrl = async () => {
  if (!installUrl.value) return
  try {
    await skillsStore.installSkill({ url: installUrl.value })
    showInstallModal.value = false
    installUrl.value = ''
  } catch (e: any) {
    alert('安装失败：' + e.message)
  }
}

onMounted(() => {
  refreshSkills()
})
</script>

<style scoped>
.skills-page {
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

/* ========== 搜索与过滤 ========== */
.skills-filter {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
}

.search-box {
  position: relative;
  flex: 1;
  max-width: 400px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  color: var(--text-tertiary);
}

.search-input {
  width: 100%;
  padding: 12px 16px 12px 40px;
  background: var(--bg-base);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 14px;
  font-family: var(--font-mono);
  outline: none;
  transition: all 0.2s;
}

.search-input::placeholder {
  color: var(--text-muted);
}

.search-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(0, 240, 255, 0.1);
}

.filter-group {
  display: flex;
  gap: 12px;
}

.filter-select {
  padding: 10px 16px;
  background: var(--bg-base);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 13px;
  font-family: var(--font-mono);
  cursor: pointer;
  outline: none;
  transition: all 0.2s;
}

.filter-select:focus {
  border-color: var(--color-primary);
}

/* ========== 加载状态 ========== */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 24px;
}

.loading-spinner {
  position: relative;
  width: 64px;
  height: 64px;
}

.spinner-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 2px solid transparent;
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1.5s cubic-bezier(0.5, 0, 0.5, 1) infinite;
}

.spinner-ring:nth-child(2) {
  width: 80%;
  height: 80%;
  top: 10%;
  left: 10%;
  border-top-color: var(--color-secondary);
  animation-delay: -0.5s;
}

.spinner-ring:nth-child(3) {
  width: 60%;
  height: 60%;
  top: 20%;
  left: 20%;
  border-top-color: var(--color-accent);
  animation-delay: -1s;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 13px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* ========== 技能卡片网格 ========== */
.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}

.skill-card {
  background: var(--bg-panel);
  border: 1px solid var(--grid-line);
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.3s;
  position: relative;
  display: flex;
  flex-direction: column;
}

.skill-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
  opacity: 0.6;
}

.skill-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 8px 32px rgba(0, 240, 255, 0.15);
  transform: translateY(-4px);
}

.skill-card.is-installed::before {
  background: linear-gradient(90deg, var(--color-success), var(--color-info));
}

.skill-card.has-update::before {
  background: linear-gradient(90deg, var(--color-warning), var(--color-accent));
}

/* ========== 卡片头部 ========== */
.skill-card__header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--grid-line-dim);
  background: linear-gradient(180deg, rgba(0, 240, 255, 0.05) 0%, transparent 100%);
}

.skill-card__icon {
  font-size: 32px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(0, 240, 255, 0.15) 0%, rgba(189, 0, 255, 0.1) 100%);
  border: 1px solid rgba(0, 240, 255, 0.2);
  border-radius: 10px;
}

.skill-card__info {
  flex: 1;
}

.skill-card__name {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.skill-card__author {
  font-size: 12px;
  color: var(--text-tertiary);
}

.skill-card__version {
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono);
  padding: 4px 8px;
  border: 1px solid var(--grid-line);
  border-radius: 4px;
}

/* ========== 卡片主体 ========== */
.skill-card__body {
  padding: 16px 20px;
  flex: 1;
}

.skill-card__description {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 12px;
}

.skill-card__meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.skill-tag {
  font-size: 11px;
  color: var(--color-primary);
  background: rgba(0, 240, 255, 0.1);
  border: 1px solid rgba(0, 240, 255, 0.2);
  padding: 4px 10px;
  border-radius: 4px;
  text-transform: uppercase;
  font-family: var(--font-mono);
  font-weight: 600;
}

.skill-meta {
  font-size: 11px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 4px;
}

.meta-icon {
  font-size: 12px;
}

/* ========== 卡片底部 ========== */
.skill-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-top: 1px solid var(--grid-line);
  gap: 12px;
}

.skill-actions {
  display: flex;
  gap: 8px;
  flex: 1;
  justify-content: flex-end;
}

/* ========== 状态徽章 ========== */
.status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 11px;
  font-family: var(--font-mono);
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge .status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-success);
  box-shadow: 0 0 8px var(--color-success);
}

.status-badge {
  background: rgba(0, 255, 136, 0.1);
  border: 1px solid var(--color-success);
  color: var(--color-success);
}

.status-badge.update {
  background: rgba(255, 170, 0, 0.1);
  border: 1px solid var(--color-warning);
  color: var(--color-warning);
}

/* ========== 安全扫描指示器 ========== */
.security-scan {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid var(--grid-line-dim);
  font-size: 11px;
  font-family: var(--font-mono);
}

.scan-icon {
  font-size: 14px;
  font-weight: 700;
}

.scan-icon.passed {
  color: var(--color-success);
}

.scan-icon.warning {
  color: var(--color-warning);
}

.scan-text {
  color: var(--text-tertiary);
}

/* ========== 通用按钮样式 ========== */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
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

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.btn-warning {
  background: linear-gradient(135deg, var(--color-warning) 0%, var(--color-accent) 100%);
  border-color: transparent;
  color: var(--text-inverse);
}

/* ========== 弹窗样式 ========== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--bg-panel);
  border: 1px solid var(--grid-line);
  border-radius: 12px;
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--grid-line);
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.modal-close {
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  transition: color 0.2s;
}

.modal-close:hover {
  color: var(--text-primary);
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid var(--grid-line);
}

/* ========== 安装选项 ========== */
.install-options {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.install-option label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  margin-bottom: 8px;
}

.install-input {
  width: 100%;
  padding: 12px 16px;
  background: var(--bg-base);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 14px;
  font-family: var(--font-mono);
  outline: none;
}

.install-input:focus {
  border-color: var(--color-primary);
}

.install-divider {
  display: flex;
  align-items: center;
  gap: 16px;
  color: var(--text-tertiary);
  font-size: 12px;
}

.install-divider::before,
.install-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--grid-line);
}

.quick-skills {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.quick-skill-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg-base);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-skill-item:hover {
  border-color: var(--color-primary);
  background: rgba(0, 240, 255, 0.05);
}

.quick-skill-icon {
  font-size: 24px;
}

.quick-skill-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
  }

  .skills-filter {
    flex-direction: column;
  }

  .search-box {
    max-width: 100%;
  }

  .filter-group {
    width: 100%;
  }

  .filter-select {
    flex: 1;
  }

  .skills-grid {
    grid-template-columns: 1fr;
  }
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

:root.light-theme .search-input {
  background: #f9fafb;
  border-color: #e5e7eb;
  color: #1e293b;
}

:root.light-theme .search-input::placeholder {
  color: #9ca3af;
}

:root.light-theme .search-input:focus {
  border-color: #2563eb;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

:root.light-theme .filter-select {
  background: #f9fafb;
  border-color: #e5e7eb;
  color: #1e293b;
}

:root.light-theme .skill-card {
  background: #ffffff;
  border-color: #e5e7eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

:root.light-theme .skill-card:hover {
  border-color: #2563eb;
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.15);
}

:root.light-theme .skill-card::before {
  background: linear-gradient(90deg, #2563eb, #6366f1);
  opacity: 1;
}

:root.light-theme .skill-card__header {
  border-bottom-color: #f3f4f6;
  background: linear-gradient(180deg, rgba(37, 99, 235, 0.05) 0%, transparent 100%);
}

:root.light-theme .skill-card__name {
  color: #1e293b;
}

:root.light-theme .skill-card__author {
  color: #94a3b8;
}

:root.light-theme .skill-card__description {
  color: #475569;
}

:root.light-theme .skill-tag {
  background: rgba(37, 99, 235, 0.1);
  border-color: #bfdbfe;
  color: #2563eb;
}

:root.light-theme .skill-card__footer {
  border-top-color: #e5e7eb;
}

:root.light-theme .status-badge {
  background: rgba(16, 185, 129, 0.1);
  border-color: #10b981;
  color: #059669;
}

:root.light-theme .status-badge.update {
  background: rgba(245, 158, 11, 0.1);
  border-color: #f59e0b;
  color: #d97706;
}

:root.light-theme .security-scan {
  background: #f9fafb;
  border-top-color: #e5e7eb;
}

:root.light-theme .modal {
  background: #ffffff;
  border-color: #e5e7eb;
}

:root.light-theme .modal-header {
  border-bottom-color: #f3f4f6;
}

:root.light-theme .modal-header h3 {
  color: #1e293b;
}

:root.light-theme .modal-footer {
  border-top-color: #e5e7eb;
}

:root.light-theme .install-input {
  background: #f9fafb;
  border-color: #e5e7eb;
  color: #1e293b;
}

:root.light-theme .quick-skill-item {
  background: #f9fafb;
  border-color: #e5e7eb;
}

:root.light-theme .quick-skill-item:hover {
  border-color: #2563eb;
  background: rgba(37, 99, 235, 0.05);
}

:root.light-theme .loading-text {
  color: #9ca3af;
}
</style>
