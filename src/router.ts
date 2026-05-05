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
    path: '/agents',
    redirect: { path: '/team-output', query: { tab: 'team' } }
  },
  {
    path: '/digital-employee',
    redirect: { path: '/team-output', query: { tab: 'projects' } }
  },
  {
    path: '/task-center-2',
    name: 'task-center-2',
    component: () => import('@/views/TaskCenter2.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'operator'] as UserRole[] }
  },
  {
    path: '/configs',
    name: 'configs',
    component: () => import('@/views/Configs.vue'),
    meta: { requiresAuth: true, roles: ['admin'] as UserRole[] }
  },
  {
    path: '/logs',
    redirect: { path: '/dashboard', query: { tab: 'events' } }
  },
  {
    path: '/status',
    redirect: { path: '/dashboard', query: { tab: 'health' } }
  },
  {
    path: '/capability',
    redirect: '/dashboard'
  },
  {
    path: '/chat',
    redirect: '/dashboard'
  },
  {
    path: '/automation',
    name: 'automation',
    component: () => import('@/views/AutomationIntegrationCenter.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'operator'] as UserRole[] }
  },
  {
    path: '/tools',
    redirect: '/dashboard'
  },
  {
    path: '/group-chat',
    name: 'group-chat',
    component: () => import('@/views/GroupChat.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'operator'] as UserRole[] }
  },
  {
    path: '/skills',
    redirect: '/dashboard'
  },
  {
    path: '/skills-old',
    redirect: '/dashboard'
  },
  {
    path: '/tokens',
    redirect: '/dashboard'
  },
  {
    path: '/memory',
    redirect: '/dashboard'
  },
  {
    path: '/analysis',
    name: 'analysis',
    component: () => import('@/views/AnalysisWorkbench.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'operator'] as UserRole[] }
  },
  {
    path: '/security',
    name: 'security',
    component: () => import('@/views/Security.vue'),
    meta: { requiresAuth: true, roles: ['admin'] as UserRole[] }
  },
  {
    path: '/cron',
    redirect: { path: '/automation', query: { tab: 'cron' } }
  },
  {
    path: '/webhooks',
    redirect: { path: '/automation', query: { tab: 'webhooks' } }
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
