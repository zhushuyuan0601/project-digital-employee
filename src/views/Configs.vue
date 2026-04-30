<template>
  <div class="configs-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">系统配置</h1>
        <span class="page-subtitle">管理系统配置文件</span>
      </div>
      <button class="btn btn-primary" @click="refreshConfig">
        <i class="ri-refresh-line"></i>
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
          <i :class="config.icon"></i>
          <span class="config-name">{{ config.name }}</span>
          <span class="config-path">{{ config.path }}</span>
          <i class="ri-arrow-down-s-line config-toggle"></i>
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
    icon: 'ri-settings-3-line',
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
      { "id": "ceo", "model": "alibaba/glm-5" }
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
    icon: 'ri-file-copy-line',
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
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

/* 页面头部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px 0;
  flex-shrink: 0;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.page-subtitle {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 6px 0 0;
  display: block;
}

/* 配置树 */
.config-tree {
  padding: 16px 32px 32px;
  overflow: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 按钮 */
.btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  background: var(--color-primary);
  color: var(--text-inverse);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn:hover {
  background: var(--color-primary-dark);
}

.btn i {
  font-size: 14px;
}

/* 配置项 */
.config-item {
  background: var(--bg-panel);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.15s ease;
}

.config-item:hover {
  border-color: var(--color-primary-dim);
}

.config-item.expanded {
  border-color: var(--color-primary-dim);
}

/* 配置头部 */
.config-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s ease;
}

.config-header:hover {
  background: var(--bg-panel-hover);
}

.config-header i {
  color: var(--text-tertiary);
  font-size: 16px;
  width: 18px;
  text-align: center;
}

.config-name {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.config-path {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-tertiary);
}

.config-toggle {
  font-size: 16px;
  color: var(--text-tertiary);
  transition: transform 0.15s ease;
}

.config-item.expanded .config-toggle {
  transform: rotate(180deg);
  color: var(--color-primary);
}

/* 配置内容 */
.config-content {
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-base);
}

.config-code {
  padding: 16px;
  margin: 0;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary);
  white-space: pre;
}

.config-code::-webkit-scrollbar {
  height: 6px;
}

.config-code::-webkit-scrollbar-track {
  background: var(--bg-surface);
}

.config-code::-webkit-scrollbar-thumb {
  background: var(--border-default);
  border-radius: 3px;
}

@media (max-width: 768px) {
  .page-header {
    padding: 16px 20px 0;
  }

  .config-tree {
    padding: 12px 20px;
  }
}
</style>
