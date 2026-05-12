<template>
  <el-badge
    :value="count"
    :hidden="count === 0"
    :max="99"
    type="danger"
    class="alert-badge"
  >
    <el-button :type="count > 0 ? 'danger' : 'default'" text @click="$emit('click')">
      <el-icon><BellFilled /></el-icon>
    </el-button>
  </el-badge>
</template>

<script setup lang="ts">
import { BellFilled } from '@element-plus/icons-vue'

defineProps<{
  count: number
}>()

defineEmits<{
  (event: 'click'): void
}>()
</script>

<style scoped>
.alert-badge :deep(.el-badge__content) {
  top: 2px;
  right: 2px;
}
</style>
