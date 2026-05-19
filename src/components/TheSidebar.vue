<template>
  <aside :class="['app-sidebar', { 'app-sidebar--collapsed': collapsed }]">
    <div class="sidebar-rail">
      <div class="brand-mark__orb">U</div>

      <div class="rail-nav">
        <template v-for="section in filteredNavigationSections" :key="section.label">
          <router-link
            v-for="item in section.items"
            :key="item.to"
            :to="item.to"
            custom
            v-slot="{ navigate, isActive }"
          >
            <button
              type="button"
              :class="['rail-link', { 'is-active': isActive }]"
              :title="`${item.label}：${item.meta}`"
              :aria-label="item.label"
              @click="navigate"
            >
              <component :is="item.icon" />
            </button>
          </router-link>
        </template>
      </div>

      <div class="rail-actions">
        <button
          type="button"
          class="rail-link"
          :title="themeLabel"
          :aria-label="themeLabel"
          @click="toggleTheme"
        >
          <Sunny v-if="isLight" />
          <MoonNight v-else />
        </button>
        <span class="rail-status" :class="`rail-status--${connectionStatus}`" :title="statusText"></span>
        <button
          type="button"
          class="rail-link"
          :title="collapsed ? '展开菜单' : '收起菜单'"
          :aria-label="collapsed ? '展开菜单' : '收起菜单'"
          @click="emit('toggle-collapse')"
        >
          <Expand v-if="collapsed" />
          <Fold v-else />
        </button>
      </div>
    </div>

    <div class="sidebar-panel">
      <div class="brand-panel">
        <div class="brand-copy">
          <strong>数字员工运营平台</strong>
          <span>Desktop Operations Console</span>
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
          <button type="button" class="logout-btn" @click="logout">退出</button>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, Expand, Fold, MoonNight, Sunny } from '@element-plus/icons-vue'
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

defineProps<{
  collapsed?: boolean
}>()

const emit = defineEmits<{
  (event: 'toggle-collapse'): void
}>()

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
  top: 0;
  display: grid;
  grid-template-columns: 76px minmax(0, 232px);
  height: 100vh;
  min-height: 100vh;
  padding: 0;
  border-right: 1px solid var(--border-default);
  border-radius: 0;
  background: var(--bg-panel);
  box-shadow: none;
  width: 100%;
  min-width: 0;
  transition: grid-template-columns 0.22s ease;
}

.app-sidebar--collapsed {
  grid-template-columns: 76px 0;
}

.sidebar-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  padding: 18px 10px 14px;
  border-right: 1px solid var(--border-subtle);
  background:
    linear-gradient(180deg, #151d26, #101720);
}

.sidebar-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  background: var(--bg-panel);
}

.brand-mark__orb {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 11px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-cyan));
  color: white;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 800;
}

.rail-nav {
  display: grid;
  gap: 6px;
  width: 100%;
  margin-top: 22px;
}

.rail-actions {
  display: grid;
  justify-items: center;
  gap: 10px;
  width: 100%;
  margin-top: auto;
}

.rail-link {
  display: grid;
  place-items: center;
  width: 46px;
  height: 42px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: #8f9baa;
  transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease;
}

.rail-link:hover {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: #e7edf5;
}

.rail-link.is-active {
  border-color: rgba(106, 167, 255, 0.46);
  background: rgba(106, 167, 255, 0.14);
  color: #8ec0ff;
}

.rail-link :deep(svg) {
  width: 18px;
  height: 18px;
}

.rail-status {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--text-muted);
}

.rail-status--connected {
  background: var(--color-success);
  box-shadow: 0 0 0 7px color-mix(in oklab, var(--color-success) 13%, transparent);
}

.rail-status--connecting {
  background: var(--color-warning);
  box-shadow: 0 0 0 7px color-mix(in oklab, var(--color-warning) 14%, transparent);
}

.rail-status--disconnected {
  background: var(--color-error);
  box-shadow: 0 0 0 7px color-mix(in oklab, var(--color-error) 12%, transparent);
}

.brand-panel {
  display: grid;
  gap: 12px;
  padding: 18px 18px 14px;
  border-bottom: 1px solid var(--border-subtle);
}

.brand-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.brand-copy strong {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.15;
  color: var(--text-primary);
}

.brand-copy span {
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 10px;
  line-height: 1.35;
  text-transform: uppercase;
}

.nav-scroll {
  flex: 1;
  min-height: 0;
  padding: 16px 12px;
  overflow: auto;
}

.nav-section + .nav-section {
  margin-top: 18px;
}

.nav-section__label {
  margin: 0 0 8px;
  padding-left: 8px;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0;
  text-transform: uppercase;
}

.nav-link {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 48px;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  text-align: left;
  transition: all 0.2s ease;
}

.nav-link + .nav-link {
  margin-top: 4px;
}

.nav-link:hover {
  background: var(--bg-card);
  color: var(--text-primary);
}

.nav-link.is-active {
  background: color-mix(in oklab, var(--color-primary) 10%, var(--bg-card));
  border-color: color-mix(in oklab, var(--color-primary) 35%, var(--border-default));
  color: var(--color-primary);
  box-shadow: none;
}

.nav-link__arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.nav-link__arrow :deep(svg) {
  width: 13px;
  height: 13px;
}

.nav-link__body {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 3px;
}

.nav-link__title {
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
}

.nav-link__meta {
  color: var(--text-tertiary);
  font-size: 11px;
  line-height: 1.25;
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
  padding: 12px;
  border-top: 1px solid var(--border-subtle);
}

.sidebar-user {
  display: grid;
  gap: 2px;
  padding: 0 2px 10px;
  margin-bottom: 8px;
  border: 0;
  border-bottom: 1px solid var(--border-subtle);
  border-radius: 0;
  background: transparent;
}

.sidebar-user strong {
  color: var(--text-primary);
  font-size: 13px;
}

.sidebar-user span {
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0;
}

.sidebar-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 0;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 9px;
  border: 1px solid var(--border-subtle);
  border-radius: 7px;
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 11px;
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

.logout-btn {
  min-height: 30px;
  padding: 0 10px;
  border-radius: 7px;
  border: 1px solid var(--border-default);
  background: transparent;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.logout-btn:hover {
  color: var(--color-error);
  border-color: color-mix(in oklab, var(--color-error) 45%, var(--border-default));
}

@media (max-width: 1180px) {
  .app-sidebar {
    position: static;
    grid-template-columns: 76px minmax(0, 1fr);
    height: auto;
    min-height: auto;
    max-height: none;
    border-right: none;
    border-bottom: 1px solid var(--border-default);
  }

  .sidebar-rail {
    min-height: 100vh;
  }
}

@media (max-width: 620px) {
  .app-sidebar,
  .app-sidebar--collapsed {
    grid-template-columns: 64px 0;
  }

  .sidebar-rail {
    padding-left: 8px;
    padding-right: 8px;
  }

  .sidebar-panel {
    display: none;
  }
}
</style>
