<template>
  <el-dialog
    :model-value="visible"
    :title="isEdit ? '编辑风险' : '新增风险'"
    width="640px"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:visible', $event)"
    @close="resetForm"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="90px"
      label-position="right"
    >
      <el-form-item label="标题" prop="title">
        <el-input
          v-model="form.title"
          placeholder="请输入风险标题（≤100 字）"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="描述" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="4"
          placeholder="请详细描述风险（≤2000 字）"
          maxlength="2000"
          show-word-limit
        />
      </el-form-item>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="类别" prop="category">
            <el-select v-model="form.category" placeholder="选择风险类别" style="width: 100%;">
              <el-option
                v-for="item in categoryOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="责任人" prop="owner">
            <el-input v-model="form.owner" placeholder="请输入责任人" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="发生概率" prop="probability">
            <el-select v-model="form.probability" placeholder="1-5" style="width: 100%;">
              <el-option v-for="n in 5" :key="n" :label="`${n} - ${probabilityLabels[n - 1]}`" :value="n" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="影响程度" prop="impact">
            <el-select v-model="form.impact" placeholder="1-5" style="width: 100%;">
              <el-option v-for="n in 5" :key="n" :label="`${n} - ${probabilityLabels[n - 1]}`" :value="n" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="建议等级">
        <div style="display: flex; align-items: center; gap: 8px;">
          <RiskLevelBadge :level="computedLevel" />
          <span class="level-hint">（自动计算，可手动调高）</span>
        </div>
      </el-form-item>

      <el-form-item label="风险等级" prop="level">
        <el-select v-model="form.level" placeholder="选择风险等级" style="width: 100%;">
          <el-option value="critical" label="紧急" />
          <el-option value="high" label="高" />
          <el-option value="medium" label="中" />
          <el-option value="low" label="低" />
        </el-select>
      </el-form-item>

      <el-form-item v-if="!isEdit" label="状态" prop="status">
        <el-select v-model="form.status" placeholder="选择状态" style="width: 100%;">
          <el-option value="open" label="开放" />
          <el-option value="monitoring" label="监控中" />
        </el-select>
      </el-form-item>

      <el-form-item label="截止日期">
        <el-date-picker
          v-model="form.dueDate"
          type="date"
          placeholder="选择截止日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DDTHH:mm:ss[Z]"
          style="width: 100%;"
        />
      </el-form-item>

      <el-form-item label="缓解措施">
        <el-input
          v-model="form.mitigationPlan"
          type="textarea"
          :rows="3"
          placeholder="请输入缓解措施或应对计划（可选）"
          maxlength="2000"
          show-word-limit
        />
      </el-form-item>

      <el-form-item v-if="showResolution" label="解决说明" prop="resolution">
        <el-input
          v-model="form.resolution"
          type="textarea"
          :rows="3"
          placeholder="请输入解决说明"
          maxlength="2000"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="标签">
        <el-input
          v-model="tagInput"
          placeholder="输入标签后回车添加"
          @keyup.enter="addTag"
        >
          <template #append>
            <el-button @click="addTag">添加</el-button>
          </template>
        </el-input>
        <div class="tag-list">
          <el-tag
            v-for="tag in form.tags"
            :key="tag"
            closable
            size="small"
            class="tag-item"
            @close="removeTag(tag)"
          >
            {{ tag }}
          </el-tag>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        {{ isEdit ? '保存' : '登记' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { CATEGORY_LABELS, calculateRiskLevel, type RiskItem, type RiskLevel } from '@/types/risk'
import RiskLevelBadge from './RiskLevelBadge.vue'

const props = defineProps<{
  visible: boolean
  risk?: RiskItem | null
  submitting?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void
  (event: 'submit', data: Partial<RiskItem>): void
}>()

const formRef = ref<FormInstance>()
const tagInput = ref('')

const defaultForm = {
  title: '',
  description: '',
  category: 'technical' as RiskItem['category'],
  level: 'low' as RiskLevel,
  status: 'open' as RiskItem['status'],
  probability: 1 as RiskItem['probability'],
  impact: 1 as RiskItem['impact'],
  owner: '',
  dueDate: null as string | null,
  mitigationPlan: '',
  resolution: '',
  tags: [] as string[],
}

const form = ref({ ...defaultForm })

const isEdit = computed(() => !!props.risk)
const showResolution = computed(() => {
  if (!isEdit.value || !props.risk) return false
  return (form.value.status === 'closed' || form.value.status === 'accepted')
    && props.risk.status !== form.value.status
})

const computedLevel = computed(() =>
  calculateRiskLevel(form.value.probability, form.value.impact),
)

// Sync computed level to form level when probability/impact changes
watch([() => form.value.probability, () => form.value.impact], () => {
  const newLevel = computedLevel.value
  // Only auto-update if form level is lower than computed
  const levelOrder: Record<RiskLevel, number> = { critical: 4, high: 3, medium: 2, low: 1 }
  if (levelOrder[form.value.level] < levelOrder[newLevel]) {
    form.value.level = newLevel
  }
})

watch(() => props.visible, (val) => {
  if (val && props.risk) {
    form.value = {
      title: props.risk.title,
      description: props.risk.description,
      category: props.risk.category,
      level: props.risk.level,
      status: props.risk.status,
      probability: props.risk.probability,
      impact: props.risk.impact,
      owner: props.risk.owner,
      dueDate: props.risk.dueDate,
      mitigationPlan: props.risk.mitigationPlan,
      resolution: props.risk.resolution,
      tags: [...props.risk.tags],
    }
  } else if (val) {
    form.value = { ...defaultForm, tags: [] }
  }
})

const categoryOptions = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  value: value as RiskItem['category'],
  label,
}))

const probabilityLabels = ['极低', '低', '中', '高', '极高']

const rules: FormRules = {
  title: [
    { required: true, message: '请输入风险标题', trigger: 'blur' },
    { max: 100, message: '标题不超过 100 字', trigger: 'blur' },
  ],
  description: [
    { required: true, message: '请输入风险描述', trigger: 'blur' },
    { max: 2000, message: '描述不超过 2000 字', trigger: 'blur' },
  ],
  category: [{ required: true, message: '请选择风险类别', trigger: 'change' }],
  owner: [{ required: true, message: '请输入责任人', trigger: 'blur' }],
  resolution: [
    {
      required: true,
      message: '请填写解决说明',
      trigger: 'blur',
      validator: (_rule, value, callback) => {
        if (showResolution.value && !value) {
          callback(new Error('状态变更为关闭或接受时，解决说明必填'))
        } else {
          callback()
        }
      },
    },
  ],
}

function addTag() {
  const tag = tagInput.value.trim()
  if (tag && !form.value.tags.includes(tag)) {
    form.value.tags = [...form.value.tags, tag]
  }
  tagInput.value = ''
}

function removeTag(tag: string) {
  form.value.tags = form.value.tags.filter(t => t !== tag)
}

function resetForm() {
  formRef.value?.resetFields()
  tagInput.value = ''
}

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate()
  emit('submit', { ...form.value })
}
</script>

<style scoped>
.level-hint {
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.tag-item {
  margin: 0;
}
</style>
