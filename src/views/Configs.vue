<template>
  <div class="configs-page">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">
          <span class="title-icon">⚡</span>
          CONFIGURATION FILES
        </h1>
        <span class="page-subtitle">管理系统配置文件</span>
      </div>
      <button class="btn btn-primary btn-sm" @click="refreshConfig">
        <span class="btn-icon">⟳</span>
        刷新
      </button>
    </div>

    <div class="config-tree">
      <div
        v-for="config in configs"
        :key="config.id"
        :class="['config-item', { expanded: config.expanded }]"
      >
        <div class="config-header" @click="toggleConfig(config)">
          <span class="config-icon">{{ config.icon }}</span>
          <span class="config-name">{{ config.name }}</span>
          <span class="config-path">{{ config.path }}</span>
          <span class="config-toggle">▼</span>
        </div>
        <div v-if="config.expanded" class="config-content">
          <pre class="config-code">{{ config.content }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const configs = ref([
  {
    id: 'openclaw',
    name: '主配置文件',
    path: '~/.openclaw/openclaw.json',
    icon: '⚙',
    expanded: true,
    content: `{
  "agents": {
    "defaults": {
      "model": {
        "primary": "alibaba/glm-5"
      },
      "workspace": "/Users/lihzz/.openclaw/workspace"
    },
    "list": [
      { "id": "main", "model": "alibaba/glm-5" },
      { "id": "ceo", "model": "alibaba/glm-5" },
      // ... more agents
    ]
  },
  "gateway": {
    "port": 18789,
    "mode": "local"
  }
}`
  },
  {
    id: 'openclaw-json',
    name: '配置备份',
    path: '~/.openclaw/openclaw.json.bak',
    icon: '📄',
    expanded: false,
    content: '// 配置备份文件...'
  }
])

const toggleConfig = (config) => {
  config.expanded = !config.expanded
}

const refreshConfig = () => {
  console.log('Refresh config')
  // TODO: 从 Gateway API 获取最新配置
}
</script>

<style scoped>
.configs-page {
  max-width: 1200px;
  margin: 0 auto;
}

/* ========== 页面头部 ========== */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--grid-line);
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.page-title {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.15em;
  margin: 0;
}

.title-icon {
  color: var(--color-primary);
  font-size: var(--text-3xl);
  text-shadow: var(--glow-primary);
}

.page-subtitle {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  letter-spacing: 0.05em;
}

/* ========== 配置树 ========== */
.config-tree {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.config-item {
  background: var(--bg-panel);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all var(--transition-base);
}

.config-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--color-primary-dim),
    transparent
  );
  opacity: 0.5;
}

.config-item:hover {
  border-color: var(--color-primary-dim);
  box-shadow: var(--shadow-md);
}

.config-item.expanded {
  border-color: var(--color-primary-dim);
}

.config-item.expanded::before {
  opacity: 1;
}

/* ========== 配置头部 ========== */
.config-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  cursor: pointer;
  user-select: none;
  transition: background var(--transition-fast);
}

.config-header:hover {
  background: var(--bg-panel-hover);
}

.config-icon {
  font-size: var(--text-xl);
  min-width: 32px;
  text-align: center;
  color: var(--color-primary);
}

.config-name {
  flex: 1;
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.config-path {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: 0.05em;
}

.config-toggle {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  transition: transform var(--transition-base);
}

.config-item.expanded .config-toggle {
  transform: rotate(180deg);
  color: var(--color-primary);
}

/* ========== 配置内容 ========== */
.config-content {
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-base);
}

.config-code {
  padding: var(--space-4);
  margin: 0;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: 1.6;
  color: var(--text-secondary);
  white-space: pre;
}

/* 语法高亮模拟 */
.config-code::-webkit-scrollbar {
  height: 8px;
}

.config-code::-webkit-scrollbar-track {
  background: var(--bg-surface);
}

.config-code::-webkit-scrollbar-thumb {
  background: var(--terminal-cyan);
  border-radius: var(--radius-none);
}

/* ========== 通用按钮样式 ========== */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 1px solid transparent;
  white-space: nowrap;
}

.btn-icon {
  font-size: 1.2em;
}

.btn-sm {
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-xs);
}

.btn-primary {
  background: var(--color-primary-bg);
  border-color: var(--color-primary-dim);
  color: var(--color-primary);
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary);
  color: var(--text-inverse);
  box-shadow: var(--glow-primary);
}

/* ========== 亮色主题样式 ========== */
:root.light-theme .config-group {
  background: #ffffff;
  border-color: #e5e7eb;
}

:root.light-theme .config-header {
  border-bottom-color: #f3f4f6;
}

:root.light-theme .config-title {
  color: #1e293b;
}

:root.light-theme .config-description {
  color: #64748b;
}

:root.light-theme .config-item {
  border-color: #f3f4f6;
}

:root.light-theme .config-label {
  color: #475569;
}

:root.light-theme .config-value {
  color: #1e293b;
}

:root.light-theme .config-item-description {
  color: #94a3b8;
}

:root.light-theme .btn-primary {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  border: none;
  color: #ffffff;
}

:root.light-theme .btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

:root.light-theme .config-code {
  background: #1f2937;
  border-color: #374151;
  color: #e5e7eb;
}

:root.light-theme .config-code::-webkit-scrollbar-track {
  background: #1f2937;
}

:root.light-theme .config-code::-webkit-scrollbar-thumb {
  background: #4b5563;
}
</style>
