import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { useAuthStore, type UserRole } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true, layout: 'blank' }
  },
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/ObservabilityCenter.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/team-output',
    name: 'team-output',
    component: () => import('@/views/TeamOutputCenter.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/task-center-2',
    name: 'task-center-2',
    component: () => import('@/views/TaskCenter2.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'operator'] as UserRole[] }
  },
  {
    path: '/agent-console',
    name: 'agent-console',
    component: () => import('@/views/AgentConsole.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'operator'] as UserRole[] }
  },
  {
    path: '/agent-market',
    name: 'agent-market',
    component: () => import('@/views/AgentMarket.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'operator'] as UserRole[] }
  },
  {
    path: '/configs',
    name: 'configs',
    component: () => import('@/views/Configs.vue'),
    meta: { requiresAuth: true, roles: ['admin'] as UserRole[] }
  },
  {
    path: '/mail-center',
    name: 'mail-center',
    component: () => import('@/views/MailCenter.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'operator'] as UserRole[] }
  },
  {
    path: '/automation',
    name: 'automation',
    component: () => import('@/views/AutomationIntegrationCenter.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'operator'] as UserRole[] }
  },
  {
    path: '/analysis',
    name: 'analysis',
    component: () => import('@/views/AnalysisWorkbench.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'operator'] as UserRole[] }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const authStore = useAuthStore()
  authStore.restoreSession()

  if (to.meta.public) {
    if (to.path === '/login' && authStore.isAuthenticated) {
      return '/dashboard'
    }
    return true
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return {
      path: '/login',
      query: { redirect: to.fullPath }
    }
  }

  const roles = to.meta.roles as UserRole[] | undefined
  if (roles && !authStore.hasAnyRole(roles)) {
    return '/dashboard'
  }

  return true
})

export default router
