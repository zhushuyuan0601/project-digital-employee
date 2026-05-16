import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore, type UserRole } from '@/stores/auth'
import { routes } from '@/router/routes'

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const authStore = useAuthStore()
  authStore.restoreSession()

  if (to.meta.public) {
    if (to.path === '/login' && authStore.isAuthenticated) {
      return '/task-board'
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
    return '/task-board'
  }

  return true
})

export default router
