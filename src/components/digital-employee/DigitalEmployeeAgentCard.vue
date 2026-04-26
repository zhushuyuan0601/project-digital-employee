<template>
  <div class="agent-card glass-card-hover">
    <div class="agent-header">
      <div class="agent-avatar" :style="{ background: getGradientStyle(member.gradient) }">
        <img :src="member.icon" :alt="member.name" />
      </div>
      <div class="agent-info">
        <h4 class="agent-name">{{ member.name }}</h4>
        <p class="agent-title">{{ member.title }}</p>
      </div>
    </div>

    <div class="agent-stats">
      <div v-for="(value, key) in member.stats" :key="key" class="stat-item">
        <p class="stat-value mono">{{ value }}</p>
        <p class="stat-label">{{ key }}</p>
      </div>
    </div>

    <div class="agent-status">
      <div class="status-dot"></div>
      <span>{{ member.status === 'offline' ? 'Offline' : 'Active' }}</span>
    </div>

    <div class="agent-task">
      <span class="task-label">当前:</span>
      <span class="task-value">{{ member.task }}</span>
    </div>

    <div v-if="member.todayOutputs.length" class="agent-outputs">
      <p class="outputs-title">今日产出 ({{ member.todayOutputs.length }})</p>
      <div class="outputs-list">
        <a
          v-for="output in member.todayOutputs"
          :key="`${output.name}-${output.date}`"
          :href="output.url"
          target="_blank"
          rel="noopener noreferrer"
          class="output-tag"
        >
          {{ getTypeEmoji(output.type) }} {{ output.name.slice(0, 6) }}...
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface OutputRecord {
  name: string
  date: string
  person: string
  type: string
  url?: string
}

interface TeamMemberCard {
  id: string
  name: string
  title: string
  icon: string
  status: string
  gradient: string
  stats: Record<string, number | string>
  task: string
  todayOutputs: OutputRecord[]
}

defineProps<{
  member: TeamMemberCard
}>()

function getGradientStyle(gradientClass: string): string {
  const gradientMap: Record<string, string> = {
    'from-indigo-400 to-purple-500': 'linear-gradient(135deg, #818cf8, #a855f7)',
    'from-green-400 to-cyan-500': 'linear-gradient(135deg, #4ade80, #06b6d4)',
    'from-pink-400 to-rose-500': 'linear-gradient(135deg, #f472b6, #f43f5e)',
    'from-yellow-400 to-orange-500': 'linear-gradient(135deg, #facc15, #f97316)',
    'from-red-400 to-pink-500': 'linear-gradient(135deg, #f87171, #ec4899)',
    'from-gray-400 to-gray-500': 'linear-gradient(135deg, #9ca3af, #6b7280)'
  }
  return gradientMap[gradientClass] || gradientMap['from-gray-400 to-gray-500']
}

function getTypeEmoji(type: string): string {
  const emojis: Record<string, string> = {
    code: '💻',
    doc: '📄',
    report: '📊'
  }
  return emojis[type] || '📁'
}
</script>
