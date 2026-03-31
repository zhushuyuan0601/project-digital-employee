<template>
  <div class="task-detail">
    <!-- 任务信息 -->
    <div class="detail-section">
      <div class="section-header">
        <h3 class="section-title">📋 任务信息</h3>
      </div>

      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">状态</span>
          <el-select
            :model-value="task.status"
            size="small"
            class="status-select"
            @change="(val) => $emit('status-change', task.id, val)"
          >
            <el-option label="收件箱" value="inbox" />
            <el-option label="已分配" value="assigned" />
            <el-option label="进行中" value="in_progress" />
            <el-option label="审核中" value="review" />
            <el-option label="质量审核" value="quality_review" />
            <el-option label="已完成" value="done" />
          </el-select>
        </div>

        <div class="info-item">
          <span class="info-label">优先级</span>
          <el-tag
            :type="getPriorityType(task.priority)"
            size="small"
            class="priority-tag"
          >
            {{ getPriorityLabel(task.priority) }}
          </el-tag>
        </div>

        <div class="info-item">
          <span class="info-label">分配给</span>
          <div class="assignee-display">
            <span
              v-if="task.assigned_to"
              class="assignee-info"
            >
              <span
                class="assignee-dot"
                :style="{ backgroundColor: getAgentDisplay(task.assigned_to).color }"
              />
              {{ getAgentDisplay(task.assigned_to).displayName }}
            </span>
            <span v-else class="unassigned">未分配</span>
            <el-button
              size="small"
              text
              @click="showAssignDialog = true"
            >
              修改
            </el-button>
          </div>
        </div>

        <div class="info-item">
          <span class="info-label">项目</span>
          <span class="info-value">{{ task.project_name || '-' }}</span>
        </div>

        <div class="info-item">
          <span class="info-label">创建时间</span>
          <span class="info-value">{{ formatDateTime(task.created_at) }}</span>
        </div>

        <div v-if="task.due_date" class="info-item">
          <span class="info-label">截止日期</span>
          <span class="info-value">{{ formatDateTime(task.due_date) }}</span>
        </div>

        <div v-if="task.estimated_hours" class="info-item">
          <span class="info-label">预估工时</span>
          <span class="info-value">{{ task.estimated_hours }}h</span>
        </div>

        <div v-if="task.actual_hours" class="info-item">
          <span class="info-label">实际工时</span>
          <span class="info-value">{{ task.actual_hours }}h</span>
        </div>
      </div>

      <!-- 任务描述 -->
      <div v-if="task.description" class="task-description">
        <h4>📝 描述</h4>
        <p>{{ task.description }}</p>
      </div>

      <!-- 标签 -->
      <div v-if="task.tags?.length" class="task-tags">
        <h4>🏷️ 标签</h4>
        <div class="tag-list">
          <el-tag
            v-for="tag in task.tags"
            :key="tag"
            size="small"
            class="task-tag"
          >
            {{ tag }}
          </el-tag>
        </div>
      </div>
    </div>

    <!-- Agent 对话追踪 -->
    <div v-if="messages.length > 0" class="detail-section">
      <div class="section-header">
        <h3 class="section-title">💬 Agent 对话追踪</h3>
        <span class="message-count">{{ messages.length }} 条消息</span>
      </div>

      <div class="message-list">
        <div
          v-for="msg in displayMessages"
          :key="msg.id"
          class="message-item"
          :class="`type-${msg.message_type}`"
        >
          <div class="message-header">
            <div class="message-from">
              <span
                v-if="msg.from_agent !== 'human'"
                class="sender-avatar"
                :style="{ backgroundColor: getAgentDisplay(msg.from_agent).color + '20' }"
              >
                {{ getAgentDisplay(msg.from_agent).displayName.charAt(0) }}
              </span>
              <span v-else class="sender-avatar human">我</span>
              <span class="sender-name">
                {{ msg.from_agent === 'human' ? '我' : getAgentDisplay(msg.from_agent).displayName }}
              </span>
              <span v-if="msg.to_agent" class="message-arrow">→</span>
              <span v-if="msg.to_agent" class="receiver-name">
                {{ getAgentDisplay(msg.to_agent).displayName }}
              </span>
            </div>
            <span class="message-time">{{ formatTime(msg.created_at) }}</span>
          </div>
          <div class="message-content" v-html="renderMarkdown(msg.content)"></div>
        </div>
      </div>
    </div>

    <!-- 评论区域 -->
    <div class="detail-section">
      <div class="section-header">
        <h3 class="section-title">💭 评论</h3>
        <span class="comment-count">{{ comments.length }} 条评论</span>
      </div>

      <div class="comment-list">
        <div
          v-for="comment in comments"
          :key="comment.id"
          class="comment-item"
        >
          <div class="comment-header">
            <span class="comment-author">{{ comment.author }}</span>
            <span class="comment-time">{{ formatTime(comment.created_at) }}</span>
          </div>
          <div class="comment-content">{{ comment.content }}</div>
        </div>

        <div v-if="comments.length === 0" class="empty-comments">
          暂无评论
        </div>
      </div>
    </div>

    <!-- 分配对话框 -->
    <el-dialog
      v-model="showAssignDialog"
      title="分配任务"
      width="400px"
    >
      <el-select
        v-model="selectedAssignee"
        placeholder="选择 Agent"
        style="width: 100%"
      >
        <el-option
          v-for="agent in targetAgents"
          :key="agent.name"
          :label="agent.displayName"
          :value="agent.name"
        >
          <span class="agent-option">
            <span
              class="agent-dot"
              :style="{ backgroundColor: agent.color }"
            />
            {{ agent.displayName }} - {{ agent.role }}
          </span>
        </el-option>
      </el-select>
      <template #footer>
        <el-button @click="showAssignDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmAssign">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import MarkdownIt from 'markdown-it'
import type { Task, TaskComment, ChatMessage } from '@/types/task-board'
import { TARGET_AGENTS, PRIORITY_CONFIG } from '@/types/task-board'

const md = new MarkdownIt({ breaks: true, linkify: true })

interface Props {
  task: Task
  comments: TaskComment[]
  messages: ChatMessage[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'status-change': [taskId: number, status: string]
  'assign': [taskId: number, agentName: string]
}>()

// ========== State ==========
const showAssignDialog = ref(false)
const selectedAssignee = ref('')

// ========== Computed ==========
const displayMessages = computed(() => {
  // 显示最新的 20 条消息
  return [...props.messages].reverse().slice(0, 20)
})

// ========== Methods ==========
function getAgentDisplay(agentName: string) {
  return (
    TARGET_AGENTS.find(a => a.name === agentName) || {
      id: 'unknown',
      name: agentName,
      displayName: agentName,
      role: 'Agent',
      icon: '',
      color: '#909399',
    }
  )
}

function getPriorityType(priority: string): string {
  const typeMap: Record<string, string> = {
    low: 'success',
    medium: 'warning',
    high: 'danger',
    critical: 'danger',
  }
  return typeMap[priority] || 'info'
}

function getPriorityLabel(priority: string): string {
  return PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG]?.label || priority
}

function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function renderMarkdown(content: string): string {
  try {
    return md.render(content)
  } catch {
    return content
  }
}

function confirmAssign() {
  if (selectedAssignee.value) {
    emit('assign', props.task.id, selectedAssignee.value)
    showAssignDialog.value = false
  }
}
</script>

<style scoped lang="scss">
.task-detail {
  height: 100%;
  overflow-y: auto;
  padding: 0 4px;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(100, 100, 200, 0.2);
    border-radius: 2px;
  }
}

.detail-section {
  margin-bottom: 24px;
  padding: 16px;
  background: rgba(20, 20, 30, 0.4);
  border-radius: 12px;
  border: 1px solid rgba(100, 100, 200, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  .section-title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #c0c0d0;
  }

  .message-count,
  .comment-count {
    font-size: 11px;
    color: #888;
    padding: 2px 8px;
    background: rgba(100, 100, 200, 0.1);
    border-radius: 4px;
  }
}

// 信息网格
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;

  .info-label {
    font-size: 11px;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .info-value {
    font-size: 13px;
    color: #e0e0e0;
  }
}

.status-select {
  width: 120px;
}

.assignee-display {
  display: flex;
  align-items: center;
  gap: 8px;

  .assignee-info {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #e0e0e0;

    .assignee-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
  }

  .unassigned {
    font-size: 13px;
    color: #666;
    font-style: italic;
  }
}

// 任务描述
.task-description {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(100, 100, 200, 0.1);

  h4 {
    margin: 0 0 8px;
    font-size: 12px;
    color: #888;
  }

  p {
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
    color: #c0c0d0;
    white-space: pre-wrap;
  }
}

// 标签
.task-tags {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(100, 100, 200, 0.1);

  h4 {
    margin: 0 0 8px;
    font-size: 12px;
    color: #888;
  }

  .tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .task-tag {
    background: rgba(100, 100, 200, 0.1);
    border-color: rgba(100, 100, 200, 0.2);
    color: #a0a0c0;
  }
}

// 消息列表
.message-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 8px;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(100, 100, 200, 0.2);
    border-radius: 2px;
  }
}

.message-item {
  padding: 12px;
  background: rgba(30, 30, 40, 0.6);
  border-radius: 8px;
  border-left: 2px solid transparent;

  &.type-system {
    border-left-color: #ffaa00;
    background: rgba(255, 170, 0, 0.05);
  }

  &.type-handoff {
    border-left-color: #00d4ff;
    background: rgba(0, 212, 255, 0.05);
  }
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.message-from {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sender-avatar {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;

  &.human {
    background: rgba(0, 150, 255, 0.2);
    color: #0096ff;
  }
}

.sender-name {
  font-size: 12px;
  font-weight: 500;
  color: #c0c0d0;
}

.message-arrow {
  font-size: 11px;
  color: #666;
}

.receiver-name {
  font-size: 11px;
  color: #888;
}

.message-time {
  font-size: 10px;
  color: #666;
}

.message-content {
  font-size: 12px;
  line-height: 1.5;
  color: #d0d0d0;

  :deep(p) {
    margin: 0;
  }

  :deep(code) {
    background: rgba(100, 100, 100, 0.2);
    padding: 2px 4px;
    border-radius: 3px;
    font-family: monospace;
    font-size: 11px;
  }
}

// 评论列表
.comment-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.comment-item {
  padding: 12px;
  background: rgba(30, 30, 40, 0.6);
  border-radius: 8px;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.comment-author {
  font-size: 12px;
  font-weight: 500;
  color: #00d4ff;
}

.comment-time {
  font-size: 10px;
  color: #666;
}

.comment-content {
  font-size: 12px;
  line-height: 1.5;
  color: #c0c0d0;
}

.empty-comments {
  text-align: center;
  padding: 40px;
  color: #666;
  font-size: 13px;
}

// Agent 选项
.agent-option {
  display: flex;
  align-items: center;
  gap: 8px;

  .agent-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
}

// ========== 亮色主题 ==========
:root.light-theme .detail-section {
  background: #f8fafc;
  border-color: #e5e7eb;
}

:root.light-theme .section-header {
  .section-title {
    color: #1e293b;
  }

  .message-count,
  .comment-count {
    background: #e2e8f0;
    color: #64748b;
  }
}

:root.light-theme .info-item {
  .info-label {
    color: #64748b;
  }

  .info-value {
    color: #1e293b;
  }
}

:root.light-theme .assignee-display {
  .assignee-info {
    color: #1e293b;
  }

  .unassigned {
    color: #94a3b8;
  }
}

:root.light-theme .task-description {
  border-top-color: #e5e7eb;

  h4 {
    color: #64748b;
  }

  p {
    color: #334155;
  }
}

:root.light-theme .task-tags {
  border-top-color: #e5e7eb;

  h4 {
    color: #64748b;
  }

  .task-tag {
    background: #e2e8f0;
    border-color: #cbd5e1;
    color: #64748b;
  }
}

:root.light-theme .message-list {
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
  }
}

:root.light-theme .message-item {
  background: #ffffff;
  border-color: #e5e7eb;

  &.type-system {
    background: rgba(234, 179, 8, 0.05);
  }

  &.type-handoff {
    background: rgba(37, 99, 235, 0.05);
  }
}

:root.light-theme .sender-name {
  color: #1e293b;
}

:root.light-theme .message-arrow {
  color: #94a3b8;
}

:root.light-theme .receiver-name {
  color: #64748b;
}

:root.light-theme .message-time {
  color: #94a3b8;
}

:root.light-theme .message-content {
  color: #334155;

  :deep(code) {
    background: #e2e8f0;
  }
}

:root.light-theme .comment-list {
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
  }
}

:root.light-theme .comment-item {
  background: #ffffff;
  border-color: #e5e7eb;
}

:root.light-theme .comment-author {
  color: #2563eb;
}

:root.light-theme .comment-time {
  color: #94a3b8;
}

:root.light-theme .comment-content {
  color: #334155;
}

:root.light-theme .empty-comments {
  color: #94a3b8;
}
</style>
