<template>
  <aside class="app-sidebar">
    <div class="brand-panel">
      <div class="brand-mark">
        <div class="brand-mark__orb">U</div>
        <div class="brand-copy">
          <strong>Digital Employee</strong>
          <span>联通多Agent 协作管理平台</span>
        </div>
      </div>
    </div>

    <div class="nav-scroll">
      <section
        v-for="section in filteredNavigationSections"
        :key="section.label"
        class="nav-section"
      >
        <p class="nav-section__label">{{ section.label }}</p>

        <router-link
          v-for="item in section.items"
          :key="item.to"
          :to="item.to"
          custom
          v-slot="{ navigate, isActive }"
        >
          <button
            type="button"
            :class="['nav-link', { 'is-active': isActive }]"
            @click="navigate"
          >
            <span class="nav-link__icon">
              <component :is="item.icon" />
            </span>
            <span class="nav-link__body">
              <span class="nav-link__title">{{ item.label }}</span>
              <span class="nav-link__meta">{{ item.meta }}</span>
            </span>
            <span class="nav-link__arrow">
              <ArrowRight />
            </span>
          </button>
        </router-link>
      </section>
    </div>

    <div class="sidebar-footer">
      <div class="sidebar-user">
        <strong>{{ userLabel }}</strong>
        <span>{{ roleLabel }}</span>
      </div>

      <div class="sidebar-status">
        <div class="status-chip" :class="`status-chip--${connectionStatus}`">
          <span class="status-chip__dot"></span>
          <span>{{ statusText }}</span>
        </div>
        <span class="sidebar-build">Build v1.0.0</span>
      </div>

      <button type="button" class="theme-toggle" @click="toggleTheme">
        <span class="theme-toggle__icon">
          <Sunny v-if="isLight" />
          <MoonNight v-else />
        </span>
        <span class="theme-toggle__text">
          <strong>{{ themeLabel }}</strong>
          <span>点击切换界面模式</span>
        </span>
      </button>

      <button type="button" class="logout-btn" @click="logout">
        退出登录
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, MoonNight, Sunny } from '@element-plus/icons-vue'
import { storeToRefs } from 'pinia'
import { navigationSections } from '@/config/navigation'
import { useMultiAgentChatStore } from '@/stores/multiAgentChat'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useNotification } from '@/composables/useNotification'

const multiAgentStore = useMultiAgentChatStore()
const themeStore = useThemeStore()
const authStore = useAuthStore()
const notification = useNotification()
const router = useRouter()

const { currentTheme, isLight } = storeToRefs(themeStore)
const multiAgentRefs = storeToRefs(multiAgentStore)
const authRefs = storeToRefs(authStore)

const filteredNavigationSections = computed(() =>
  navigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => authStore.hasAnyRole(item.roles)),
    }))
    .filter((section) => section.items.length > 0)
)

const connectionStatus = computed(() => {
  const agentStates = Object.values(multiAgentRefs.agents.value || {})
  if (agentStates.some((agent) => agent.isConnecting)) {
    return 'connecting'
  }

  return multiAgentRefs.anyConnected.value ? 'connected' : 'disconnected'
})

const statusText = computed(() => {
  const statusMap = {
    connected: '在线',
    connecting: '连接中',
    disconnected: '离线',
  }
  return statusMap[connectionStatus.value] || '未知'
})

const themeLabel = computed(() => (currentTheme.value === 'light' ? '浅色模式' : '深色模式'))
const userLabel = computed(() => authRefs.user.value?.displayName || '未登录')
const roleLabel = computed(() => authRefs.user.value?.role || 'guest')

function toggleTheme() {
  themeStore.toggle()
}

function logout() {
  authStore.logout()
  notification.info('已退出登录')
  router.replace('/login')
}
</script>

<style scoped>
.app-sidebar {
  position: sticky;
  top: 12px;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 24px);
  padding: 20px 16px 16px;
  border-right: 1px solid var(--border-default);
  border-radius: 0;
  background: var(--bg-panel);
  box-shadow: none;
}

.brand-panel {
  display: grid;
  gap: 12px;
  padding: 4px 8px 18px;
}

.brand-mark {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-mark__orb {
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--color-primary), #a371f7);
  color: white;
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 800;
}

.brand-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-copy strong {
  font-family: var(--font-display);
  font-size: 1.12rem;
  font-weight: 700;
  line-height: 1.15;
  color: var(--text-primary);
}

.brand-copy span {
  color: var(--text-secondary);
  font-size: 0.82rem;
  line-height: 1.35;
}

.nav-scroll {
  flex: 1;
  min-height: 0;
  padding-right: 4px;
  overflow: auto;
}

.nav-section + .nav-section {
  margin-top: 20px;
}

.nav-section__label {
  margin: 0 0 10px;
  padding-left: 10px;
  color: var(--text-secondary);
  font-size: var(--text-xs);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.nav-link {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  text-align: left;
  transition: all 0.2s ease;
}

.nav-link + .nav-link {
  margin-top: 6px;
}

.nav-link:hover {
  background: var(--bg-card);
  color: var(--text-primary);
}

.nav-link.is-active {
  background: rgba(88, 166, 255, 0.1);
  border-color: rgba(var(--color-primary-rgb), 0.35);
  color: var(--color-primary);
  box-shadow: none;
}

.nav-link__icon,
.nav-link__arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.nav-link__icon {
  width: 2rem;
  height: 2rem;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
}

.nav-link.is-active .nav-link__icon {
  color: var(--color-primary);
}

.nav-link__icon :deep(svg),
.nav-link__arrow :deep(svg) {
  width: 1.08rem;
  height: 1.08rem;
}

.nav-link__body {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 3px;
}

.nav-link__title {
  color: var(--text-primary);
  font-size: var(--text-sm);
  font-weight: 600;
}

.nav-link__meta {
  color: var(--text-tertiary);
  font-size: 0.75rem;
}

.nav-link__arrow {
  width: 1.9rem;
  height: 1.9rem;
  border-radius: 50%;
  color: var(--text-muted);
}

.nav-link.is-active .nav-link__arrow {
  background: transparent;
  color: var(--color-primary);
}

.sidebar-footer {
  padding: 18px 8px 4px;
  border-top: 1px solid var(--border-subtle);
}

.sidebar-user {
  display: grid;
  gap: 2px;
  padding: 10px 12px;
  margin-bottom: 12px;
  border: 1px solid var(--border-default);
  border-radius: 10px;
  background: var(--bg-card);
}

.sidebar-user strong {
  color: var(--text-primary);
  font-size: 0.92rem;
}

.sidebar-user span {
  color: var(--text-secondary);
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.sidebar-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--bg-surface) 80%, var(--color-primary-bg) 20%);
  color: var(--text-secondary);
  font-size: var(--text-xs);
  font-weight: 600;
}

.status-chip__dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--text-muted);
}

.status-chip--connected .status-chip__dot {
  background: var(--color-success);
  box-shadow: 0 0 0 6px color-mix(in oklab, var(--color-success) 14%, transparent);
}

.status-chip--connecting .status-chip__dot {
  background: var(--color-warning);
  box-shadow: 0 0 0 6px color-mix(in oklab, var(--color-warning) 16%, transparent);
}

.status-chip--disconnected .status-chip__dot {
  background: var(--color-error);
  box-shadow: 0 0 0 6px color-mix(in oklab, var(--color-error) 12%, transparent);
}

.sidebar-build {
  color: var(--text-muted);
  font-size: 0.72rem;
}

.theme-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-card);
  color: inherit;
  transition: all 0.2s ease;
}

.theme-toggle:hover {
  border-color: var(--color-primary);
  box-shadow: none;
}

.theme-toggle__icon {
  display: grid;
  place-items: center;
  width: 2.6rem;
  height: 2.6rem;
  border-radius: 1rem;
  background: color-mix(in oklab, var(--color-primary-bg) 74%, var(--bg-surface) 26%);
  color: var(--color-primary);
}

.theme-toggle__icon :deep(svg) {
  width: 1.1rem;
  height: 1.1rem;
}

.theme-toggle__text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.theme-toggle__text strong {
  color: var(--text-primary);
  font-size: var(--text-sm);
  font-weight: 600;
}

.theme-toggle__text span {
  color: var(--text-tertiary);
  font-size: 0.76rem;
}

.logout-btn {
  width: 100%;
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-default);
  background: transparent;
  color: var(--text-secondary);
  transition: all 0.2s ease;
}

.logout-btn:hover {
  color: var(--color-error);
  border-color: color-mix(in oklab, var(--color-error) 45%, var(--border-default));
}

@media (max-width: 1180px) {
  .app-sidebar {
    position: static;
    min-height: auto;
    max-height: none;
    gap: 18px;
    border-right: none;
    border-bottom: 1px solid var(--border-default);
  }

  .nav-scroll {
    overflow: visible;
  }

  .nav-section {
    display: grid;
    gap: 8px;
  }
}

@media (max-width: 620px) {
  .app-sidebar {
    padding: 12px;
  }

  .brand-panel,
  .sidebar-footer {
    padding-left: 0;
    padding-right: 0;
  }

  .nav-link {
    padding: 11px;
  }

  .nav-link__meta {
    display: none;
  }
}
</style>
