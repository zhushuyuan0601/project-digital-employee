<template>
  <router-view v-if="isBlankLayout" />

  <div v-else class="app-shell">
    <div class="app-shell__glow app-shell__glow--left"></div>
    <div class="app-shell__glow app-shell__glow--right"></div>

    <div :class="['app-frame', { 'app-frame--sidebar-collapsed': sidebarCollapsed }]">
      <TheSidebar
        :collapsed="sidebarCollapsed"
        @toggle-collapse="toggleSidebar"
      />

      <main class="app-stage">
        <section class="stage-content">
          <router-view />
        </section>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import TheSidebar from '@/components/TheSidebar.vue'
import { useAppInit } from '@/composables/useAppInit'

const route = useRoute()
const { initializeApp } = useAppInit()
const isBlankLayout = computed(() => route.meta.layout === 'blank')
const sidebarCollapsed = ref(false)

function readSidebarCollapsed() {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem('app_sidebar_collapsed') === 'true'
}

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

onMounted(() => {
  sidebarCollapsed.value = readSidebarCollapsed()
  initializeApp()
})

watch(sidebarCollapsed, (value) => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem('app_sidebar_collapsed', String(value))
})
</script>

<style scoped>
.app-shell {
  position: relative;
  min-height: 100vh;
  padding: 12px;
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
  grid-template-columns: 280px minmax(0, 1fr);
  align-items: start;
  gap: 0;
  min-height: calc(100vh - 24px);
  transition: grid-template-columns 0.22s ease;
}

.app-frame--sidebar-collapsed {
  grid-template-columns: 72px minmax(0, 1fr);
}

.app-stage {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: calc(100vh - 24px);
  padding: 0;
  border: none;
  border-radius: 0;
  background: var(--bg-base);
  background-image: radial-gradient(circle at top right, rgba(88, 166, 255, 0.03), transparent 40%);
  box-shadow: none;
}

.stage-content {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
  background: inherit;
  padding: 0;
}

@media (max-width: 1180px) {
  .app-frame {
    grid-template-columns: 1fr;
  }

  .app-frame--sidebar-collapsed {
    grid-template-columns: 1fr;
  }

  .app-stage {
    height: auto;
    min-height: auto;
  }
}

@media (max-width: 820px) {
  .app-shell {
    padding: 8px;
  }

  .app-frame {
    gap: 0;
  }
}

@media (max-width: 620px) {
  .app-shell {
    padding: 4px;
  }

  .app-stage {
    padding: 12px;
  }

  .stage-content {
    padding-left: 0;
    padding-right: 0;
  }
}
</style>
