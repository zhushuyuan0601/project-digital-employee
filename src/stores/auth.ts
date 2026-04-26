import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export type UserRole = 'admin' | 'operator' | 'readonly'

export interface AuthUser {
  username: string
  displayName: string
  role: UserRole
}

const AUTH_STORAGE_KEY = 'unicom_auth_session'

const DEFAULT_USERS: Record<string, { password: string; displayName: string; role: UserRole }> = {
  admin: { password: 'admin123', displayName: '系统管理员', role: 'admin' },
  operator: { password: 'operator123', displayName: '平台操作员', role: 'operator' },
  readonly: { password: 'readonly123', displayName: '审计只读用户', role: 'readonly' },
}

function readStoredUser() {
  if (typeof localStorage === 'undefined') return null

  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    return raw ? JSON.parse(raw) as AuthUser : null
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(readStoredUser())
  const isAuthenticated = computed(() => !!user.value)

  function restoreSession() {
    user.value = readStoredUser()
  }

  async function login(username: string, password: string) {
    const normalized = username.trim().toLowerCase()
    const matched = DEFAULT_USERS[normalized]

    if (!matched || matched.password !== password) {
      throw new Error('用户名或密码错误')
    }

    user.value = {
      username: normalized,
      displayName: matched.displayName,
      role: matched.role,
    }

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user.value))
  }

  function logout() {
    user.value = null
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }

  function hasAnyRole(roles?: UserRole[]) {
    if (!roles || roles.length === 0) return isAuthenticated.value
    if (!user.value) return false
    return roles.includes(user.value.role)
  }

  return {
    user,
    isAuthenticated,
    restoreSession,
    login,
    logout,
    hasAnyRole,
  }
})
