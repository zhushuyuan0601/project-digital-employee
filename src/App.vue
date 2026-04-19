<template>
  <div class="app-shell">
    <div class="app-shell__glow app-shell__glow--left"></div>
    <div class="app-shell__glow app-shell__glow--right"></div>

    <div class="app-frame">
      <aside class="app-sidebar">
        <div class="brand-panel">
          <div class="brand-mark">
            <div class="brand-mark__orb">U</div>
            <div class="brand-copy">
              <strong>OpenClaw Unicom</strong>
              <span>多 Agent 协作管理平台</span>
            </div>
          </div>

          <p class="brand-description">
            以更轻盈的工作台视角查看协作、调度与运行状态，让复杂系统的信息层次更容易读懂。
          </p>
        </div>

        <div class="nav-scroll">
          <section
            v-for="section in navigationSections"
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
        </div>
      </aside>

      <main class="app-stage">
        <section class="stage-content">
          <router-view />
        </section>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, markRaw, onMounted, ref, watch } from 'vue'
import {
  ArrowRight,
  ChatLineRound,
  Coin,
  Collection,
  Connection,
  DataBoard,
  Document,
  Link,
  MagicStick,
  MoonNight,
  OfficeBuilding,
  Operation,
  Setting,
  Sunny,
  Timer,
  Tools,
  User,
  WarningFilled
} from '@element-plus/icons-vue'
import { useChatStore } from '@/stores/chat'
import { useMultiAgentChatStore } from '@/stores/multiAgentChat'
import { useThemeStore } from '@/stores/theme'
import { storeToRefs } from 'pinia'

const chatStore = useChatStore()
const multiAgentStore = useMultiAgentChatStore()
const themeStore = useThemeStore()

const { currentTheme, isLight } = storeToRefs(themeStore)
const chatRefs = storeToRefs(chatStore)

const connectionStatus = ref('disconnected')

const navigationSections = [
  {
    label: '核心工作台',
    items: [
      { to: '/dashboard', label: '系统仪表盘', meta: '总览与态势', icon: markRaw(DataBoard) },
      { to: '/agents', label: '团队成员', meta: '协作角色与状态', icon: markRaw(User) },
      { to: '/digital-employee', label: '数字员工监控中心', meta: '产出与项目跟踪', icon: markRaw(OfficeBuilding) },
      { to: '/task-center-2', label: '任务指挥中心 II', meta: '派发与执行流', icon: markRaw(Operation) },
      { to: '/chat', label: '团队对话', meta: '单聊工作流', icon: markRaw(ChatLineRound) },
      { to: '/group-chat', label: '群聊会话', meta: '多人协作频道', icon: markRaw(Connection) }
    ]
  },
  {
    label: '系统管理',
    items: [
      { to: '/logs', label: '行动日志', meta: '运行轨迹', icon: markRaw(Document) },
      { to: '/status', label: '系统状态', meta: '资源与健康度', icon: markRaw(Connection) },
      { to: '/tools', label: '工具箱', meta: '能力开关', icon: markRaw(Tools) },
      { to: '/configs', label: '系统配置', meta: '环境与参数', icon: markRaw(Setting) }
    ]
  },
  {
    label: '高级能力',
    items: [
      { to: '/skills', label: '技能中心', meta: '扩展能力管理', icon: markRaw(MagicStick) },
      { to: '/tokens', label: '成本追踪', meta: 'Token 与请求', icon: markRaw(Coin) },
      { to: '/memory', label: '内存图谱', meta: '知识与上下文', icon: markRaw(Collection) },
      { to: '/security', label: '安全审计', meta: '风险巡检', icon: markRaw(WarningFilled) },
      { to: '/cron', label: '定时任务', meta: '自动化调度', icon: markRaw(Timer) },
      { to: '/webhooks', label: 'Webhook 管理', meta: '外部联动', icon: markRaw(Link) }
    ]
  }
]

const statusText = computed(() => {
  const statusMap = {
    connected: '在线',
    connecting: '连接中',
    disconnected: '离线'
  }
  return statusMap[connectionStatus.value] || '未知'
})

const themeLabel = computed(() => (currentTheme.value === 'light' ? '浅色模式' : '深色模式'))

function toggleTheme() {
  themeStore.toggle()
}

watch(
  [chatRefs.isConnected, chatRefs.isConnecting],
  ([connected, connecting]) => {
    if (connecting) {
      connectionStatus.value = 'connecting'
      return
    }
    connectionStatus.value = connected ? 'connected' : 'disconnected'
  },
  { immediate: true }
)

let hasConnected = false

onMounted(() => {
  if (!hasConnected) {
    multiAgentStore.connectAll()
    hasConnected = true
  }
})
</script>

<style scoped>
.app-shell {
  position: relative;
  min-height: 100vh;
  padding: 20px;
  overflow: visible;
}

.app-shell__glow {
  position: absolute;
  inset: auto;
  width: 34rem;
  height: 34rem;
  border-radius: 50%;
  filter: blur(48px);
  pointer-events: none;
  opacity: 0.5;
}

.app-shell__glow--left {
  top: -12rem;
  left: -8rem;
  background:
    radial-gradient(circle, color-mix(in oklab, var(--color-primary) 24%, transparent) 0%, transparent 70%);
}

.app-shell__glow--right {
  right: -10rem;
  bottom: -16rem;
  background:
    radial-gradient(circle, color-mix(in oklab, var(--color-secondary) 28%, transparent) 0%, transparent 72%);
}

.app-frame {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 318px minmax(0, 1fr);
  align-items: start;
  gap: 18px;
  min-height: calc(100vh - 40px);
}

.app-sidebar {
  position: sticky;
  top: 20px;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 40px);
  padding: 22px 18px 18px;
  border: 1px solid var(--border-subtle);
  border-radius: 30px;
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--bg-surface) 92%, white 8%) 0%, var(--bg-panel) 100%);
  box-shadow: var(--shadow-lg);
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
  width: 3rem;
  height: 3rem;
  border-radius: 1.1rem;
  background:
    linear-gradient(145deg, color-mix(in oklab, var(--color-primary) 84%, white 16%) 0%, color-mix(in oklab, var(--color-secondary) 72%, white 28%) 100%);
  color: white;
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 800;
  box-shadow: 0 12px 24px color-mix(in oklab, var(--color-primary) 24%, transparent);
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

.brand-description {
  max-width: 26ch;
  margin: 0;
  color: var(--text-tertiary);
  font-size: 0.82rem;
  line-height: 1.62;
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
  color: var(--text-muted);
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
  padding: 12px;
  border: 1px solid transparent;
  border-radius: 22px;
  background: transparent;
  color: inherit;
  text-align: left;
  transition: transform var(--transition-base), background var(--transition-base), border-color var(--transition-base), box-shadow var(--transition-base);
}

.nav-link + .nav-link {
  margin-top: 6px;
}

.nav-link:hover {
  transform: translateY(-1px);
  background: color-mix(in oklab, var(--color-primary-bg) 54%, transparent);
  border-color: color-mix(in oklab, var(--color-primary) 14%, var(--border-subtle));
}

.nav-link.is-active {
  background:
    linear-gradient(135deg, color-mix(in oklab, var(--color-primary-bg) 78%, white 22%) 0%, color-mix(in oklab, var(--color-secondary) 8%, var(--bg-surface)) 100%);
  border-color: color-mix(in oklab, var(--color-primary) 20%, var(--border-default));
  box-shadow: 0 14px 30px color-mix(in oklab, var(--color-primary) 12%, transparent);
}

.nav-link__icon,
.nav-link__arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.nav-link__icon {
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 50%;
  background: color-mix(in oklab, var(--bg-surface) 72%, var(--color-primary-bg) 28%);
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
  background: color-mix(in oklab, var(--color-primary) 14%, transparent);
  color: var(--color-primary);
}

.sidebar-footer {
  padding: 18px 8px 4px;
  border-top: 1px solid var(--border-subtle);
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
  padding: 12px;
  border: 1px solid var(--border-subtle);
  border-radius: 22px;
  background: color-mix(in oklab, var(--bg-surface) 88%, transparent);
  color: inherit;
  transition: transform var(--transition-base), border-color var(--transition-base), box-shadow var(--transition-base);
}

.theme-toggle:hover {
  transform: translateY(-1px);
  border-color: color-mix(in oklab, var(--color-primary) 20%, var(--border-default));
  box-shadow: 0 12px 24px color-mix(in oklab, var(--color-primary) 10%, transparent);
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

.app-stage {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: calc(100vh - 40px);
  padding: 18px;
  border: 1px solid var(--border-subtle);
  border-radius: 34px;
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--bg-surface) 78%, white 22%) 0%, color-mix(in oklab, var(--bg-base) 92%, var(--bg-surface) 8%) 100%);
  box-shadow: var(--shadow-lg);
}

.stage-content {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 0;
}

@media (max-width: 1180px) {
  .app-frame {
    grid-template-columns: 1fr;
  }

  .app-sidebar {
    position: static;
    min-height: auto;
    max-height: none;
    gap: 18px;
  }

  .app-stage {
    height: auto;
    min-height: auto;
  }

  .nav-scroll {
    overflow: visible;
  }

  .nav-section {
    display: grid;
    gap: 8px;
  }
}

@media (max-width: 820px) {
  .app-shell {
    padding: 12px;
  }

  .app-frame {
    gap: 12px;
  }

  .app-sidebar,
  .app-stage {
    border-radius: 26px;
  }

}

@media (max-width: 620px) {
  .app-shell {
    padding: 10px;
  }

  .app-sidebar,
  .app-stage {
    padding: 14px;
    border-radius: 22px;
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

  .stage-content {
    padding-left: 0;
    padding-right: 0;
  }
}
</style>
