<template>
  <div class="task-center">
    <!-- 顶部标题 -->
    <div class="task-center__header">
      <div class="task-center__title">
        <h1><i class="fas fa-tasks"></i> 任务中心</h1>
        <p>多 Agent 协作管理平台</p>
      </div>
      <div class="header-actions">
        <div class="ai-status" :class="`status--${aiStatus}`">
          <span class="status-dot"></span>
          <span class="status-label">
            {{ aiStatusText }}
          </span>
        </div>
        <button class="btn btn-success btn-sm" @click="handleConnectAll" :disabled="gatewayStore.allConnected">
          <i class="fas fa-link"></i>
          <span>全连</span>
        </button>
        <button class="btn btn-danger btn-sm" @click="handleDisconnectAll" :disabled="!gatewayStore.anyConnected">
          <i class="fas fa-unlink"></i>
          <span>全断</span>
        </button>
      </div>
    </div>

    <!-- 左右布局主体 -->
    <div class="task-center__main">
      <!-- 左侧：Agent 协作群 + 任务下达 -->
      <div class="task-center__left">
        <!-- 群聊窗口 -->
        <div class="chat-section">
          <div class="chat-header">
            <span class="chat-title"><i class="fas fa-comments"></i> Agent 协作群</span>
            <span class="chat-members"><i class="fas fa-users"></i> {{ agentsStore.agents.length }}</span>
          </div>
          <div class="chat-body" ref="chatRef">
            <!-- 欢迎消息 -->
            <div class="chat-welcome">
              <div class="welcome-bubble">
                <p><i class="fas fa-hand-sparkles"></i> 欢迎使用 Agent 协作群！</p>
                <p>小呦、研发工程师、产品经理、研究员已加入群聊</p>
                <p>在下方输入任务，小呦 会协调分配给各位成员</p>
              </div>
            </div>

            <!-- 聊天记录 -->
            <div
              v-for="msg in chatMessages"
              :key="msg.id"
              class="chat-message"
              :class="{ 'self': msg.isSelf, 'system': msg.isSystem }"
            >
              <div v-if="!msg.isSystem" class="message-avatar">
                <img :src="getAgentIcon(msg.agentId || '')" :alt="msg.sender" />
              </div>
              <div class="message-content">
                <div v-if="!msg.isSystem" class="message-header">
                  <span class="message-sender">{{ msg.sender }}</span>
                  <span class="message-time">{{ formatTime(msg.timestamp) }}</span>
                </div>
                <div class="message-bubble" :class="`bubble--${msg.type}`">
                  <span v-if="msg.mention" class="mention">{{ msg.mention }}</span>
                  {{ msg.content }}
                </div>
              </div>
            </div>

            <!-- 正在输入提示 -->
            <div v-if="typingAgent" class="chat-typing">
              <span class="typing-avatar">
                <img :src="getAgentIcon(typingAgent)" :alt="getAgentName(typingAgent)" />
              </span>
              <span class="typing-text">{{ getAgentName(typingAgent) }} 正在输入...</span>
            </div>
          </div>
        </div>

        <!-- 任务输入区域 -->
        <div class="task-input-section">
          <div class="section-title">
            <i class="fas fa-edit"></i>
            <span>下达任务</span>
          </div>

          <!-- 场景选择 + 下发按钮 -->
          <div class="scenario-row">
            <span class="scenario-label">当前场景：</span>
            <el-select
              v-model="selectedScenario"
              size="small"
              @change="switchScenario"
              :disabled="simStore.isExecuting"
              class="scenario-select"
            >
              <el-option
                v-for="scenario in scenarios"
                :key="scenario.id"
                :label="scenario.name"
                :value="scenario.id"
              />
            </el-select>
            <button
              class="btn btn-primary btn-sm dispatch-btn"
              @click="startExecution"
              :disabled="simStore.isExecuting || !taskDescription.trim()"
            >
              下发
            </button>
          </div>

          <!-- 任务描述 -->
          <div class="task-description-row">
            <el-input
              v-model="taskDescription"
              placeholder="选择场景后自动显示任务描述..."
              type="textarea"
              :rows="2"
              readonly
              class="task-readonly-input"
            />
          </div>
        </div>
      </div>

      <!-- 右侧：Agent 状态 + 执行过程 -->
      <div class="task-center__right">
        <!-- Agent 状态卡片 - 集成执行日志 -->
        <div class="task-center__agents">
          <div class="section-title">
            <i class="fas fa-robot"></i>
            <span>Agent 状态</span>
            <div class="section-actions">
              <button
                class="btn btn-danger btn-sm"
                @click="clearAgentStats"
                :disabled="simStore.isExecuting"
              >
                <i class="fas fa-trash-alt"></i>
                <span>清空统计</span>
              </button>
            </div>
          </div>
          <div class="agents-grid">
            <AgentCard
              v-for="agent in agentsStore.agents"
              :key="agent.id"
              :agent="agent"
              :logs="getAgentLogs(agent.id)"
              @click="showAgentDetail(agent.id)"
            />
          </div>
        </div>

        <!-- 任务进度条 -->
        <div v-if="simStore.isExecuting || simStore.status === 'completed'" class="task-center__progress">
          <div class="execution-progress">
            <div class="progress-header">
              <span class="progress-title">任务进度</span>
              <span class="progress-value">{{ simStore.progress }}%</span>
            </div>

            <!-- 阶段指示器 -->
            <div class="phase-indicator" v-if="simStore.subTasks.length > 0">
              <div class="phase-item" :class="getPhaseClass(0)">
                <span class="phase-icon"><i class="fas fa-clipboard-list"></i></span>
                <span class="phase-name">项目统筹</span>
                <span class="phase-dot"></span>
              </div>
              <div class="phase-item" :class="getPhaseClass(1)">
                <span class="phase-icon"><i class="fas fa-search"></i></span>
                <span class="phase-name">竞品分析</span>
                <span class="phase-dot"></span>
              </div>
              <div class="phase-item" :class="getPhaseClass(2)">
                <span class="phase-icon"><i class="fas fa-pen-fancy"></i></span>
                <span class="phase-name">产品设计</span>
                <span class="phase-dot"></span>
              </div>
              <div class="phase-item" :class="getPhaseClass(3)">
                <span class="phase-icon"><i class="fas fa-laptop-code"></i></span>
                <span class="phase-name">技术开发</span>
                <span class="phase-dot"></span>
              </div>
            </div>

            <el-progress :percentage="simStore.progress" :stroke-width="6" :show-text="false" />
          </div>

          <!-- 控制按钮 -->
          <div class="progress-controls" v-if="simStore.isExecuting || simStore.isPaused">
            <button
              v-if="!simStore.isPaused"
              class="btn btn-secondary btn-sm"
              @click="simStore.pause"
            >
              <i class="fas fa-pause"></i> 暂停
            </button>
            <button
              v-else
              class="btn btn-secondary btn-sm"
              @click="simStore.resume"
            >
              <i class="fas fa-play"></i> 继续
            </button>
            <button class="btn btn-danger btn-sm" @click="simStore.cancel">
              <i class="fas fa-stop"></i> 取消
            </button>
          </div>
        </div>

        <!-- 完成状态 -->
        <div v-if="simStore.status === 'completed'" class="task-center__complete">
          <div class="complete-card">
            <div class="complete-icon"><i class="fas fa-check-circle"></i></div>
            <h3>任务完成!</h3>
            <p>{{ simStore.currentTask?.title }}</p>
            <div class="complete-stats">
              <div class="stat">
                <span class="stat-label">总步骤</span>
                <span class="stat-value">{{ simStore.subTasks.length }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">完成</span>
                <span class="stat-value">{{ simStore.completedSteps }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">日志</span>
                <span class="stat-value">{{ simStore.logs.length }}</span>
              </div>
            </div>
            <button class="btn btn-primary" @click="handleNewTask">
              新建任务
            </button>
          </div>
        </div>
      </div>

    </div>

    <!-- Agent 详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      :title="selectedAgent ? getAgentName(selectedAgent) + ' 的工作明细' : ''"
      width="700px"
      :close-on-click-modal="true"
      @close="handleDialogClose"
    >
      <div v-if="selectedAgent" class="agent-detail-dialog">
        <!-- Agent 信息 -->
        <div class="agent-info-header">
          <div class="agent-icon-large">
            <img :src="getAgentIcon(selectedAgent)" :alt="getAgentName(selectedAgent)" />
          </div>
          <div class="agent-info-text">
            <h4>{{ getAgentName(selectedAgent) }}</h4>
            <p>{{ getAgentDesc(selectedAgent) }}</p>
          </div>
          <el-tag :type="getAgentStatusType(selectedAgent)" size="large">
            {{ getAgentStatusText(selectedAgent) }}
          </el-tag>
        </div>

        <!-- 工作统计 -->
        <div class="work-stats">
          <div class="stat-card">
            <span class="stat-icon"><i class="fas fa-tasks"></i></span>
            <div class="stat-content">
              <span class="stat-label">总任务数</span>
              <span class="stat-value">{{ agentDetails?.totalTasks || 0 }}</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon"><i class="fas fa-check-circle"></i></span>
            <div class="stat-content">
              <span class="stat-label">已完成</span>
              <span class="stat-value">{{ agentDetails?.completedTasks || 0 }}</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon"><i class="fas fa-file-alt"></i></span>
            <div class="stat-content">
              <span class="stat-label">日志数</span>
              <span class="stat-value">{{ agentDetails?.logs.length || 0 }}</span>
            </div>
          </div>
        </div>

        <!-- 任务列表 -->
        <div class="detail-section">
          <h5><i class="fas fa-clipboard-list"></i> 负责任务</h5>
          <div class="agent-tasks-list">
            <div
              v-for="(task, index) in agentDetails?.tasks"
              :key="task.id"
              class="agent-task-item"
              :class="`agent-task-item--${task.status}`"
            >
              <span class="task-index">{{ index + 1 }}</span>
              <span class="task-desc">{{ task.description }}</span>
              <el-tag :type="getTaskStatusType(task.status)" size="small">
                {{ getTaskStatusText(task.status) }}
              </el-tag>
            </div>
            <div v-if="!agentDetails?.tasks || agentDetails.tasks.length === 0" class="empty-tip">
              暂无负责任务
            </div>
          </div>
        </div>

        <!-- 产出文件 -->
        <div class="detail-section">
          <h5><i class="fas fa-folder-open"></i> 产出文件</h5>
          <div class="agent-files-list">
            <div
              v-for="file in agentDetails?.files"
              :key="file.fileName"
              class="agent-file-item"
            >
              <span class="file-icon"><i class="fas fa-file"></i></span>
              <span class="file-name">{{ file.fileName }}</span>
              <a :href="file.path" target="_blank" class="file-link">
                <button class="btn btn-primary btn-sm">查看</button>
              </a>
            </div>
            <div v-if="!agentDetails?.files || agentDetails.files.length === 0" class="empty-tip">
              暂无产出文件
            </div>
          </div>
        </div>

        <!-- 执行日志 -->
        <div class="detail-section">
          <h5><i class="fas fa-scroll"></i> 执行日志</h5>
          <div class="agent-logs-list">
            <div
              v-for="log in agentDetails?.logs"
              :key="log.id"
              class="agent-log-item"
              :class="`agent-log-item--${log.type}`"
            >
              <span class="log-time">{{ formatTime(log.timestamp) }}</span>
              <span class="log-message">{{ log.message }}</span>
            </div>
            <div v-if="!agentDetails?.logs || agentDetails.logs.length === 0" class="empty-tip">
              暂无执行日志
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { useAgentsStore } from '@/stores/agents'
import { useSimulationStore } from '@/stores/simulation'
import { useTaskGatewayStore } from '@/stores/taskGateway'
import { AGENT_CONFIG } from '@/simulation'
import AgentCard from '@/components/AgentCard.vue'

const agentsStore = useAgentsStore()
const simStore = useSimulationStore()
const gatewayStore = useTaskGatewayStore()

// AI 连接状态
const aiStatus = ref<'connected' | 'disconnected' | 'error'>('connected')
const aiStatusText = computed(() => {
  if (gatewayStore.allConnected) return '所有 Agent 已连接'
  if (gatewayStore.anyConnected) return '部分 Agent 已连接'
  return '未连接 Gateway'
})

// 显示 AI 配置
function showAiConfig() {
  if (aiStatus.value === 'connected') {
    aiStatus.value = 'disconnected'
  } else {
    gatewayStore.connectAll()
    aiStatus.value = 'connected'
  }
}

// 全连
const handleConnectAll = () => {
  gatewayStore.connectAll()
  aiStatus.value = 'connected'
}

// 全断
const handleDisconnectAll = () => {
  gatewayStore.disconnectAll()
  aiStatus.value = 'disconnected'
}

// 状态
const taskDescription = ref('')
const showDetailDialog = ref(false)
const selectedAgent = ref<string | null>(null)
const chatRef = ref<HTMLElement | null>(null)

// 群聊消息
interface ChatMessage {
  id: string
  agentId?: string
  sender: string
  content: string
  timestamp: number
  type: 'info' | 'success' | 'warning' | 'error' | 'system'
  isSelf?: boolean
  isSystem?: boolean
  mention?: string
}

const chatMessages = ref<ChatMessage[]>([])
const typingAgent = ref<string | null>(null)

// 场景配置
const scenarios = [
  { id: 'unicom_ai_cs', name: '📱 开发智能客服系统', description: '联通 AI 智能客服 H5 应用' },
  { id: 'unicom_ai_ringtone', name: '🎵 联通 AI 彩铃产品升级', description: '对标天翼智铃产品' }
]

const selectedScenario = ref('unicom_ai_ringtone')

// 切换场景
function switchScenario(scenarioId: string) {
  selectedScenario.value = scenarioId
  simStore.setScenario(scenarioId)
  // 切换场景时清空日志
  simStore.clearLogs()
  // 更新任务描述为场景对应的内容
  updateTaskDescription()
}

// 场景对应的任务描述
const SCENARIO_TASKS: Record<string, string> = {
  unicom_ai_cs: '开发联通智能客服 H5 应用，包括智能问答、业务办理、投诉建议等功能模块',
  unicom_ai_ringtone: '联通 AI 彩铃产品升级（对标天翼智铃），进行竞品分析 → 产品设计 → 内测开发全流程'
}

// 更新任务描述
function updateTaskDescription() {
  taskDescription.value = SCENARIO_TASKS[selectedScenario.value] || ''
}

// 初始化任务描述
updateTaskDescription()

// 计算属性 - 获取选中 Agent 的工作明细
const agentDetails = computed(() => {
  if (!selectedAgent.value) return null
  return simStore.getAgentWorkDetails(selectedAgent.value)
})

// 获取指定 Agent 的日志
const getAgentLogs = (agentId: string) => {
  return simStore.logs.filter(log => log.agentId === agentId)
}

// 添加群聊消息
function addChatMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>) {
  const msg: ChatMessage = {
    ...message,
    id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    timestamp: Date.now()
  }
  chatMessages.value.push(msg)
  // 自动滚动到底部
  nextTick(() => {
    if (chatRef.value) {
      chatRef.value.scrollTop = chatRef.value.scrollHeight
    }
  })
}

// 发送群聊消息（模拟 Agent 在群里说话）
function sendAgentChatMessage(agentId: string, content: string, mention?: string) {
  const agent = AGENT_CONFIG[agentId]
  addChatMessage({
    agentId,
    sender: agent?.name || agentId,
    content,
    type: 'info',
    mention
  })
}

// 开始执行任务
const startExecution = async () => {
  const desc = taskDescription.value
  const isRingtoneScenario = simStore.currentScenario === 'unicom_ai_ringtone'

  // 添加用户发送的消息到群聊
  addChatMessage({
    sender: '我',
    content: desc,
    type: 'info',
    isSelf: true
  })

  // 小呦 在群里接收任务并@大家
  setTimeout(() => {
    sendAgentChatMessage('xiaomu', '收到任务！我来协调分配一下', '')
  }, 500)

  setTimeout(() => {
    addChatMessage({
      agentId: 'xiaomu',
      sender: '小呦',
      content: isRingtoneScenario ? '本次任务对标天翼智铃，进行联通 AI 彩铃产品升级：先竞品分析 → 再产品设计 → 内测开发 → 最后测试验收' : '本次任务按照标准产品开发流程执行：先调研 → 再设计 → 开发 → 最后测试验收',
      type: 'info',
      mention: ''
    })
  }, 1500)

  // 各阶段负责人确认
  setTimeout(() => {
    sendAgentChatMessage('xiaoyan', isRingtoneScenario ? '收到！我立即开始搜集天翼智铃的官方发布材料和产品数据 📡' : '明白！我先做市场调研和竞品分析，为产品设计提供依据 🔍', '')
  }, 2500)

  setTimeout(() => {
    sendAgentChatMessage('xiaochan', isRingtoneScenario ? '好的！等研究员的竞品分析报告完成后，我基于差距分析设计联通智铃产品方案 📋' : '好的！等研究员的竞品分析完成后，我基于调研结果进行产品设计 📋', '')
  }, 3500)

  setTimeout(() => {
    sendAgentChatMessage('xiaokai', isRingtoneScenario ? '收到！等 PRD 文档完成后，我开发联通智铃 H5 内测 v2.0，实现小鸿智能体和一键生成能力 💻' : '收到！等 PRD 文档完成后，我基于需求进行技术开发 💻', '')
  }, 4500)

  setTimeout(() => {
    sendAgentChatMessage('xiaoce', isRingtoneScenario ? '收到！等研发工程师完成 H5 内测后，我进行功能测试和验收验证 🛡️' : '收到！等研发工程师完成开发后，我进行功能测试验收 🛡️', '')
  }, 5500)

  setTimeout(() => {
    sendAgentChatMessage('xiaomu', '大家按顺序来，每个阶段完成后在群里同步 👍', '')
  }, 6500)

  // 开始执行任务
  const title = desc.slice(0, 20) + (desc.length > 20 ? '...' : '')
  await simStore.executeTask(title, desc)

  // 任务完成后在群里通知
  if (simStore.status === 'completed') {
    setTimeout(() => {
      sendAgentChatMessage('xiaomu', '任务全部完成！大家辛苦了！', '@所有人')
    }, 1000)

    setTimeout(() => {
      addChatMessage({
        agentId: 'xiaomu',
        sender: '小呦',
        content: `本次任务共产生 ${simStore.generatedFiles.length} 个产出文件，请在各自的工作明细中查看`,
        type: 'success'
      })
    }, 2000)
  }
}

// 监听日志变化，模拟群聊互动
watch(() => simStore.logs.length, (newVal, oldVal) => {
  if (newVal > oldVal) {
    const latestLog = simStore.logs[simStore.logs.length - 1]
    if (latestLog && !latestLog.message.includes('━')) {
      // 将关键日志转换为群聊消息
      if (latestLog.message.includes('开始执行')) {
        sendAgentChatMessage(latestLog.agentId, '我开始干活了！', '')
      } else if (latestLog.message.includes('完成') && latestLog.agentId !== 'xiaomu') {
        // Agent 完成时，汇总该 Agent 的所有产出文件
        const agentFiles = simStore.generatedFiles.filter(f => f.agentId === latestLog.agentId)
        if (agentFiles.length > 0) {
          const fileList = agentFiles.map(f => `[文件] ${f.fileName}`).join('\n')
          sendAgentChatMessage(
            latestLog.agentId,
            `我的任务完成了！\n\n产出文件：\n${fileList}`,
            ''
          )
        } else {
          sendAgentChatMessage(latestLog.agentId, '我的任务完成了！', '')
        }
      } else if (latestLog.message.includes('产出文件')) {
        // 不单独发送文件消息，而是在完成时统一发送
      }
    }
  }
})

const showAgentDetail = (agentId: string) => {
  selectedAgent.value = agentId
  showDetailDialog.value = true
}

const getAgentName = (agentId: string) => {
  return AGENT_CONFIG[agentId]?.name || agentId
}

const getAgentIcon = (agentId: string) => {
  return AGENT_CONFIG[agentId]?.icon || ''
}

const getAgentDesc = (agentId: string) => {
  return AGENT_CONFIG[agentId]?.description || ''
}

const getAgentStatusText = (agentId: string) => {
  const agent = agentsStore.agents.find(a => a.id === agentId)
  if (!agent) return '未知'
  const statusMap: Record<string, string> = {
    idle: '空闲',
    busy: '工作中',
    offline: '离线'
  }
  return statusMap[agent.status] || '未知'
}

const getAgentStatusType = (agentId: string) => {
  const agent = agentsStore.agents.find(a => a.id === agentId)
  if (!agent) return 'info'
  const typeMap: Record<string, string> = {
    idle: 'success',
    busy: 'warning',
    offline: 'info'
  }
  return typeMap[agent.status] || 'info'
}

const getTaskStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '待执行',
    in_progress: '执行中',
    completed: '已完成',
    failed: '失败'
  }
  return map[status] || status
}

const getTaskStatusType = (status: string) => {
  const map: Record<string, string> = {
    pending: 'info',
    in_progress: 'warning',
    completed: 'success',
    failed: 'danger'
  }
  return map[status] || 'info'
}

// 获取阶段样式
const getPhaseClass = (phaseIndex: number) => {
  if (simStore.subTasks.length === 0) return 'phase--pending'

  const task = simStore.subTasks[phaseIndex]
  if (!task) return 'phase--pending'

  // 小呦的任务（索引 0）初始就是 completed，需要根据进度判断
  if (phaseIndex === 0) {
    if (simStore.progress < 10) return 'phase--pending'
    return 'phase--completed'
  }

  // 其他任务根据实际状态判断
  if (task.status === 'completed') return 'phase--completed'
  if (task.status === 'in_progress') return 'phase--active'
  return 'phase--pending'
}

// 获取日志内容图标（返回 Font Awesome 类名）
const getContentIcon = (type: string, message: string) => {
  // 空日志或分隔线不显示图标
  if (message === '' || message.includes('━━')) return ''
  if (type === 'success') return 'fas fa-check-circle'
  if (type === 'error') return 'fas fa-times-circle'
  if (type === 'warning') return 'fas fa-exclamation-triangle'
  if (message.includes('小呦') || message.includes('小 u')) return 'fas fa-clipboard-list'
  if (message.includes('阶段一')) return 'fas fa-search'
  if (message.includes('阶段二')) return 'fas fa-edit'
  if (message.includes('阶段三')) return 'fas fa-laptop-code'
  if (message.includes('研发工程师')) return 'fas fa-laptop-code'
  if (message.includes('产品经理')) return 'fas fa-edit'
  if (message.includes('研究员')) return 'fas fa-search'
  return 'fas fa-info-circle'
}

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const handleNewTask = () => {
  taskDescription.value = ''
  chatMessages.value = []
  // 重置场景选择
  selectedScenario.value = 'unicom_ai_ringtone'
  simStore.setScenario('unicom_ai_ringtone')
  // 更新任务描述
  updateTaskDescription()
}

const handleDialogClose = () => {
  selectedAgent.value = null
}

// 清空 Agent 统计
const clearAgentStats = () => {
  agentsStore.clearCompletedTasks()
  ElMessage.success('已清空所有 Agent 的任务统计')
}

// 生命周期
onMounted(() => {
  agentsStore.initializeDefaultAgents()
  // 连接状态由 App.vue 统一管理，页面切换时不断开
  aiStatus.value = 'connected'
})
</script>

<style scoped>
.task-center {
  max-width: 1400px;
  margin: 0 auto;
  padding-bottom: 40px;
}

.task-center__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--grid-line);
}

.task-center__title h1 {
  font-size: 26px;
  font-weight: 700;
  color: var(--color-primary);
  letter-spacing: 0.05em;
  margin: 0;
}

.task-center__title p {
  font-size: 12px;
  color: var(--color-secondary);
  margin: 4px 0 0 0;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

/* 头部操作区 */
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* AI 状态 */
.ai-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 4px;
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: default;
  transition: all 0.2s;
}

.ai-status:hover {
  background: var(--bg-panel-hover);
  border-color: var(--border-strong);
}

.ai-status.status--connected {
  background: rgba(0, 255, 136, 0.1);
  border-color: var(--color-success);
  color: var(--color-success);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
  box-shadow: 0 0 6px rgba(128, 144, 168, 0.5);
}

.ai-status.status--connected .status-dot {
  background: var(--color-success);
  box-shadow: 0 0 6px rgba(0, 255, 136, 0.4);
  animation: pulse 2s ease-out-quart infinite;
}

.status-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.ai-status.status--connected .status-label {
  color: var(--color-success);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 左右布局主体 */
.task-center__main {
  display: grid;
  grid-template-columns: minmax(320px, 380px) 1fr;
  gap: 24px;
}

@media (max-width: 1024px) {
  .task-center__main {
    grid-template-columns: minmax(280px, 340px) 1fr;
    gap: 16px;
  }
}

@media (max-width: 768px) {
  .task-center__main {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

/* 左侧区域 */
.task-center__left {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 右侧区域 */
.task-center__right {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  position: relative;
  padding-left: 12px;
}

.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 18px;
  border-radius: 2px;
  background: linear-gradient(180deg, var(--color-primary), var(--color-secondary));
}

.section-title .title-icon {
  font-size: 20px;
}

.section-title span:last-child {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.section-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Agent 网格 */
.task-center__agents {
  margin-bottom: 24px;
}

.agents-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

/* 任务进度条区域 */
.task-center__progress {
  margin-top: 16px;
  margin-bottom: 20px;
}

.execution-progress {
  background: var(--bg-panel);
  border: 1px solid var(--grid-line);
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 进度条头部 */
.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.progress-value {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-primary);
  font-family: var(--font-mono);
}

/* 阶段指示器 */
.phase-indicator {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.phase-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px 4px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  transition: all 0.3s ease;
}

.phase-item:not(:last-child)::after {
  content: '';
  position: absolute;
  right: -3px;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 2px;
  background: rgba(255, 255, 255, 0.08);
  z-index: 1;
}

.phase-icon {
  font-size: 16px;
  filter: grayscale(0.5);
  transition: all 0.3s ease;
}

.phase-name {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 500;
  white-space: nowrap;
  transition: all 0.3s ease;
}

.phase-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

/* 阶段状态 */
.phase-item.phase--completed {
  background: rgba(0, 255, 136, 0.1);
  border-color: rgba(0, 255, 136, 0.3);
}

.phase-item.phase--completed .phase-icon {
  filter: grayscale(0);
  transform: scale(1.1);
}

.phase-item.phase--completed .phase-name {
  color: var(--color-success);
  font-weight: 600;
}

.phase-item.phase--completed .phase-dot {
  background: var(--color-success);
  box-shadow: 0 0 4px rgba(0, 255, 136, 0.4);
}

.phase-item.phase--completed:not(:last-child)::after {
  background: var(--color-success);
  box-shadow: 0 0 4px rgba(0, 255, 136, 0.5);
}

.phase-item.phase--active {
  background: rgba(0, 240, 255, 0.08);
  border-color: rgba(0, 240, 255, 0.3);
}

.phase-item.phase--active .phase-icon {
  filter: grayscale(0);
  animation: iconPulse 2s ease-out-quart infinite;
}

.phase-item.phase--active .phase-name {
  color: var(--color-primary);
  font-weight: 700;
}

.phase-item.phase--active .phase-dot {
  background: var(--color-primary);
  box-shadow: 0 0 6px rgba(0, 240, 255, 0.5);
  animation: dotPulse 2s ease-out-quart infinite;
}

.phase-item.phase--active:not(:last-child)::after {
  background: linear-gradient(90deg, var(--color-primary), rgba(0, 240, 255, 0.3));
}

.phase-item.phase--pending .phase-icon {
  filter: grayscale(0.8);
}

.phase-item.phase--pending .phase-name {
  color: rgba(255, 255, 255, 0.3);
}

@keyframes phasePulse {
  0%, 100% {
    box-shadow: 0 0 0 rgba(0, 240, 255, 0);
  }
  50% {
    box-shadow: 0 0 10px rgba(0, 240, 255, 0.15);
  }
}

@keyframes iconPulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.08);
  }
}

@keyframes dotPulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.1);
  }
}

/* 控制按钮区域 */
.progress-controls {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding-top: 12px;
  padding-bottom: 4px;
  border-top: 1px dashed rgba(255, 255, 255, 0.08);
  margin-top: 4px;
}

.progress-controls .btn {
  padding: 6px 14px;
  font-size: 12px;
}

/* 群聊区域 */
.chat-section {
  background: var(--bg-panel);
  border: 1px solid var(--grid-line);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 520px;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--grid-line);
}

.chat-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.chat-members {
  font-size: 12px;
  color: var(--text-muted);
}

.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--bg-base);
}

.chat-welcome {
  text-align: center;
  margin-bottom: 8px;
}

.welcome-bubble {
  display: inline-block;
  background: var(--bg-surface);
  border: 1px solid var(--grid-line);
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.welcome-bubble p {
  margin: 4px 0;
}

.chat-message {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 16px;
  animation: messageSlideIn 0.3s ease-out-quart;
  will-change: opacity, transform;
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.chat-message.self {
  flex-direction: row-reverse;
}

.chat-message.self .message-content {
  align-items: flex-end;
}

.chat-message.self .message-bubble {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  color: var(--text-inverse);
  border-bottom-right-radius: 4px;
  border-bottom-left-radius: 16px;
  border: none;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.2);
}

.chat-message.self .message-sender {
  color: var(--color-primary);
}

.chat-message.system {
  justify-content: center;
  margin: 20px 0;
}

.message-avatar {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--bg-surface);
  border: 2px solid var(--grid-line);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  transition: all 0.2s ease;
}

.chat-message:hover .message-avatar {
  border-color: var(--color-primary);
  transform: scale(1.05);
}

.message-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 320px;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-muted);
  padding: 0 4px;
}

.message-sender {
  font-weight: 700;
  color: var(--text-primary);
  font-size: 13px;
}

.message-time {
  font-size: 11px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

.message-bubble {
  background: var(--bg-surface);
  border: 1px solid var(--grid-line);
  border-radius: 16px;
  border-bottom-left-radius: 4px;
  padding: 12px 16px;
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.7;
  overflow-wrap: break-word;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  white-space: pre-line;
  transition: box-shadow 0.2s ease;
  will-change: box-shadow;
}

.chat-message:hover .message-bubble {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.message-bubble .mention {
  color: var(--color-primary);
  font-weight: 700;
  background: rgba(37, 99, 235, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
}

.chat-message.self .message-bubble .mention {
  color: var(--text-inverse);
  background: rgba(255, 255, 255, 0.2);
}

/* 系统消息样式 */
.chat-message.system .message-bubble {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(251, 191, 36, 0.1) 100%);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: var(--text-secondary);
  font-size: 13px;
  padding: 10px 20px;
  border-radius: 20px;
  font-style: italic;
  text-align: center;
  max-width: 400px;
}

.chat-typing {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  font-size: 13px;
  color: var(--text-muted);
  background: var(--bg-surface);
  border: 1px solid var(--grid-line);
  border-radius: 12px;
  margin-top: 8px;
  animation: typingPulse 1.5s ease-in-out infinite;
}

@keyframes typingPulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

.typing-avatar {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--grid-line);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.typing-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.typing-text {
  font-style: italic;
  display: flex;
  align-items: center;
  gap: 6px;
}

.typing-text::after {
  content: '';
  display: inline-block;
  width: 3px;
  height: 14px;
  background: var(--color-primary);
  animation: cursorBlink 1s infinite;
  border-radius: 1px;
}

@keyframes cursorBlink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* 任务输入区域 */
.task-input-section {
  background: var(--bg-panel);
  border: 1px solid var(--grid-line);
  border-radius: 12px;
  padding: 16px;
}

.task-input-section .section-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.task-input-section .section-title .title-icon {
  font-size: 18px;
}

.task-input-section .section-title span:not(.scenario-label):not(.title-icon) {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-secondary);
}

/* 场景选择行 */
.scenario-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding: 10px 14px;
  background: rgba(0, 240, 255, 0.05);
  border: 1px solid rgba(0, 240, 255, 0.15);
  border-radius: 8px;
  flex-wrap: nowrap;
  justify-content: flex-start;
}

.scenario-row .scenario-label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
  min-width: 72px;
}

.scenario-row .scenario-select {
  width: 220px;
  flex-shrink: 0;
}

.scenario-row .scenario-select :deep(.el-select__wrapper) {
  width: 100%;
}

.scenario-row .dispatch-btn {
  padding: 3px 12px;
  font-size: 12px;
  font-weight: 600;
  height: 28px;
  flex-shrink: 0;
  white-space: nowrap;
}

/* 任务描述行 */
.task-description-row {
  margin-top: 4px;
}

/* 只读任务输入框 */
.task-readonly-input :deep(.el-textarea__inner) {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border-default);
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.6;
  cursor: default;
  resize: none;
}

.task-readonly-input :deep(.el-textarea__inner)::placeholder {
  color: var(--text-tertiary);
  font-style: italic;
}

/* 下发按钮包装器 - 已废弃，保留以防兼容性问题 */
.dispatch-btn-wrapper {
  display: flex;
  justify-content: flex-end;
}

/* 执行区域 */
.task-center__execution {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 进度条 */
.logs-section {
  background: var(--bg-panel);
  border: 1px solid var(--grid-line);
  border-radius: 10px;
  padding: 16px;
}

.logs-section .section-title::before {
  background: linear-gradient(180deg, var(--color-success), var(--color-primary));
}

.log-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.pulse-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-warning);
  margin-right: 6px;
  animation: pulse 2s ease-out-quart infinite;
  box-shadow: 0 0 4px rgba(255, 170, 0, 0.4);
}

.logs-terminal {
  background: var(--bg-base);
  border: 1px solid var(--grid-line);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.5);
}

.terminal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--grid-line-dim);
}

.terminal-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.terminal-dots {
  display: flex;
  gap: 6px;
}

.terminal-dots .dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.terminal-dots .dot.red { background: var(--color-error); box-shadow: 0 0 4px rgba(255, 51, 102, 0.4); }
.terminal-dots .dot.yellow { background: var(--color-warning); box-shadow: 0 0 4px rgba(255, 170, 0, 0.4); }
.terminal-dots .dot.green { background: var(--color-success); box-shadow: 0 0 4px rgba(0, 255, 136, 0.4); }

.terminal-body {
  max-height: 400px;
  overflow-y: auto;
  scroll-behavior: smooth;
  padding: 12px;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.6;
  background: var(--terminal-black);
}

.terminal-line {
  display: flex;
  flex-direction: column;
  padding: 6px 10px;
  margin-bottom: 4px;
  background: var(--bg-surface);
  border-radius: 6px;
  border-left: 3px solid transparent;
}

.terminal-line.type--info {
  border-left-color: var(--color-primary);
}

.terminal-line.type--success {
  border-left-color: var(--color-success);
  background: rgba(0, 255, 136, 0.08);
}

.terminal-line.type--warning {
  border-left-color: var(--color-warning);
  background: rgba(255, 170, 0, 0.08);
}

.terminal-line.type--error {
  border-left-color: var(--color-error);
  background: rgba(255, 51, 102, 0.08);
}

/* 空日志行（用于分隔） */
.terminal-line.is-empty {
  padding: 2px 10px;
  background: transparent;
  border-left-color: transparent;
}

/* 分隔线样式 */
.terminal-line.is-divider {
  padding: 4px 10px;
  background: transparent;
  border-left-color: transparent;
}

.terminal-line.is-divider .line-content {
  color: var(--color-primary);
  font-weight: 700;
  letter-spacing: 0.05em;
}

.line-prefix {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.line-time {
  font-size: 10px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.line-agent {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--bg-panel);
  border: 1px solid var(--border-subtle);
  font-family: var(--font-mono);
  text-transform: uppercase;
}

.line-agent.agent--xiaomu { background: rgba(0, 255, 136, 0.15); color: var(--color-success); border-color: var(--color-success); }
.line-agent.agent--xiaokai { background: rgba(0, 240, 255, 0.15); color: var(--color-primary); border-color: var(--color-primary); }
.line-agent.agent--xiaochan { background: rgba(189, 0, 255, 0.15); color: var(--color-secondary); border-color: var(--color-secondary); }
.line-agent.agent--xiaoyan { background: rgba(255, 170, 0, 0.15); color: var(--color-warning); border-color: var(--color-warning); }
.line-agent.agent--xiaoce { background: rgba(255, 51, 102, 0.15); color: #ff3366; border-color: #ff3366; }

.line-content {
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.content-icon {
  flex-shrink: 0;
}

.terminal-empty {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-muted);
}

.terminal-empty .empty-icon {
  font-size: 36px;
  display: block;
  margin-bottom: 8px;
  opacity: 0.5;
}

.terminal-cursor {
  padding: 4px 10px;
}

.cursor-blink {
  color: var(--color-primary);
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* ===== 完成状态 ===== */
.task-center__complete {
  margin-top: 0;
}

.complete-card {
  background: var(--bg-panel);
  border: 1px solid var(--grid-line);
  border-radius: 10px;
  padding: 32px;
  text-align: center;
}

.complete-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.complete-card h3 {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-success);
  margin: 0 0 8px 0;
}

.complete-card p {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 20px 0;
}

.complete-stats {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 20px;
}

.complete-stats .stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.complete-stats .stat-label {
  font-size: 11px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.complete-stats .stat-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary);
  font-family: var(--font-mono);
}

/* Agent 详情对话框 */
.agent-detail-dialog {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.agent-info-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg-surface);
  border: 1px solid var(--grid-line);
  border-radius: 10px;
}

.agent-icon-large {
  font-size: 40px;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(0, 240, 255, 0.1) 0%, rgba(189, 0, 255, 0.05) 100%);
  border: 1px solid rgba(0, 240, 255, 0.2);
  border-radius: 10px;
  overflow: hidden;
}

.agent-icon-large img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.agent-info-text {
  flex: 1;
}

.agent-info-text h4 {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px 0;
}

.agent-info-text p {
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 0;
}

.work-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.work-stats .stat-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: var(--bg-surface);
  border: 1px solid var(--grid-line);
  border-radius: 8px;
}

.stat-icon {
  font-size: 24px;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-content .stat-label {
  font-size: 10px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.stat-content .stat-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-primary);
  font-family: var(--font-mono);
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-section h5 {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--grid-line);
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.agent-tasks-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 160px;
  overflow-y: auto;
}

.agent-task-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: var(--bg-surface);
  border: 1px solid var(--grid-line-dim);
  border-radius: 6px;
  font-size: 12px;
}

.agent-task-item--in_progress {
  background: rgba(0, 240, 255, 0.08);
  border-color: rgba(0, 240, 255, 0.3);
}

.agent-task-item--completed {
  background: rgba(0, 255, 136, 0.05);
  border-color: rgba(0, 255, 136, 0.2);
}

.task-index {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--bg-panel);
  border: 1px solid var(--border-default);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  font-family: var(--font-mono);
  flex-shrink: 0;
}

.task-desc {
  flex: 1;
  color: var(--text-secondary);
}

.agent-logs-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 160px;
  overflow-y: auto;
}

.agent-log-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: var(--bg-surface);
  border: 1px solid var(--grid-line-dim);
  border-radius: 4px;
  font-size: 11px;
}

.agent-log-item--success {
  background: rgba(0, 255, 136, 0.08);
  border-color: rgba(0, 255, 136, 0.2);
}

.agent-log-item--warning {
  background: rgba(255, 170, 0, 0.08);
  border-color: rgba(255, 170, 0, 0.2);
}

.agent-log-item--error {
  background: rgba(255, 51, 102, 0.08);
  border-color: rgba(255, 51, 102, 0.2);
}

.agent-log-item .log-time {
  font-size: 10px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.agent-log-item .log-message {
  flex: 1;
  color: var(--text-secondary);
}

/* 产出文件列表 */
.agent-files-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 160px;
  overflow-y: auto;
}

.agent-file-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: var(--bg-surface);
  border: 1px solid var(--grid-line-dim);
  border-radius: 6px;
  font-size: 12px;
  transition: all 0.2s;
}

.agent-file-item:hover {
  background: rgba(0, 240, 255, 0.05);
  border-color: rgba(0, 240, 255, 0.2);
}

.agent-file-item .file-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.agent-file-item .file-name {
  flex: 1;
  color: var(--text-secondary);
  word-break: break-all;
}

.agent-file-item .file-link {
  text-decoration: none;
  flex-shrink: 0;
}

.empty-tip {
  text-align: center;
  color: var(--text-muted);
  padding: 16px;
  font-size: 12px;
}

/* Element Plus 对话框覆盖 */
:deep(.el-dialog) {
  background: var(--bg-surface-elevated);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-default);
}

:deep(.el-dialog__header) {
  border-bottom: 1px solid var(--grid-line);
}

:deep(.el-dialog__title) {
  color: var(--color-primary);
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

:deep(.el-dialog__body) {
  color: var(--text-secondary);
}

/* ========== 亮色主题样式 ========== */
:root.light-theme .task-center__header {
  border-bottom-color: var(--grid-line);
}

:root.light-theme .task-center__title h1 {
  color: var(--text-primary);
  font-weight: 800;
}

:root.light-theme .task-center__title p {
  color: var(--text-secondary);
}

:root.light-theme .section-title {
  color: var(--text-primary);
  font-weight: 700;
}

:root.light-theme .chat-section {
  background: var(--bg-surface);
  border-color: var(--grid-line);
}

:root.light-theme .chat-header {
  border-bottom-color: var(--bg-base);
}

:root.light-theme .chat-title {
  color: var(--text-primary);
  font-weight: 700;
}

:root.light-theme .chat-members {
  color: var(--text-secondary);
}

:root.light-theme .chat-body {
  background: var(--bg-base);
}

:root.light-theme .welcome-bubble {
  background: linear-gradient(135deg, var(--color-primary-bg) 0%, var(--color-secondary-bg) 100%);
  border-color: var(--grid-line);
  color: var(--text-secondary);
}

:root.light-theme .chat-message .message-bubble {
  background: var(--bg-surface);
  border-color: var(--grid-line);
  color: var(--text-primary);
}

:root.light-theme .chat-message.self .message-bubble {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  color: var(--text-on-primary);
}

:root.light-theme .message-sender {
  color: var(--text-primary);
}

:root.light-theme .message-time {
  color: var(--text-muted);
}

:root.light-theme .task-input-section {
  background: var(--bg-surface);
  border-color: var(--grid-line);
}

:root.light-theme .task-input-section .section-title span {
  color: var(--text-primary);
  font-weight: 600;
}

:root.light-theme .scenario-label {
  color: var(--text-tertiary);
}

:root.light-theme .scenario-row {
  background: var(--color-primary-bg);
  border-color: var(--color-primary-light);
}

/* ========== 飞书风格消息气泡 ========== */
:root.light-theme .chat-section {
  background: var(--bg-surface);
  border-color: var(--grid-line);
}

:root.light-theme .chat-header {
  border-bottom-color: var(--bg-base);
}

:root.light-theme .chat-title {
  color: var(--text-primary);
  font-weight: 600;
}

:root.light-theme .chat-members {
  color: var(--text-secondary);
}

:root.light-theme .chat-body {
  background: var(--bg-base);
}

:root.light-theme .welcome-bubble {
  background: var(--bg-surface);
  border-color: var(--grid-line);
  color: var(--text-secondary);
  border-radius: 16px;
  box-shadow: var(--shadow-sm);
}

:root.light-theme .chat-message .message-bubble {
  background: var(--bg-surface);
  border-color: var(--grid-line-dim);
  color: var(--text-primary);
  border-radius: 16px;
  border-bottom-left-radius: 4px;
  box-shadow: var(--shadow-sm);
}

:root.light-theme .chat-message.self .message-bubble {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  color: var(--text-on-primary);
  border-bottom-left-radius: 16px;
  border-bottom-right-radius: 4px;
  box-shadow: 0 2px 8px rgba(51, 112, 255, 0.2);
}

:root.light-theme .chat-message.system .message-bubble {
  background: var(--bg-base);
  color: var(--text-tertiary);
  border-radius: 8px;
}

:root.light-theme .message-sender {
  color: var(--text-primary);
  font-weight: 600;
}

:root.light-theme .message-time {
  color: var(--text-muted);
}

:root.light-theme .message-avatar {
  border-color: var(--grid-line-dim);
  box-shadow: var(--shadow-sm);
}

:root.light-theme .chat-typing {
  background: var(--bg-surface);
  border: 1px solid var(--grid-line);
  color: var(--text-tertiary);
  border-radius: 16px;
  padding: 8px 14px;
}

:root.light-theme .task-readonly-input :deep(.el-textarea__inner) {
  background: var(--bg-base);
  border-color: var(--grid-line);
  color: var(--text-secondary);
}

:root.light-theme .agents-grid {
  background: transparent;
}

:root.light-theme .agent-card {
  background: var(--bg-surface);
  border-color: var(--grid-line);
  box-shadow: var(--shadow-md);
}

:root.light-theme .agent-card__name {
  color: var(--text-primary);
  font-weight: 600;
}

:root.light-theme .agent-card__status {
  color: var(--text-secondary);
}

:root.light-theme .agent-card__logs {
  background: var(--bg-base);
  border-color: var(--bg-surface);
}

:root.light-theme .log-entry {
  color: var(--text-secondary);
}

:root.light-theme .execution-progress {
  background: var(--bg-surface);
  border-color: var(--grid-line);
  box-shadow: var(--shadow-sm);
}

:root.light-theme .progress-title {
  color: var(--text-primary);
  font-weight: 600;
}

:root.light-theme .progress-value {
  color: var(--color-primary);
  font-weight: 600;
}

:root.light-theme .phase-item {
  background: var(--bg-surface);
  border-color: var(--grid-line);
  color: var(--text-secondary);
}

:root.light-theme .phase-item.active {
  background: var(--color-primary-bg);
  border-color: var(--color-primary);
  color: var(--text-primary);
}

:root.light-theme .complete-card {
  background: var(--bg-surface);
  border-color: var(--grid-line);
  box-shadow: var(--shadow-md);
}

:root.light-theme .complete-card h3 {
  color: var(--color-success);
  font-weight: 600;
}

:root.light-theme .complete-card p {
  color: var(--text-secondary);
}

:root.light-theme .stat-label {
  color: var(--text-tertiary);
}

:root.light-theme .stat-value {
  color: var(--text-primary);
  font-weight: 600;
}

:root.light-theme .agent-info-header {
  background: var(--bg-base);
  border-color: var(--grid-line);
}

:root.light-theme .agent-info-text h4 {
  color: var(--text-primary);
  font-weight: 600;
}

:root.light-theme .agent-info-text p {
  color: var(--text-secondary);
}

:root.light-theme .work-stats .stat-card {
  background: var(--bg-surface);
  border-color: var(--grid-line);
  box-shadow: var(--shadow-sm);
}

:root.light-theme .detail-section h5 {
  color: var(--text-primary);
  font-weight: 600;
  border-bottom-color: var(--grid-line);
}

:root.light-theme .agent-task-item {
  background: var(--bg-surface);
  border-color: var(--grid-line);
  color: var(--text-secondary);
}

:root.light-theme .agent-task-item--in_progress {
  background: var(--color-primary-bg);
  border-color: var(--color-primary-light);
}

:root.light-theme .agent-task-item--completed {
  background: rgba(0, 179, 101, 0.06);
  border-color: #b3ebd1;
}

:root.light-theme .task-desc {
  color: var(--text-secondary);
}

:root.light-theme .agent-log-item {
  background: var(--bg-surface);
  border-color: var(--grid-line);
  color: var(--text-secondary);
}

:root.light-theme .agent-log-item--success {
  background: rgba(0, 179, 101, 0.08);
  border-color: #b3ebd1;
}

:root.light-theme .agent-log-item--warning {
  background: rgba(255, 122, 45, 0.08);
  border-color: #ffd8bf;
}

:root.light-theme .agent-log-item--error {
  background: rgba(255, 77, 79, 0.08);
  border-color: #ffc9c9;
}

:root.light-theme .log-time {
  color: var(--text-muted);
}

:root.light-theme .log-message {
  color: var(--text-secondary);
}

:root.light-theme .agent-file-item {
  background: var(--bg-surface);
  border-color: var(--grid-line);
}

:root.light-theme .agent-file-item .file-name {
  color: var(--text-secondary);
}

:root.light-theme .empty-tip {
  color: var(--text-muted);
}

:root.light-theme .terminal-header {
  background: var(--bg-base);
  border-bottom-color: var(--grid-line);
}

:root.light-theme .terminal-title {
  color: var(--text-secondary);
  font-weight: 600;
}

:root.light-theme .terminal-body {
  background: var(--bg-base);
}

:root.light-theme .terminal-line {
  background: var(--bg-surface);
  border-color: var(--grid-line);
  color: var(--text-secondary);
}

:root.light-theme :deep(.el-dialog) {
  background: var(--bg-surface);
  border-radius: 16px;
}

:root.light-theme :deep(.el-dialog__header) {
  border-bottom-color: var(--grid-line);
}

:root.light-theme :deep(.el-dialog__title) {
  color: var(--text-primary);
  font-weight: 600;
}

:root.light-theme :deep(.el-dialog__body) {
  color: var(--text-secondary);
}

/* ===== 减少动画偏好支持 ===== */
@media (prefers-reduced-motion: reduce) {
  .chat-message {
    animation: none;
  }

  .phase-item.phase--active {
    animation: none;
    box-shadow: 0 0 4px rgba(0, 240, 255, 0.3);
  }

  .phase-item.phase--active .phase-icon,
  .phase-item.phase--active .phase-dot {
    animation: none;
  }

  .ai-status.status--connected .status-dot {
    animation: none;
  }

  .chat-typing {
    animation: none;
  }

  .typing-text::after {
    animation: none;
    opacity: 1;
  }

  .cursor-blink {
    animation: none;
  }

  .message-bubble,
  .message-avatar {
    transition: none;
  }

  .chat-message:hover .message-avatar {
    transform: none;
  }
}

/* ===== 焦点状态 ===== */
.message-avatar:focus-visible,
.agent-file-item:focus-visible,
.phase-item:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.chat-message:focus-visible .message-bubble {
  box-shadow: 0 0 0 2px var(--color-primary);
}

/* ===== 性能优化：will-change ===== */
.chat-message,
.phase-item,
.message-avatar,
.agent-file-item {
  will-change: transform;
}

.phase-dot,
.status-dot {
  will-change: opacity;
}

/* ===== 响应式触摸目标 ===== */
@media (max-width: 768px) {
  .phase-item {
    min-height: 44px;
    padding: 8px 4px;
  }

  .agent-file-item {
    min-height: 44px;
    padding: 12px;
  }

  .progress-controls .btn {
    min-height: 44px;
    min-width: 80px;
  }
}

</style>
