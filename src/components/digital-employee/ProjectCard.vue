<template>
  <div class="project-card" :class="getStageCardClass(project.stage)">
    <div class="project-card__stripe"></div>

    <div class="project-card__header">
      <div class="project-card__icon">
        <span class="stage-emoji">{{ project.stageEmoji }}</span>
      </div>
      <div class="project-card__info">
        <h3 class="project-card__name" :title="project.name">{{ project.name }}</h3>
        <p class="project-card__desc line-clamp-2">{{ project.description }}</p>
      </div>
      <div class="project-card__stage">
        <span :class="['stage-badge', getStageBadgeClass(project.stage)]">
          <span class="stage-badge__dot"></span>
          {{ project.stageName }}
        </span>
        <a
          v-if="project.githubUrl"
          :href="project.githubUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="github-btn"
          title="GitHub 仓库"
        >
          <i class="fab fa-github"></i>
        </a>
      </div>
    </div>

    <div class="project-card__meta">
      <div class="meta-item">
        <span class="meta-label">进度</span>
        <span class="meta-value meta-value--primary">{{ project.progress }}%</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">负责人</span>
        <span class="meta-value">{{ project.leaderRole || project.leader || '未知' }}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">更新</span>
        <span class="meta-value">{{ project.lastUpdate || project.createDate || '-' }}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">任务</span>
        <span class="meta-value">{{ project.completedTasks || 0 }}/{{ project.totalTasks || 0 }}</span>
      </div>
    </div>

    <div class="project-card__progress">
      <div class="progress-bar">
        <div class="progress-bar__fill" :style="{ width: `${project.progress || 0}%` }"></div>
      </div>
    </div>

    <div class="project-card__body">
      <div v-if="project.progressList?.length" class="task-section">
        <div class="task-section__header task-section__header--success">
          <i class="fas fa-check-circle"></i>
          <span>已完成</span>
        </div>
        <div class="task-list">
          <div
            v-for="(item, idx) in project.progressList"
            :key="idx"
            class="task-item task-item--done"
            :title="item"
          >
            <span class="task-item__icon">✓</span>
            <span class="task-item__text">{{ item }}</span>
          </div>
        </div>
      </div>

      <div v-if="project.nextSteps?.length" class="task-section">
        <div class="task-section__header task-section__header--next">
          <i class="fas fa-bullseye"></i>
          <span>下一步</span>
        </div>
        <div class="task-list">
          <div
            v-for="(item, idx) in project.nextSteps"
            :key="idx"
            class="task-item task-item--next"
            :title="item"
          >
            <span class="task-item__icon task-item__icon--next">→</span>
            <span class="task-item__text task-item__text--next">{{ item }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="project.demoUrl || project.githubUrl" class="project-card__footer">
      <span class="footer-label">快速链接:</span>
      <a
        v-if="project.githubUrl"
        :href="project.githubUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="footer-link footer-link--github"
      >
        <i class="fab fa-github"></i>
        <span>GitHub</span>
      </a>
      <a
        v-if="project.demoUrl"
        :href="project.demoUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="footer-link footer-link--demo"
      >
        <i class="fas fa-play"></i>
        <span>Demo</span>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
interface ProjectRecord {
  id: string
  stage: string
  stageEmoji?: string
  stageName?: string
  name: string
  description?: string
  githubUrl?: string
  demoUrl?: string
  progress?: number
  leaderRole?: string
  leader?: string
  lastUpdate?: string
  createDate?: string
  completedTasks?: number
  totalTasks?: number
  progressList?: string[]
  nextSteps?: string[]
}

defineProps<{
  project: ProjectRecord
}>()

const getStageBadgeClass = (stage: string) => {
  const classMap: Record<string, string> = {
    idea: 'stage-badge--idea',
    analysis: 'stage-badge--analysis',
    'tech-assessment': 'stage-badge--tech-assessment',
    development: 'stage-badge--development',
    testing: 'stage-badge--testing',
    deployed: 'stage-badge--deployed',
    maintenance: 'stage-badge--maintenance',
    paused: 'stage-badge--paused',
    cancelled: 'stage-badge--cancelled'
  }
  return classMap[stage] || 'stage-badge--idea'
}

const getStageCardClass = (_stage: string) => ''
</script>
