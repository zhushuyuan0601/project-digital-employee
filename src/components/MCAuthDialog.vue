<template>
  <el-dialog
    v-model="visible"
    title="Mission Control 登录"
    width="400px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
    class="mc-auth-dialog"
  >
    <div class="mc-auth-content">
      <div class="mc-auth-icon">🔐</div>
      <p class="mc-auth-desc">
        需要登录 Mission Control 后端才能继续使用<br/>
        <span class="mc-auth-url">http://localhost:3100</span>
      </p>

      <el-alert
        v-if="mcAuth.authError"
        :title="mcAuth.authError"
        type="error"
        :closable="false"
        class="mc-auth-error"
      />

      <el-form @submit.prevent="handleLogin">
        <el-form-item>
          <el-input
            v-model="form.username"
            placeholder="用户名"
            size="large"
            @keyup.enter="handleLogin"
          >
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            show-password
            size="large"
            @keyup.enter="handleLogin"
          >
            <template #prefix>
              <el-icon><Lock /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="mcAuth.isAuthenticating"
            @click="handleLogin"
            class="mc-auth-btn"
          >
            {{ mcAuth.isAuthenticating ? '登录中...' : '登录' }}
          </el-button>
        </el-form-item>
      </el-form>

      <p class="mc-auth-hint">
        默认账号: <code>admin</code> / <code>zhushuyuan93412</code>
      </p>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { useMCAuthStore } from '@/stores/mcAuth'

const mcAuth = useMCAuthStore()

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'success': []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const form = ref({
  username: '',
  password: ''
})

async function handleLogin() {
  if (!form.value.username || !form.value.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }

  const success = await mcAuth.login(form.value.username, form.value.password)
  if (success) {
    ElMessage.success('登录成功')
    visible.value = false
    emit('success')
  }
}

onMounted(() => {
  // 预填充默认值
  form.value.username = 'admin'
  form.value.password = 'zhushuyuan93412'
})
</script>

<style scoped lang="scss">
.mc-auth-content {
  text-align: center;
  padding: 20px;
}

.mc-auth-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.mc-auth-desc {
  color: #888;
  margin-bottom: 20px;
  line-height: 1.6;
}

.mc-auth-url {
  color: #00d4ff;
  font-family: monospace;
  font-size: 12px;
}

.mc-auth-error {
  margin-bottom: 16px;
  text-align: left;
}

.mc-auth-btn {
  width: 100%;
}

.mc-auth-hint {
  margin-top: 16px;
  font-size: 12px;
  color: #666;

  code {
    background: rgba(100, 100, 100, 0.2);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
  }
}
</style>
