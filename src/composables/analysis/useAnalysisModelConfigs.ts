import { computed, ref, watch } from 'vue'

export interface ModelConfig {
  id: string
  name: string
  apiBase: string
  apiKey: string
  model: string
}

export interface ModelTestResult {
  ok: boolean
  ms?: number
  error?: string
  statusNote?: string
}

interface UseAnalysisModelConfigsOptions {
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
}

const STORAGE_KEY = 'analysis.modelConfigs'
const ACTIVE_KEY = 'analysis.activeConfigId'

export function useAnalysisModelConfigs(options: UseAnalysisModelConfigsOptions = {}) {
  const modelConfigs = ref<ModelConfig[]>([])
  const activeConfigId = ref('')
  const showConfigModal = ref(false)
  const editingConfig = ref<(Partial<ModelConfig> & { _isNew?: boolean }) | null>(null)
  const testing = ref(false)
  const testResult = ref<ModelTestResult | null>(null)

  const activeConfig = computed(() => modelConfigs.value.find((config) => config.id === activeConfigId.value) || null)

  function loadConfigs() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      modelConfigs.value = raw ? JSON.parse(raw) : []
    } catch {
      modelConfigs.value = []
    }
    activeConfigId.value = localStorage.getItem(ACTIVE_KEY) || ''
    if (activeConfigId.value && !modelConfigs.value.find((config) => config.id === activeConfigId.value)) {
      activeConfigId.value = ''
    }
  }

  function persistConfigs() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(modelConfigs.value))
    localStorage.setItem(ACTIVE_KEY, activeConfigId.value)
  }

  watch(modelConfigs, persistConfigs, { deep: true })
  watch(activeConfigId, persistConfigs)

  function applyActiveConfig() {
    persistConfigs()
  }

  function activateConfig(id: string) {
    activeConfigId.value = id
    options.onSuccess?.('已切换当前模型配置')
  }

  function inferProviderName(text: string) {
    const normalized = text.toLowerCase()
    if (normalized.includes('dashscope') || normalized.includes('qwen')) return 'DashScope'
    if (normalized.includes('deepseek')) return 'DeepSeek'
    if (normalized.includes('openai')) return 'OpenAI'
    if (normalized.includes('anthropic') || normalized.includes('claude')) return 'Anthropic'
    if (normalized.includes('localhost') || normalized.includes('127.0.0.1') || normalized.includes('local')) return 'Local'
    return 'OpenAI Compatible'
  }

  function openConfigModal() {
    showConfigModal.value = true
    editingConfig.value = null
    testResult.value = null
  }

  function closeConfigModal() {
    showConfigModal.value = false
    editingConfig.value = null
    testResult.value = null
  }

  function startNewConfig() {
    editingConfig.value = {
      id: '',
      name: '',
      apiBase: '',
      apiKey: '',
      model: 'gpt-4o-mini',
      _isNew: true,
    }
    testResult.value = null
  }

  function editConfig(config: ModelConfig) {
    editingConfig.value = { ...config, _isNew: false }
    testResult.value = null
  }

  function cancelEdit() {
    editingConfig.value = null
    testResult.value = null
  }

  function saveConfig() {
    if (!editingConfig.value) return
    const config = editingConfig.value
    if (!config.name?.trim()) {
      options.onError?.('请填写配置名称')
      return
    }

    if (config._isNew) {
      const newConfig: ModelConfig = {
        id: `mc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: config.name.trim(),
        apiBase: config.apiBase?.trim() || '',
        apiKey: config.apiKey?.trim() || '',
        model: config.model?.trim() || 'gpt-4o-mini',
      }
      modelConfigs.value.push(newConfig)
      activeConfigId.value = newConfig.id
    } else {
      const index = modelConfigs.value.findIndex((item) => item.id === config.id)
      if (index !== -1) {
        modelConfigs.value[index] = {
          id: config.id!,
          name: config.name.trim(),
          apiBase: config.apiBase?.trim() || '',
          apiKey: config.apiKey?.trim() || '',
          model: config.model?.trim() || 'gpt-4o-mini',
        }
      }
    }
    editingConfig.value = null
    testResult.value = null
    options.onSuccess?.('配置已保存')
  }

  function deleteConfig(id: string) {
    modelConfigs.value = modelConfigs.value.filter((config) => config.id !== id)
    if (activeConfigId.value === id) {
      activeConfigId.value = modelConfigs.value[0]?.id || ''
    }
    if (editingConfig.value?.id === id) {
      editingConfig.value = null
      testResult.value = null
    }
  }

  async function testConfig() {
    if (!editingConfig.value) return
    const { apiBase, apiKey } = editingConfig.value
    if (!apiBase?.trim()) {
      testResult.value = { ok: false, error: '请填写 API Base URL' }
      return
    }

    testing.value = true
    testResult.value = null
    try {
      const res = await fetch('/api/analysis/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_base: apiBase.trim(), api_key: apiKey?.trim() || '' }),
      })
      const text = await res.text()
      let data: any
      try {
        data = text ? JSON.parse(text) : {}
      } catch {
        testResult.value = { ok: false, error: text.slice(0, 120) || `HTTP ${res.status}` }
        return
      }
      if (data.ok) {
        const statusNote = data.status && data.status !== 200 ? ` (HTTP ${data.status})` : ''
        testResult.value = { ok: true, ms: data.ms, statusNote }
      } else {
        testResult.value = { ok: false, error: data.error || `HTTP ${res.status}` }
      }
    } catch (err) {
      testResult.value = { ok: false, error: (err as Error).message || '连接失败' }
    } finally {
      testing.value = false
    }
  }

  return {
    modelConfigs,
    activeConfigId,
    showConfigModal,
    editingConfig,
    testing,
    testResult,
    activeConfig,
    loadConfigs,
    applyActiveConfig,
    activateConfig,
    inferProviderName,
    openConfigModal,
    closeConfigModal,
    startNewConfig,
    editConfig,
    cancelEdit,
    saveConfig,
    deleteConfig,
    testConfig,
  }
}
