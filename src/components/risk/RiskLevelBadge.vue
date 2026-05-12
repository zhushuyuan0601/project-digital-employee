<template>
  <el-tag
    :type="config.tagType"
    :effect="level === 'critical' ? 'dark' : 'plain'"
    :class="{ 'risk-level-badge--critical': level === 'critical' }"
    size="small"
  >
    {{ config.label }}
  </el-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { LEVEL_CONFIG_MAP, type RiskLevel } from '@/types/risk'

const props = defineProps<{
  level: RiskLevel
}>()

const config = computed(() => LEVEL_CONFIG_MAP[props.level])
</script>

<style scoped>
.risk-level-badge--critical {
  animation: critical-pulse 2s ease-in-out infinite;
}

@keyframes critical-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
</style>
