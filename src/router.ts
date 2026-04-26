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
    component: () => import('@/views/Dashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/agents',
    name: 'agents',
    component: () => import('@/views/Agents.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/digital-employee',
    name: 'digital-employee',
    component: () => import('@/views/DigitalEmployee.vue'),
    meta: { requiresAuth: true }
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
    name: 'logs',
    component: () => import('@/views/Logs.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/status',
    name: 'status',
    component: () => import('@/views/Status.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/tools',
    name: 'tools',
    component: () => import('@/views/Tools.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'operator'] as UserRole[] }
  },
  {
    path: '/chat',
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
    name: 'skills',
    component: () => import('@/views/SkillsHub.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'operator'] as UserRole[] }
  },
  {
    path: '/skills-old',
    redirect: '/skills'
  },
  {
    path: '/tokens',
    name: 'tokens',
    component: () => import('@/views/Tokens.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/memory',
    name: 'memory',
    component: () => import('@/views/Memory.vue'),
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
    name: 'cron',
    component: () => import('@/views/Cron.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'operator'] as UserRole[] }
  },
  {
    path: '/webhooks',
    name: 'webhooks',
    component: () => import('@/views/Webhooks.vue'),
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
