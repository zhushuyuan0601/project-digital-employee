<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-brand">
        <div class="login-brand__mark">U</div>
        <div>
          <h1>OpenClaw Unicom</h1>
          <p>联通多 Agent 协作管理平台登录</p>
        </div>
      </div>

      <div class="login-tips">
        <span>`admin / admin123`</span>
        <span>`operator / operator123`</span>
        <span>`readonly / readonly123`</span>
      </div>

      <form class="login-form" @submit.prevent="handleLogin">
        <label class="login-field">
          <span>用户名</span>
          <input v-model="form.username" type="text" autocomplete="username" placeholder="admin" />
        </label>
        <label class="login-field">
          <span>密码</span>
          <input v-model="form.password" type="password" autocomplete="current-password" placeholder="请输入密码" />
        </label>
        <button type="submit" class="login-submit" :disabled="submitting">
          {{ submitting ? '登录中...' : '进入平台' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotification } from '@/composables/useNotification'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const notification = useNotification()

const submitting = ref(false)
const form = reactive({
  username: 'admin',
  password: 'admin123',
})

const handleLogin = async () => {
  if (submitting.value) return
  submitting.value = true

  try {
    await authStore.login(form.username, form.password)
    notification.success(`欢迎，${authStore.user?.displayName || form.username}`)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
    router.replace(redirect)
  } catch (error) {
    notification.error(error instanceof Error ? error.message : '登录失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(circle at top left, rgba(88, 166, 255, 0.14), transparent 35%),
    radial-gradient(circle at bottom right, rgba(163, 113, 247, 0.16), transparent 38%),
    var(--bg-base);
}

.login-card {
  width: min(440px, 100%);
  padding: 28px;
  border-radius: 18px;
  background: var(--bg-panel);
  border: 1px solid var(--border-default);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.22);
}

.login-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}

.login-brand__mark {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--color-primary), #a371f7);
  color: white;
  font-size: 22px;
  font-weight: 800;
}

.login-brand h1 {
  margin: 0;
  font-size: 24px;
}

.login-brand p {
  margin: 6px 0 0;
  color: var(--text-secondary);
}

.login-tips {
  display: grid;
  gap: 8px;
  margin-bottom: 20px;
  padding: 14px;
  border-radius: 12px;
  background: rgba(148, 163, 184, 0.08);
  color: var(--text-secondary);
  font-size: 13px;
}

.login-field {
  display: grid;
  gap: 8px;
}

.login-field + .login-field {
  margin-top: 14px;
}

.login-field span {
  color: var(--text-secondary);
  font-size: 13px;
}

.login-field input {
  width: 100%;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid var(--border-default);
  background: var(--bg-base);
  color: var(--text-primary);
}

.login-submit {
  width: 100%;
  margin-top: 20px;
  padding: 12px 14px;
  border: 0;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  color: white;
  font-weight: 700;
  cursor: pointer;
}

.login-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
