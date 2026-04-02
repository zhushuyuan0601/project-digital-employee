import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * Mission Control 全局认证 Store
 * 管理 Mission Control 的登录状态，所有页面共享
 */
export const useMCAuthStore = defineStore('mcAuth', () => {
  // ========== State ==========
  const isAuthenticated = ref(false)
  const isAuthenticating = ref(false)
  const authError = ref<string | null>(null)
  const authKey = ref('')
  const lastAuthTime = ref<number | null>(null)

  // ========== Getters ==========
  const isLoggedIn = computed(() => isAuthenticated.value)
  const needsAuth = computed(() => !isAuthenticated.value)

  // ========== Actions ==========

  /**
   * 检查当前是否已认证
   */
  async function checkAuth(): Promise<boolean> {
    try {
      const response = await fetch('/mc-api/agents')
      isAuthenticated.value = response.ok
      if (response.ok) {
        authError.value = null
        lastAuthTime.value = Date.now()
      }
      return response.ok
    } catch (err) {
      isAuthenticated.value = false
      authError.value = '无法连接到 Mission Control 后端 (localhost:3100)'
      return false
    }
  }

  /**
   * 登录 Mission Control
   */
  async function login(username: string, password: string): Promise<boolean> {
    if (!username || !password) {
      authError.value = '请输入用户名和密码'
      return false
    }

    isAuthenticating.value = true
    authError.value = null

    try {
      // 调用登录接口
      const loginRes = await fetch('/mc-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username,
          password: password
        })
      })

      if (loginRes.ok) {
        isAuthenticated.value = true
        authKey.value = username
        lastAuthTime.value = Date.now()
        console.log('[MCAuth] 登录成功')
        return true
      } else {
        const error = await loginRes.text()
        authError.value = `认证失败: ${error || '请检查用户名和密码'}`
        isAuthenticated.value = false
        return false
      }
    } catch (err) {
      authError.value = `连接失败: 无法连接到后端 (${err})`
      isAuthenticated.value = false
      return false
    } finally {
      isAuthenticating.value = false
    }
  }

  /**
   * 登出
   */
  function logout() {
    isAuthenticated.value = false
    authKey.value = ''
    lastAuthTime.value = null
    authError.value = null
    console.log('[MCAuth] 已登出')
  }

  /**
   * 清除错误
   */
  function clearError() {
    authError.value = null
  }

  return {
    // State
    isAuthenticated,
    isAuthenticating,
    authError,
    authKey,
    lastAuthTime,

    // Getters
    isLoggedIn,
    needsAuth,

    // Actions
    checkAuth,
    login,
    logout,
    clearError,
  }
})
