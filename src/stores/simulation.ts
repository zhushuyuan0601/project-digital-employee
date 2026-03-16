// AI 模型任务执行 Store - 模拟模式
// 场景：开发 AI 智能客服产品
// 小呦负责任务调度，产品经理输出 PRD/原型，研究员输出竞品分析，研发工程师输出技术文档和代码
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ExecutionLog } from '@/simulation/mockData'
import { AGENT_CONFIG } from '@/simulation'
import type { Task } from '@/types/task'
import { useAgentsStore } from './agents'

// 执行状态
export type SimulationStatus = 'idle' | 'executing' | 'completed' | 'error'

// 执行步骤
export interface ExecutionStep {
  id: string
  agentId: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  duration: number
  output?: string
}

// 产出物文件类型
interface Deliverable {
  name: string
  originPath: string
  filePath: string
  description: string
}

// 场景产出物定义（源文件在 origin 目录，目标移动到项目目录）
// 职位映射：xiaomu=项目管理，xiaokai=研发工程师，xiaochan=产品经理，xiaoyan=研究员
const SCENARIO_DELIVERABLES: Record<string, Record<string, Deliverable[]>> = {
  // 场景 1: 联通智能客服 H5 应用
  unicom_ai_cs: {
    xiaomu: [
      { name: '项目执行报告.md', originPath: '/unicom-ai-customer-service/xiaomu/项目执行报告.md', filePath: '/项目/项目执行报告.md', description: '任务调度与执行汇总报告' }
    ],
    xiaoyan: [
      { name: '联通助理&安全管家产品调研报告.md', originPath: '/unicom-ai-customer-service/xiaoyan/联通助理&安全管家产品调研报告.md', filePath: '/项目/联通助理&安全管家产品调研报告.md', description: '联通助理&安全管家产品调研' }
    ],
    xiaochan: [
      { name: '联通 AI 智能客服 PRD.md', originPath: '/unicom-ai-customer-service/xiaochan/联通 AI 智能客服 PRD.md', filePath: '/项目/联通 AI 智能客服 PRD.md', description: '产品需求文档与 H5 原型设计' },
      { name: 'H5 原型设计.html', originPath: '/unicom-ai-customer-service/xiaochan/H5 原型设计.html', filePath: '/项目/H5 原型设计.html', description: 'H5 页面原型' }
    ],
    xiaokai: [
      { name: '技术架构设计文档.md', originPath: '/unicom-ai-customer-service/xiaokai/技术架构设计文档.md', filePath: '/项目/技术架构设计文档.md', description: '技术架构设计文档' },
      { name: 'App.vue', originPath: '/unicom-ai-customer-service/xiaokai/App.vue', filePath: '/项目/App.vue', description: 'H5 应用主组件' },
      { name: 'honghu.js', originPath: '/unicom-ai-customer-service/xiaokai/honghu.js', filePath: '/项目/honghu.js', description: '鸿鹄大模型 API 集成' },
      { name: '部署说明.md', originPath: '/unicom-ai-customer-service/xiaokai/部署说明.md', filePath: '/项目/部署说明.md', description: '运行部署说明' }
    ]
  },
  // 场景 2: 联通 AI 彩铃产品升级（对标天翼智铃）
  unicom_ai_ringtone: {
    xiaomu: [
      { name: '项目管理_联通 AI 彩铃产品升级执行报告.md', originPath: '/origin/xiaomu/联通 AI 彩铃产品升级执行报告.md', filePath: '/项目/项目管理_联通 AI 彩铃产品升级执行报告.md', description: '项目统筹与执行汇总' }
    ],
    xiaoyan: [
      { name: '研究员_天翼智铃竞品分析报告.md', originPath: '/origin/xiaoyan/天翼智铃竞品分析报告.md', filePath: '/项目/研究员_天翼智铃竞品分析报告.md', description: '天翼智铃 vs 联通 AI 彩铃五维对比分析' }
    ],
    xiaochan: [
      { name: '产品经理_联通智铃 PRD 需求文档.md', originPath: '/origin/xiaochan/联通智铃 PRD 需求文档.md', filePath: '/项目/产品经理_联通智铃 PRD 需求文档.md', description: '产品需求文档与功能设计' },
      { name: '产品经理_H5 原型设计.html', originPath: '/origin/xiaochan/H5 原型设计.html', filePath: '/项目/产品经理_H5 原型设计.html', description: 'H5 页面原型设计' }
    ],
    xiaokai: [
      { name: '研发工程师_联通智铃技术架构设计.md', originPath: '/origin/xiaokai/联通智铃技术架构设计.md', filePath: '/项目/研发工程师_联通智铃技术架构设计.md', description: '技术架构与选型方案' },
      { name: '研发工程师_H5 内测_v2.0_App.vue', originPath: '/origin/xiaokai/App.vue', filePath: '/项目/研发工程师_H5 内测_v2.0_App.vue', description: 'H5 内测主组件' },
      { name: '研发工程师_H5 内测_v2.0_Home.vue', originPath: '/origin/xiaokai/Home.vue', filePath: '/项目/研发工程师_H5 内测_v2.0_Home.vue', description: '对话创作页面' },
      { name: '研发工程师_H5 内测_v2.0_Create.vue', originPath: '/origin/xiaokai/Create.vue', filePath: '/项目/研发工程师_H5 内测_v2.0_Create.vue', description: '一键生成页面' },
      { name: '研发工程师_H5 内测_v2.0_IPLibrary.vue', originPath: '/origin/xiaokai/IPLibrary.vue', filePath: '/项目/研发工程师_H5 内测_v2.0_IPLibrary.vue', description: 'IP 库页面' },
      { name: '研发工程师_H5 内测_v2.0_History.vue', originPath: '/origin/xiaokai/History.vue', filePath: '/项目/研发工程师_H5 内测_v2.0_History.vue', description: '历史记录页面' }
    ]
  }
}

// 延迟函数
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// 随机延迟函数（30-120 秒之间，转换为毫秒）
function randomDelay(): number {
  return (30 + Math.random() * 90) * 1000 // 30-120 秒
}

// 步骤延迟函数（将总时间平均分配到各个步骤）
function getStepDelay(totalSteps: number): number {
  const totalTime = randomDelay()
  return Math.floor(totalTime / totalSteps)
}

// 逐字输出延迟（每个字符之间的间隔，毫秒）
function getCharDelay(): number {
  return 80 + Math.random() * 40 // 80-120ms，约 0.1s
}

export const useSimulationStore = defineStore('simulation', () => {
  // 状态
  const currentTask = ref<Task | null>(null)
  const status = ref<SimulationStatus>('idle')
  const progress = ref(0)
  const currentStepIndex = ref(-1)
  const logs = ref<ExecutionLog[]>([])
  const subTasks = ref<ExecutionStep[]>([])
  const isPaused = ref(false)
  const abortController = ref<AbortController | null>(null)
  const generatedFiles = ref<Array<{ agentId: string; fileName: string; filePath: string; originPath: string }>>([])
  const currentScenario = ref<string>('unicom_ai_ringtone') // 默认场景：联通 AI 彩铃

  // 计算属性
  const currentStep = computed(() => {
    if (currentStepIndex.value >= 0 && currentStepIndex.value < subTasks.value.length) {
      return subTasks.value[currentStepIndex.value]
    }
    return null
  })

  const completedSteps = computed(() =>
    subTasks.value.filter((s) => s.status === 'completed').length
  )

  const isExecuting = computed(() => status.value === 'executing')

  // 获取指定 Agent 的工作明细
  const getAgentWorkDetails = computed(() => (agentId: string) => {
    const agentLogs = logs.value.filter(log => log.agentId === agentId)
    const agentTasks = subTasks.value.filter(task => task.agentId === agentId)
    const files = generatedFiles.value
      .filter(f => f.agentId === agentId)
      .map(f => ({ fileName: f.fileName, path: f.filePath }))
    return {
      logs: agentLogs,
      tasks: agentTasks,
      files,
      completedTasks: agentTasks.filter(t => t.status === 'completed').length,
      totalTasks: agentTasks.length
    }
  })

  // 方法
  function addLog(agentId: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): ExecutionLog {
    const agent = AGENT_CONFIG[agentId]
    const log: ExecutionLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      agentId,
      agentName: agent?.name || agentId,
      message,
      type
    }
    logs.value.push(log)
    return log
  }

  function clearLogs() {
    logs.value = []
    generatedFiles.value = []
  }

  // 逐字流式输出日志（模拟大模型打字效果）
  async function streamLogTyping(agentId: string, fullMessage: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', controller: AbortController | null): Promise<boolean> {
    const agent = AGENT_CONFIG[agentId]

    // 创建初始日志条目（空内容）
    const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
    const log: ExecutionLog = {
      id: logId,
      timestamp: Date.now(),
      agentId,
      agentName: agent?.name || agentId,
      message: '',
      type
    }
    logs.value.push(log)

    // 逐字追加
    for (let i = 0; i < fullMessage.length; i++) {
      if (controller?.signal.aborted) return false
      if (isPaused.value) {
        await delay(200)
        i-- // 暂停时不前进
        continue
      }

      // 逐字追加到日志
      const logIndex = logs.value.findIndex(l => l.id === logId)
      if (logIndex !== -1) {
        logs.value[logIndex] = {
          ...logs.value[logIndex],
          message: fullMessage.substring(0, i + 1)
        }
      }

      // 字符间隔延迟
      await delay(getCharDelay())
    }

    return true
  }

  // 等待函数（支持暂停和中断）
  async function waitWithPause(ms: number, controller: AbortController | null): Promise<boolean> {
    const startTime = Date.now()
    while (Date.now() - startTime < ms) {
      if (controller?.signal.aborted) {
        return false
      }
      if (!isPaused.value) {
        await delay(100)
      } else {
        await delay(200)
      }
    }
    return true
  }

  // 模拟生成文件（从 origin 复制到项目）
  async function generateFile(agentId: string, deliverable: Deliverable, controller: AbortController | null) {
    try {
      // 记录文件信息
      generatedFiles.value.push({
        agentId,
        fileName: deliverable.name,
        filePath: deliverable.filePath,
        originPath: deliverable.originPath
      })

      // 尝试复制文件（在浏览器环境中模拟文件移动）
      try {
        const response = await fetch(deliverable.originPath)
        if (response.ok) {
          const content = await response.text()
          // 创建文件到目标路径（通过下载模拟）
          const blob = new Blob([content], { type: 'text/plain' })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = deliverable.name
          // 不实际触发下载，只是模拟文件已生成
          URL.revokeObjectURL(url)
        }
      } catch (e) {
        // 忽略 fetch 错误，只是模拟
        console.log(`[模拟] 文件从 ${deliverable.originPath} 移动到 ${deliverable.filePath}`)
      }

      await streamLogTyping(agentId, `  ✅ 生成文件：${deliverable.name}`, 'success', controller)
    } catch (error) {
      console.error('生成文件失败:', error)
      await streamLogTyping(agentId, `  ⚠️ 文件生成失败：${deliverable.name}`, 'warning', controller)
    }
  }

  // ===== 产品经理 - 产品经理工作流 =====
  async function executeXiaochanWorkflow(controller: AbortController | null): Promise<boolean> {
    const agentId = 'xiaochan'
    const agent = AGENT_CONFIG[agentId]
    const agentsStore = useAgentsStore()
    const isUnicomScenario = currentScenario.value === 'unicom_ai_cs'
    const isRingtoneScenario = currentScenario.value === 'unicom_ai_ringtone'

    agentsStore.assignTaskToAgent(agentId, { id: `prd_${Date.now()}`, title: isRingtoneScenario ? '联通智铃 PRD 设计' : (isUnicomScenario ? 'PRD&H5 原型设计' : '产品需求分析'), progress: 0 })
    await streamLogTyping(agentId, `🚀 ${agent.name} 开始执行${isRingtoneScenario ? '联通智铃 PRD 设计' : (isUnicomScenario ? 'PRD&H5 原型设计' : '产品需求分析')}任务`, 'info', controller)

    // 在群里同步消息
    if (isRingtoneScenario) {
      await streamLogTyping(agentId, `收到！我基于研究员的竞品分析报告开始设计联通智铃产品方案 📋`, 'info', controller)
    } else if (isUnicomScenario) {
      await streamLogTyping(agentId, `收到！我基于研究员的调研报告开始设计产品方案 📋`, 'info', controller)
    }

    const subTask = subTasks.value.find(t => t.agentId === agentId)
    if (subTask) subTask.status = 'in_progress'

    if (isRingtoneScenario) {
      // 联通 AI 彩铃场景 - PRD 设计 - 7 个步骤
      await streamLogTyping(agentId, `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'info', controller)
      await streamLogTyping(agentId, `📝 阶段二：联通智铃 PRD&H5 原型设计`, 'info', controller)
      await streamLogTyping(agentId, `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'info', controller)

      // ===== 思考阶段：任务理解和规划 =====
      await streamLogTyping(agentId, `💭 思考阶段：任务理解与分析`, 'info', controller)
      await streamLogTyping(agentId, `  📌 任务背景：基于天翼智铃竞品分析，设计联通智铃产品方案`, 'info', controller)
      await streamLogTyping(agentId, `  🎯 设计目标：对标天翼智铃 AI 体验，发挥联通 IP 生态优势`, 'info', controller)
      await streamLogTyping(agentId, `  📋 设计维度：产品定位、目标用户、核心功能、用户流程、原型设计`, 'info', controller)
      await streamLogTyping(agentId, `  🔍 关键问题：如何差异化竞争？如何利用联通 IP 资源？`, 'info', controller)
      await streamLogTyping(agentId, `  ✅ 设计思路确定：小鸿智能体 4 轮引导 + 一键生成 + IP 库联动`, 'info', controller)
      await streamLogTyping(agentId, ``, 'info', controller)

      const stepDelay = getStepDelay(7)

      // 步骤 1：重读调研报告
      await streamLogTyping(agentId, `① 重读竞品分析报告`, 'info', controller)
      await streamLogTyping(agentId, `  📖 重读研究员的天翼智铃竞品分析报告...`, 'info', controller)
      if (!(await waitWithPause(stepDelay, controller))) return false
      await streamLogTyping(agentId, `  ✅ 明确核心差距：AI 创作能力缺失、智能体服务空白`, 'info', controller)

      // 步骤 2：确定产品定位
      await streamLogTyping(agentId, `② 确定产品定位`, 'info', controller)
      await streamLogTyping(agentId, `  🎯 定义产品定位：从 1 到 N 的能力升级，非从 0 到 1`, 'info', controller)
      if (!(await waitWithPause(stepDelay, controller))) return false
      await streamLogTyping(agentId, `  ✅ 核心策略：对标天翼智铃 AI 体验 + 发挥联通 IP 生态优势`, 'info', controller)

      // 步骤 3：目标用户定义
      await streamLogTyping(agentId, `③ 目标用户定义`, 'info', controller)
      await streamLogTyping(agentId, `  👥 定义目标用户：C 端个人用户优先，B 端企业客户为辅`, 'info', controller)
      if (!(await waitWithPause(stepDelay, controller))) return false
      await streamLogTyping(agentId, `  ✅ 用户场景：春节拜年、生日祝福、企业宣传`, 'info', controller)

      // 步骤 4：核心功能设计
      await streamLogTyping(agentId, `④ 核心功能设计`, 'info', controller)
      await streamLogTyping(agentId, `  🎨 设计核心功能：小鸿智能体、一键生成、一键设彩铃`, 'info', controller)
      if (!(await waitWithPause(stepDelay, controller))) return false
      await streamLogTyping(agentId, `  ✅ P0 功能：4 轮对话引导、10 秒设彩铃；P1 功能：IP 库联动`, 'info', controller)

      // 步骤 5：用户流程设计
      await streamLogTyping(agentId, `⑤ 用户流程设计`, 'info', controller)
      await streamLogTyping(agentId, `  🔄 设计用户旅程：入口→创作方式→输入→生成→预览→设彩铃`, 'info', controller)
      if (!(await waitWithPause(stepDelay, controller))) return false
      await streamLogTyping(agentId, `  ✅ 关键体验：每步不超过 3 次点击，生成进度可视化`, 'info', controller)

      // 步骤 6：撰写 PRD 文档
      await streamLogTyping(agentId, `⑥ 撰写 PRD 文档`, 'info', controller)
      await streamLogTyping(agentId, `  📄 撰写《联通智铃产品需求文档》...`, 'info', controller)
      if (!(await waitWithPause(stepDelay, controller))) return false

      // 生成 PRD 文件
      const deliverables = SCENARIO_DELIVERABLES[currentScenario.value][agentId]
      if (deliverables && deliverables.length > 0) {
        await generateFile(agentId, deliverables[0], controller)
      }

      // 步骤 7：H5 原型设计
      await streamLogTyping(agentId, `⑦ H5 原型设计`, 'info', controller)
      await streamLogTyping(agentId, `  🎨 设计 H5 页面原型（对话创作页、一键生成页、IP 库、历史记录）...`, 'info', controller)
      if (!(await waitWithPause(stepDelay, controller))) return false
      if (deliverables && deliverables.length > 1) {
        await generateFile(agentId, deliverables[1], controller)
      }
      await streamLogTyping(agentId, `  ✅ 完成 4 个核心页面原型设计`, 'info', controller)

      // 完成
      if (subTask) {
        subTask.status = 'completed'
        subTask.output = '📄 PRD 文档 + 🎨 H5 原型'
      }
      agentsStore.completeAgentTask(agentId)
      await streamLogTyping(agentId, `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'info', controller)
      await streamLogTyping(agentId, `✅ 阶段二完成：PRD 文档和 H5 原型已输出`, 'success', controller)
    } else if (isUnicomScenario) {
      // 联通智能客服场景 - 6 个步骤
      await streamLogTyping(agentId, `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'info', controller)
      await streamLogTyping(agentId, `📝 阶段二：联通 AI 智能客服 PRD&H5 原型设计`, 'info', controller)
      await streamLogTyping(agentId, `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'info', controller)

      // ===== 思考阶段：任务理解和规划 =====
      await streamLogTyping(agentId, `💭 思考阶段：任务理解与分析`, 'info', controller)
      await streamLogTyping(agentId, `  📌 任务背景：基于联通助理&安全管家调研，设计统一智能客服 H5`, 'info', controller)
      await streamLogTyping(agentId, `  🎯 设计目标：统一服务入口、智能化升级、个性化体验`, 'info', controller)
      await streamLogTyping(agentId, `  📋 设计维度：用户画像、功能架构、交互流程、原型设计`, 'info', controller)
      await streamLogTyping(agentId, `  🔍 关键问题：如何整合现有产品？如何实现智能化体验？`, 'info', controller)
      await streamLogTyping(agentId, `  ✅ 设计思路确定：智能对话为核心 + 快捷服务入口 + 鸿鹄大模型集成`, 'info', controller)
      await streamLogTyping(agentId, ``, 'info', controller)

      const stepDelay = getStepDelay(6)

      // 步骤 1：理解需求
      await streamLogTyping(agentId, `① 分析调研报告`, 'info', controller)
      await streamLogTyping(agentId, `  📖 分析研究员提供的联通助理&安全管家调研报告...`, 'info', controller)
      if (!(await waitWithPause(stepDelay, controller))) return false
      await streamLogTyping(agentId, `  ✓ 理解核心需求：统一服务入口、智能化升级、个性化体验`, 'info', controller)

      // 步骤 2：用户画像
      await streamLogTyping(agentId, `  👥 定义目标用户（普通用户 60%、老年用户 20%、企业用户 15%）...`, 'info', controller)
      if (!(await waitWithPause(stepDelay, controller))) return false

      // 步骤 3：功能设计
      await streamLogTyping(agentId, `  📝 设计核心功能（智能对话、通信服务、安全服务、个性化推荐）...`, 'info', controller)
      if (!(await waitWithPause(stepDelay, controller))) return false

      // 步骤 4：撰写 PRD
      await streamLogTyping(agentId, `  📄 撰写《联通 AI 智能客服产品需求文档》...`, 'info', controller)
      if (!(await waitWithPause(stepDelay, controller))) return false

      // 生成 PRD 文件
      const deliverables = SCENARIO_DELIVERABLES[currentScenario.value][agentId]
      if (deliverables && deliverables.length > 0) {
        await generateFile(agentId, deliverables[0], controller)
      }

      // 步骤 5：H5 原型设计
      await streamLogTyping(agentId, `  🎨 设计 H5 页面原型（对话界面、快捷入口、输入区域）...`, 'info', controller)
      if (!(await waitWithPause(stepDelay, controller))) return false

      // 步骤 6：生成原型文件
      if (deliverables && deliverables.length > 1) {
        await generateFile(agentId, deliverables[1], controller)
      }
      await streamLogTyping(agentId, `  ✓ 完成 H5 原型设计：Header、Chat Area、Quick Actions、Input`, 'info', controller)

      // 完成
      if (subTask) {
        subTask.status = 'completed'
        subTask.output = '📄 PRD 文档 + 🎨 H5 原型'
      }
      agentsStore.completeAgentTask(agentId)
      await streamLogTyping(agentId, `✅ ${agent.name} 完成 PRD 和 H5 原型设计，文档已保存到共享工作区`, 'success', controller)
    }
    return true
  }

  // ===== 研究员 - 竞品分析师工作流 =====
  async function executeXiaoyanWorkflow(controller: AbortController | null): Promise<boolean> {
    const agentId = 'xiaoyan'
    const agent = AGENT_CONFIG[agentId]
    const agentsStore = useAgentsStore()
    const isUnicomScenario = currentScenario.value === 'unicom_ai_cs'
    const isRingtoneScenario = currentScenario.value === 'unicom_ai_ringtone'

    agentsStore.assignTaskToAgent(agentId, { id: `research_${Date.now()}`, title: isRingtoneScenario ? '天翼智铃竞品分析' : (isUnicomScenario ? '联通产品调研' : '市场调研分析'), progress: 0 })
    await streamLogTyping(agentId, `🚀 ${agent.name} 开始执行${isRingtoneScenario ? '天翼智铃竞品分析' : (isUnicomScenario ? '联通产品调研' : '市场调研')}任务`, 'info', controller)

    // 在群里同步消息
    if (isRingtoneScenario) {
      await streamLogTyping(agentId, `收到！我立即开始搜集天翼智铃的官方发布材料和产品数据 📡`, 'info', controller)
    } else if (isUnicomScenario) {
      await streamLogTyping(agentId, `收到！我立即开始爬取联通助理和安全管家相关产品数据 📡`, 'info', controller)
    }

    const subTask = subTasks.value.find(t => t.agentId === agentId)
    if (subTask) subTask.status = 'in_progress'

    if (isRingtoneScenario) {
      // 联通 AI 彩铃场景 - 天翼智铃竞品分析 - 6 个步骤
      await streamLogTyping(agentId, `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'info', controller)
      await streamLogTyping(agentId, `📊 阶段一：天翼智铃竞品分析`, 'info', controller)
      await streamLogTyping(agentId, `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'info', controller)

      // ===== 思考阶段：任务理解和规划 =====
      await streamLogTyping(agentId, `💭 思考阶段：任务理解与分析`, 'info', controller)
      await streamLogTyping(agentId, `  📌 任务背景：联通 AI 彩铃产品升级，需要对标天翼智铃`, 'info', controller)
      await streamLogTyping(agentId, `  🎯 分析目标：找出天翼智铃的核心优势和联通 AI 彩铃的差距`, 'info', controller)
      await streamLogTyping(agentId, `  📋 分析维度：产品功能、技术能力、用户体验、商业模式、用户评价`, 'info', controller)
      await streamLogTyping(agentId, `  🔍 关键问题：为什么天翼智铃能快速获客？联通的差距在哪里？`, 'info', controller)
      await streamLogTyping(agentId, `  ✅ 分析思路确定：从官方材料→产品体验→技术能力→用户评价，全方位对比`, 'info', controller)
      await streamLogTyping(agentId, ``, 'info', controller)

      const stepDelay = getStepDelay(6)

      // 步骤 1：搜集官方发布材料
      await streamLogTyping(agentId, `① 搜集官方发布材料`, 'info', controller)
      await streamLogTyping(agentId, `  🔍 搜索天翼智铃官方发布材料（发布会视频、新闻稿）...`, 'info', controller)
      if (!(await waitWithPause(stepDelay, controller))) return false
      await streamLogTyping(agentId, `  ✅ 找到关键信息：2025 年 10 月发布，主打 AI 创作能力`, 'info', controller)

      // 步骤 2：产品功能体验
      await streamLogTyping(agentId, `② 产品功能体验`, 'info', controller)
      await streamLogTyping(agentId, `  📱 模拟用户体验天翼智铃创作流程...`, 'info', controller)
      if (!(await waitWithPause(stepDelay, controller))) return false
      await streamLogTyping(agentId, `  ✅ 核心体验：一句话生成→10 秒设彩铃，门槛极低`, 'info', controller)

      // 步骤 3：技术能力调研
      await streamLogTyping(agentId, `③ 技术能力调研`, 'info', controller)
      await streamLogTyping(agentId, `  🔬 调研电信星辰大模型技术能力...`, 'info', controller)
      if (!(await waitWithPause(stepDelay, controller))) return false
      await streamLogTyping(agentId, `  ✅ TeleVideo 2.0 图生视频能力全球前五`, 'info', controller)

      // 步骤 4：功能对比矩阵
      await streamLogTyping(agentId, `④ 功能对比矩阵`, 'info', controller)
      await streamLogTyping(agentId, `  📊 制作天翼智铃 vs 联通 AI 彩铃功能对比表...`, 'info', controller)
      if (!(await waitWithPause(stepDelay, controller))) return false
      await streamLogTyping(agentId, `  ✅ 关键差距：文生视频❌、AI 音乐❌、智能体❌`, 'info', controller)

      // 步骤 5：用户评价分析
      await streamLogTyping(agentId, `⑤ 用户评价分析`, 'info', controller)
      await streamLogTyping(agentId, `  💬 分析用户对两款产品的评价反馈...`, 'info', controller)
      if (!(await waitWithPause(stepDelay, controller))) return false
      await streamLogTyping(agentId, `  ✅ 电信好评：简单快速；联通短板：需要手动编辑`, 'info', controller)

      // 步骤 6：撰写竞品分析报告
      await streamLogTyping(agentId, `⑥ 撰写竞品分析报告`, 'info', controller)
      await streamLogTyping(agentId, `  📄 整理调研数据，撰写《天翼智铃竞品分析报告》...`, 'info', controller)
      if (!(await waitWithPause(stepDelay, controller))) return false

      // 生成报告文件
      const deliverables = SCENARIO_DELIVERABLES[currentScenario.value][agentId]
      if (deliverables && deliverables.length > 0) {
        await generateFile(agentId, deliverables[0], controller)
      }

      // 完成
      if (subTask) {
        subTask.status = 'completed'
        subTask.output = '📡 天翼智铃竞品分析报告'
      }
      agentsStore.completeAgentTask(agentId)
      await streamLogTyping(agentId, `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'info', controller)
      await streamLogTyping(agentId, `✅ 阶段一完成：天翼智铃竞品分析报告已输出`, 'success', controller)
    } else if (isUnicomScenario) {
      // 联通智能客服场景 - 5 个步骤
      await streamLogTyping(agentId, `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'info', controller)
      await streamLogTyping(agentId, `📊 阶段一：联通助理&安全管家产品调研`, 'info', controller)
      await streamLogTyping(agentId, `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'info', controller)

      // ===== 思考阶段：任务理解和规划 =====
      await streamLogTyping(agentId, `💭 思考阶段：任务理解与分析`, 'info', controller)
      await streamLogTyping(agentId, `  📌 任务背景：开发联通智能客服 H5 应用，需要先了解现有产品`, 'info', controller)
      await streamLogTyping(agentId, `  🎯 调研目标：摸清联通助理和安全管家的功能现状和技术能力`, 'info', controller)
      await streamLogTyping(agentId, `  📋 调研维度：产品功能、技术能力、产品形态、用户体验`, 'info', controller)
      await streamLogTyping(agentId, `  🔍 关键问题：联通现有产品的功能和不足？用户对智能化的需求？`, 'info', controller)
      await streamLogTyping(agentId, `  ✅ 分析思路确定：产品调研→技术能力→产品形态→用户需求`, 'info', controller)
      await streamLogTyping(agentId, ``, 'info', controller)

      const stepDelay = getStepDelay(5)

      // 步骤 1：联通助理产品调研
      await streamLogTyping(agentId, `① 联通助理产品调研`, 'info', controller)
      await streamLogTyping(agentId, `  📡 爬取联通助理产品信息（漏话提醒、语音留言、人工秘书）...`, 'info', controller)
      if (!(await waitWithPause(stepDelay, controller))) return false
      await streamLogTyping(agentId, `  ✓ 获取产品定位：通信助理服务，资费 3-4 元/月`, 'info', controller)

      // 步骤 2：安全管家产品调研
      await streamLogTyping(agentId, `  🛡️ 爬取联通安全管家功能（通话安全、短信安全、亲情守护）...`, 'info', controller)
      if (!(await waitWithPause(stepDelay, controller))) return false
      await streamLogTyping(agentId, `  ✓ 获取核心功能：骚扰拦截、诈骗防护、上网守护`, 'info', controller)

      // 步骤 3：技术能力分析
      await streamLogTyping(agentId, `  🔬 分析现有技术能力（语音识别、NLP、声纹识别）...`, 'info', controller)
      if (!(await waitWithPause(stepDelay, controller))) return false
      await streamLogTyping(agentId, `  ✓ 现有技术：智能应答、语音留言、骚扰拦截`, 'info', controller)

      // 步骤 4：产品形态分析
      await streamLogTyping(agentId, `  📱 分析产品形态（微信小程序、APP、系统级服务）...`, 'info', controller)
      if (!(await waitWithPause(stepDelay, controller))) return false

      // 步骤 5：撰写调研报告
      await streamLogTyping(agentId, `  📄 整理调研数据，撰写《联通助理&安全管家产品调研报告》...`, 'info', controller)
      if (!(await waitWithPause(stepDelay, controller))) return false

      // 生成报告文件
      const deliverables = SCENARIO_DELIVERABLES[currentScenario.value][agentId]
      if (deliverables && deliverables.length > 0) {
        await generateFile(agentId, deliverables[0], controller)
      }

      // 完成
      if (subTask) {
        subTask.status = 'completed'
        subTask.output = '📡 联通产品调研报告'
      }
      agentsStore.completeAgentTask(agentId)
      await streamLogTyping(agentId, `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'info', controller)
      await streamLogTyping(agentId, `✅ 阶段一完成：联通助理&安全管家产品调研报告已输出`, 'success', controller)
    }
    return true
  }

  // ===== 研发工程师 - 研发工程师工作流 =====
  async function executeXiaokaiWorkflow(controller: AbortController | null): Promise<boolean> {
    const agentId = 'xiaokai'
    const agent = AGENT_CONFIG[agentId]
    const agentsStore = useAgentsStore()
    const isUnicomScenario = currentScenario.value === 'unicom_ai_cs'
    const isRingtoneScenario = currentScenario.value === 'unicom_ai_ringtone'

    agentsStore.assignTaskToAgent(agentId, { id: `dev_${Date.now()}`, title: isRingtoneScenario ? '联通智铃 H5 内测开发' : (isUnicomScenario ? 'H5 应用开发' : '技术开发实现'), progress: 0 })
    await streamLogTyping(agentId, `🚀 ${agent.name} 开始执行${isRingtoneScenario ? '联通智铃 H5 内测开发' : (isUnicomScenario ? 'H5 应用开发' : '技术开发')}任务`, 'info', controller)

    // 在群里同步消息
    if (isRingtoneScenario) {
      await streamLogTyping(agentId, `收到！我基于 PRD 文档开始进行技术架构设计和 H5 内测开发 💻`, 'info', controller)
    } else if (isUnicomScenario) {
      await streamLogTyping(agentId, `收到！我基于 PRD 文档开始进行技术架构设计和 H5 开发 💻`, 'info', controller)
    }

    const subTask = subTasks.value.find(t => t.agentId === agentId)
    if (subTask) subTask.status = 'in_progress'

    if (isRingtoneScenario) {
      // 联通 AI 彩铃场景 - H5 内测开发 - 8 个步骤
      await streamLogTyping(agentId, `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'info', controller)
      await streamLogTyping(agentId, `💻 阶段三：联通智铃 H5 内测 v2.0 开发`, 'info', controller)
      await streamLogTyping(agentId, `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'info', controller)

      // ===== 思考阶段：任务理解和规划 =====
      await streamLogTyping(agentId, `💭 思考阶段：任务理解与分析`, 'info', controller)
      await streamLogTyping(agentId, `  📌 任务背景：基于 PRD 文档和 H5 原型，开发联通智铃 H5 内测版`, 'info', controller)
      await streamLogTyping(agentId, `  🎯 技术目标：实现小鸿智能体对话、一键生成、IP 库等核心功能`, 'info', controller)
      await streamLogTyping(agentId, `  📋 技术维度：技术选型、架构设计、页面开发、API 集成、流程调试`, 'info', controller)
      await streamLogTyping(agentId, `  🔍 关键问题：如何实现 4 轮对话状态机？如何保证生成性能？`, 'info', controller)
      await streamLogTyping(agentId, `  ✅ 技术思路确定：Vue3 状态机控制对话流程 + 鸿鹄大模型 API 集成`, 'info', controller)
      await streamLogTyping(agentId, ``, 'info', controller)

      const stepDelay = getStepDelay(8)

      // 步骤 1：技术选型
      await streamLogTyping(agentId, `① 技术选型`, 'info', controller)
      await streamLogTyping(agentId, `  🔬 进行技术选型（Vue3 + Vant UI + 鸿鹄大模型）...`, 'info', controller)
      if (!(await waitWithPause(stepDelay, controller))) return false
      await streamLogTyping(agentId, `  ✅ 确定技术栈：Vue 3.4 + Vant 4.8 + Pinia 2.1`, 'info', controller)

      // 步骤 2：核心能力设计
      await streamLogTyping(agentId, `② 核心能力设计`, 'info', controller)
      await streamLogTyping(agentId, `  🎯 设计核心能力：小鸿智能体 4 轮对话状态机、一键生成流程`, 'info', controller)
      if (!(await waitWithPause(stepDelay, controller))) return false
      await streamLogTyping(agentId, `  ✅ 关键决策：状态机控制对话流程，选项按钮保证可控`, 'info', controller)

      // 步骤 3：对话创作页开发（Home.vue）
      await streamLogTyping(agentId, `③ 对话创作页开发`, 'info', controller)
      await streamLogTyping(agentId, `  💻 开发对话创作页面（小鸿智能体多轮引导）...`, 'info', controller)
      if (!(await waitWithPause(stepDelay, controller))) return false
      const deliverables = SCENARIO_DELIVERABLES[currentScenario.value][agentId]
      if (deliverables && deliverables.length > 1) {
        await generateFile(agentId, deliverables[1], controller)
      }
      await streamLogTyping(agentId, `  ✅ 完成：智能体对话、进度展示、快捷入口`, 'info', controller)

      // 步骤 4：一键生成页开发（Create.vue）
      await streamLogTyping(agentId, `④ 一键生成页开发`, 'info', controller)
      await streamLogTyping(agentId, `  💻 开发一键生成页面（一句话输入 + 标签选择）...`, 'info', controller)
      if (!(await waitWithPause(stepDelay, controller))) return false
      if (deliverables && deliverables.length > 2) {
        await generateFile(agentId, deliverables[2], controller)
      }
      await streamLogTyping(agentId, `  ✅ 完成：输入框、风格选择器、5 步进度展示`, 'info', controller)

      // 步骤 5:IP 库开发（IPLibrary.vue）
      await streamLogTyping(agentId, `⑤ IP 库开发`, 'info', controller)
      await streamLogTyping(agentId, `  💻 开发 IP 库页面（12 个 IP 形象展示 + 分类筛选）...`, 'info', controller)
      if (!(await waitWithPause(stepDelay, controller))) return false
      if (deliverables && deliverables.length > 3) {
        await generateFile(agentId, deliverables[3], controller)
      }
      await streamLogTyping(agentId, `  ✅ 完成：IP 展示、分类筛选、选中状态，这是联通独特优势`, 'info', controller)

      // 步骤 6：历史记录开发（History.vue）
      await streamLogTyping(agentId, `⑥ 历史记录开发`, 'info', controller)
      await streamLogTyping(agentId, `  💻 开发历史记录页面（创作统计 + 历史列表）...`, 'info', controller)
      if (!(await waitWithPause(stepDelay, controller))) return false
      if (deliverables && deliverables.length > 4) {
        await generateFile(agentId, deliverables[4], controller)
      }
      await streamLogTyping(agentId, `  ✅ 完成：统计数据、状态标签、清空功能`, 'info', controller)

      // 步骤 7：流程调试
      await streamLogTyping(agentId, `⑦ 流程调试`, 'info', controller)
      await streamLogTyping(agentId, `  🔄 完整调试对话创作流程...`, 'info', controller)
      if (!(await waitWithPause(stepDelay, controller))) return false
      await streamLogTyping(agentId, `  ✅ 调优：每轮间隔 0.5 秒模拟思考，生成进度 10 秒`, 'info', controller)

      // 步骤 8：生成技术架构文档
      await streamLogTyping(agentId, `⑧ 技术架构文档`, 'info', controller)
      await streamLogTyping(agentId, `  📄 撰写技术架构设计文档...`, 'info', controller)
      if (!(await waitWithPause(stepDelay, controller))) return false
      if (deliverables && deliverables.length > 0) {
        await generateFile(agentId, deliverables[0], controller)
      }

      // 完成
      if (subTask) {
        subTask.status = 'completed'
        subTask.output = '🏗️ 技术架构 + 💻 4 个 H5 页面 + 🔌 鸿鹄 API 集成'
      }
      agentsStore.completeAgentTask(agentId)
      await streamLogTyping(agentId, `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'info', controller)
      await streamLogTyping(agentId, `✅ 阶段三完成：H5 内测 v2.0 已开发完成`, 'success', controller)
    } else if (isUnicomScenario) {
      // 联通智能客服场景 - 6 个步骤
      await streamLogTyping(agentId, `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'info', controller)
      await streamLogTyping(agentId, `💻 阶段三：联通 AI 智能客服 H5 应用开发`, 'info', controller)
      await streamLogTyping(agentId, `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'info', controller)

      // ===== 思考阶段：任务理解和规划 =====
      await streamLogTyping(agentId, `💭 思考阶段：任务理解与分析`, 'info', controller)
      await streamLogTyping(agentId, `  📌 任务背景：基于 PRD 文档和 H5 原型，开发联通 AI 智能客服 H5`, 'info', controller)
      await streamLogTyping(agentId, `  🎯 技术目标：实现智能对话、快捷服务、鸿鹄大模型集成`, 'info', controller)
      await streamLogTyping(agentId, `  📋 技术维度：技术选型、架构设计、组件开发、API 集成、部署配置`, 'info', controller)
      await streamLogTyping(agentId, `  🔍 关键问题：如何整合现有产品功能？如何实现智能化对话？`, 'info', controller)
      await streamLogTyping(agentId, `  ✅ 技术思路确定：Vue3 组合式 API + 鸿鹄 OpenAI 兼容接口`, 'info', controller)
      await streamLogTyping(agentId, ``, 'info', controller)

      const stepDelay = getStepDelay(6)

      // 步骤 1：技术选型
      await streamLogTyping(agentId, `① 技术选型`, 'info', controller)
      await streamLogTyping(agentId, `  🔬 进行技术选型（Vue3 + Vite + Vant UI + 鸿鹄大模型）...`, 'info', controller)
      if (!(await waitWithPause(stepDelay, controller))) return false
      await streamLogTyping(agentId, `  ✓ 确定技术栈：Vue 3 + Vite 5 + Vant 4 + 鸿鹄大模型 API`, 'info', controller)

      // 步骤 2：架构设计
      await streamLogTyping(agentId, `  🏗️ 设计 H5 应用架构（前端展示层 + API 服务层）...`, 'info', controller)
      if (!(await waitWithPause(stepDelay, controller))) return false

      // 步骤 3：生成技术架构文档
      const deliverables = SCENARIO_DELIVERABLES[currentScenario.value][agentId]
      if (deliverables && deliverables.length > 0) {
        await generateFile(agentId, deliverables[0], controller)
      }
      await streamLogTyping(agentId, `  ✓ 完成技术架构设计：Vue3 组合式 API、鸿鹄 OpenAI 兼容接口`, 'info', controller)

      // 步骤 4：开发 H5 主组件
      await streamLogTyping(agentId, `  💻 开发 H5 主组件（App.vue）...`, 'info', controller)
      if (!(await waitWithPause(stepDelay, controller))) return false
      if (deliverables && deliverables.length > 1) {
        await generateFile(agentId, deliverables[1], controller)
      }

      // 步骤 5：鸿鹄 API 集成
      await streamLogTyping(agentId, `  🤖 集成鸿鹄大模型 API（honghu.js）...`, 'info', controller)
      if (!(await waitWithPause(stepDelay, controller))) return false
      if (deliverables && deliverables.length > 2) {
        await generateFile(agentId, deliverables[2], controller)
      }
      await streamLogTyping(agentId, `  ✓ 完成 API 集成：OpenAI 兼容格式、流式响应`, 'info', controller)

      // 步骤 6：编写部署说明
      await streamLogTyping(agentId, `  📝 编写部署说明文档...`, 'info', controller)
      if (!(await waitWithPause(stepDelay, controller))) return false
      if (deliverables && deliverables.length > 3) {
        await generateFile(agentId, deliverables[3], controller)
      }

      // 完成
      if (subTask) {
        subTask.status = 'completed'
        subTask.output = '🏗️ 技术架构 + 💻 H5 代码 + 🔌 API 集成'
      }
      agentsStore.completeAgentTask(agentId)
      await streamLogTyping(agentId, `✅ ${agent.name} 完成 H5 应用开发，代码已提交到 Git`, 'success', controller)
    }
    return true
  }

  // ===== 小 U - 任务调度工作流 =====
  async function executeXiaomuWorkflow(controller: AbortController | null): Promise<boolean> {
    const agentId = 'xiaomu'
    const agentsStore = useAgentsStore()
    const isRingtoneScenario = currentScenario.value === 'unicom_ai_ringtone'

    agentsStore.assignTaskToAgent(agentId, { id: `coord_${Date.now()}`, title: '任务调度协调', progress: 0 })

    const subTask = subTasks.value.find(t => t.agentId === agentId)
    if (subTask) subTask.status = 'in_progress'

    // 3 个步骤
    const stepDelay = getStepDelay(3)

    // 分析阶段
    await streamLogTyping(agentId, `📋 分析任务需求，确定执行顺序...`, 'info', controller)
    if (!(await waitWithPause(stepDelay, controller))) return false

    if (isRingtoneScenario) {
      await streamLogTyping(agentId, `✅ 确定执行顺序：研究员（天翼智铃竞品分析）→ 产品经理（PRD&H5 设计）→ 研发工程师（H5 内测开发）`, 'info', controller)
      await streamLogTyping(agentId, `✅ 建立阶段交付机制：上阶段产出作为下阶段输入`, 'info', controller)
    } else if (isUnicomScenario) {
      await streamLogTyping(agentId, `✅ 确定执行顺序：研究员（联通助理&安全管家调研）→ 产品经理（PRD&H5 设计）→ 研发工程师（H5 开发）`, 'info', controller)
      await streamLogTyping(agentId, `✅ 建立阶段交付机制：上阶段产出作为下阶段输入`, 'info', controller)
    }

    // 生成项目报告
    const deliverables = SCENARIO_DELIVERABLES[currentScenario.value][agentId]
    if (deliverables && deliverables.length > 0) {
      await generateFile(agentId, deliverables[0], controller)
    }

    if (subTask) {
      subTask.status = 'completed'
      subTask.output = '📋 项目执行报告'
    }
    agentsStore.completeAgentTask(agentId)
    return true
  }

  /**
   * 开始执行任务 - AI 智能客服产品开发
   */
  async function executeTask(title: string, description: string) {
    const agentsStore = useAgentsStore()

    // 重置状态
    status.value = 'executing'
    progress.value = 0
    currentStepIndex.value = -1
    isPaused.value = false
    logs.value = []
    generatedFiles.value = []
    abortController.value = new AbortController()
    const controller = abortController.value

    // 创建任务
    currentTask.value = {
      id: `task_${Date.now()}`,
      title,
      description,
      status: 'in_progress',
      createdAt: Date.now(),
      progress: 0
    }

    // 重置所有 Agent 状态（保留已完成任务统计）
    agentsStore.resetAgentStatus()

    // 添加任务开始标记
    await streamLogTyping('xiaomu', `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'info', controller)
    await streamLogTyping('xiaomu', `📋 收到任务：${title}`, 'info', controller)
    await streamLogTyping('xiaomu', `📝 任务描述：${description}`, 'info', controller)
    await streamLogTyping('xiaomu', ``, 'info', controller)

    // 根据场景显示不同的任务目标
    const isUnicomScenario = currentScenario.value === 'unicom_ai_cs'
    const isRingtoneScenario = currentScenario.value === 'unicom_ai_ringtone'

    if (isRingtoneScenario) {
      await streamLogTyping('xiaomu', `🎯 任务目标：联通 AI 彩铃产品升级（对标天翼智铃）`, 'info', controller)
      await streamLogTyping('xiaomu', `👥 参与角色：研究员（竞品分析师）、产品经理（产品经理）、研发工程师（研发工程师）`, 'info', controller)
      await streamLogTyping('xiaomu', `📋 执行流程：天翼智铃竞品分析 → 联通智铃 PRD&H5 原型设计 → 技术架构与内测开发`, 'info', controller)
    } else if (isUnicomScenario) {
      await streamLogTyping('xiaomu', `🎯 任务目标：开发联通智能客服 H5 应用`, 'info', controller)
      await streamLogTyping('xiaomu', `👥 参与角色：研究员（竞品分析师）、产品经理（产品经理）、研发工程师（研发工程师）`, 'info', controller)
      await streamLogTyping('xiaomu', `📋 执行流程：联通助理&安全管家调研 → 产品 PRD&H5 原型设计 → 技术架构与开发`, 'info', controller)
    }
    await streamLogTyping('xiaomu', ``, 'info', controller)

    try {
      // ===== 阶段 1: 小呦启动项目 =====
      await streamLogTyping('xiaomu', `🚀 小呦启动项目并进行任务分配...`, 'info', controller)
      await streamLogTyping('xiaomu', ``, 'info', controller)
      await executeXiaomuWorkflow(controller)
      if (controller.signal.aborted) throw new Error('任务已取消')

      // 创建四个子任务
      subTasks.value = [
        { id: `step_${Date.now()}_xiaomu`, agentId: 'xiaomu', description: isRingtoneScenario ? '项目统筹与协调' : (isUnicomScenario ? '项目调度与协调' : '项目统筹与协调'), status: 'completed', duration: 0 },
        { id: `step_${Date.now()}_xiaoyan`, agentId: 'xiaoyan', description: isRingtoneScenario ? '天翼智铃竞品分析（产品/功能/技术/商业/用户五维对比）' : (isUnicomScenario ? '联通助理&安全管家产品调研' : '市场调研分析'), status: 'pending', duration: 0 },
        { id: `step_${Date.now()}_xiaochan`, agentId: 'xiaochan', description: isRingtoneScenario ? '联通智铃 PRD&H5 原型设计（小鸿智能体/一键生成/一键设彩铃）' : (isUnicomScenario ? '产品 PRD&H5 原型设计' : '产品需求分析'), status: 'pending', duration: 0 },
        { id: `step_${Date.now()}_xiaokai`, agentId: 'xiaokai', description: isRingtoneScenario ? '技术架构与 H5 内测开发（对话创作页/一键生成页/IP 库/历史记录）' : (isUnicomScenario ? '技术架构与 H5 开发' : '技术开发实现'), status: 'pending', duration: 0 }
      ]

      await streamLogTyping('xiaomu', isRingtoneScenario ? `✅ 任务分配完成，执行流程：研究员（天翼智铃竞品分析）→ 产品经理（PRD& 原型设计）→ 研发工程师（H5 内测开发）` : (isUnicomScenario ? `✅ 任务分配完成，执行流程：研究员（联通调研）→ 产品经理（PRD& 原型）→ 研发工程师（H5 开发）` : `✅ 任务分配完成，按顺序执行：研究员 → 产品经理 → 研发工程师`), 'success', controller)
      await streamLogTyping('xiaomu', ``, 'info', controller)

      progress.value = 10

      // ===== 阶段 2: 串行执行三个专业 Agent 的任务 =====
      // 执行顺序：研究员（竞品分析）→ 产品经理（产品设计）→ 研发工程师（技术开发）

      // 2.1 研究员执行市场调研
      await streamLogTyping('xiaomu', isRingtoneScenario ? `📊 第一阶段：研究员进行天翼智铃竞品分析（产品/功能/技术/商业/用户五维对比）...` : (isUnicomScenario ? `📊 第一阶段：研究员进行联通助理&安全管家产品调研...` : `📊 第一阶段：研究员进行市场调研和竞品分析...`), 'info', controller)
      const result1 = await executeXiaoyanWorkflow(controller)
      if (!result1 || controller.signal.aborted) throw new Error('任务已取消')
      progress.value = 40

      // 2.2 产品经理执行产品分析
      await streamLogTyping('xiaomu', ``, 'info', controller)
      await streamLogTyping('xiaomu', isRingtoneScenario ? `📝 第二阶段：产品经理输出联通智铃 PRD 文档和 H5 原型设计（小鸿智能体 + 一键生成 + 一键设彩铃）...` : (isUnicomScenario ? `📝 第二阶段：产品经理输出 PRD 文档和 H5 原型设计...` : `📝 第二阶段：产品经理基于竞品分析进行产品设计...`), 'info', controller)
      const result2 = await executeXiaochanWorkflow(controller)
      if (!result2 || controller.signal.aborted) throw new Error('任务已取消')
      progress.value = 70

      // 2.3 研发工程师执行技术开发（基于 PRD）
      await streamLogTyping('xiaomu', ``, 'info', controller)
      await streamLogTyping('xiaomu', isRingtoneScenario ? `💻 第三阶段：研发工程师开发联通智铃 H5 内测 v2.0（4 个核心页面可演示）...` : (isUnicomScenario ? `💻 第三阶段：研发工程师基于 PRD 进行 H5 应用开发...` : `💻 第三阶段：研发工程师基于 PRD 进行技术开发...`), 'info', controller)
      const result3 = await executeXiaokaiWorkflow(controller)
      if (!result3 || controller.signal.aborted) throw new Error('任务已取消')
      progress.value = 90

      // ===== 阶段 3: 小呦汇总结果 =====
      await streamLogTyping('xiaomu', ``, 'info', controller)
      await streamLogTyping('xiaomu', `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'info', controller)
      await streamLogTyping('xiaomu', `📊 所有 Agent 任务执行完成，小呦开始汇总结果...`, 'info', controller)
      await streamLogTyping('xiaomu', `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'info', controller)

      await waitWithPause(800, controller)
      if (controller.signal.aborted) throw new Error('任务已取消')

      // 统计产出物
      const fileCount = generatedFiles.value.length
      await streamLogTyping('xiaomu', `📦 本次任务共产生 ${fileCount} 个产出文件：`, 'info', controller)
      await streamLogTyping('xiaomu', ``, 'info', controller)
      for (const f of generatedFiles.value) {
        await streamLogTyping('xiaomu', `   • ${f.fileName}`, 'info', controller)
      }
      await streamLogTyping('xiaomu', ``, 'info', controller)

      await waitWithPause(600, controller)
      await streamLogTyping('xiaomu', `📝 整合各 Agent 工作成果...`, 'info', controller)
      await waitWithPause(600, controller)
      await streamLogTyping('xiaomu', `📄 生成最终项目报告...`, 'info', controller)
      await waitWithPause(800, controller)

      // 更新进度
      progress.value = 100
      if (currentTask.value) {
        currentTask.value.progress = 100
        currentTask.value.status = 'completed'
      }

      // 添加完成日志
      await streamLogTyping('xiaomu', ``, 'info', controller)
      if (isRingtoneScenario) {
        await streamLogTyping('xiaomu', `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'info', controller)
        await streamLogTyping('xiaomu', `🎉 联通 AI 彩铃产品升级任务完成！`, 'success', controller)
        await streamLogTyping('xiaomu', `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'info', controller)
        await streamLogTyping('xiaomu', ``, 'info', controller)
        await streamLogTyping('xiaomu', `📦 项目产出清单：`, 'success', controller)
        await streamLogTyping('xiaomu', ``, 'info', controller)
        await streamLogTyping('xiaomu', `   🔍 研究员：`, 'info', controller)
        await streamLogTyping('xiaomu', `      • 天翼智铃竞品分析报告（五维对比矩阵）`, 'info', controller)
        await streamLogTyping('xiaomu', ``, 'info', controller)
        await streamLogTyping('xiaomu', `   📝 产品经理：`, 'info', controller)
        await streamLogTyping('xiaomu', `      • 联通智铃 PRD 需求文档`, 'info', controller)
        await streamLogTyping('xiaomu', `      • H5 原型设计`, 'info', controller)
        await streamLogTyping('xiaomu', ``, 'info', controller)
        await streamLogTyping('xiaomu', `   💻 研发工程师：`, 'info', controller)
        await streamLogTyping('xiaomu', `      • 技术架构设计文档`, 'info', controller)
        await streamLogTyping('xiaomu', `      • H5 内测 v2.0（4 个页面）`, 'info', controller)
        await streamLogTyping('xiaomu', ``, 'info', controller)
        await streamLogTyping('xiaomu', `   📋 项目管理：`, 'info', controller)
        await streamLogTyping('xiaomu', `      • 项目执行报告`, 'info', controller)
        await streamLogTyping('xiaomu', ``, 'info', controller)
        await streamLogTyping('xiaomu', `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'info', controller)
      } else if (isUnicomScenario) {
        await streamLogTyping('xiaomu', `🎉 联通智能客服 H5 应用开发完成！`, 'success', controller)
        await streamLogTyping('xiaomu', `📦 项目产出：`, 'success', controller)
        await streamLogTyping('xiaomu', `   🔍 研究员：联通助理&安全管家产品调研`, 'info', controller)
        await streamLogTyping('xiaomu', `   📝 产品经理：PRD 需求文档、H5 原型设计`, 'info', controller)
        await streamLogTyping('xiaomu', `   💻 研发工程师：技术架构设计、H5 应用代码、鸿鹄 API 集成`, 'info', controller)
        await streamLogTyping('xiaomu', `   📋 项目管理：项目执行报告`, 'info', controller)
      } else {
        await streamLogTyping('xiaomu', `🎉 联通 AI 彩铃产品升级任务完成！`, 'success', controller)
        await streamLogTyping('xiaomu', `📦 项目产出清单：`, 'success', controller)
        await streamLogTyping('xiaomu', `   🔍 研究员：天翼智铃竞品分析报告`, 'info', controller)
        await streamLogTyping('xiaomu', `   📝 产品经理：联通智铃 PRD 需求文档、H5 原型设计`, 'info', controller)
        await streamLogTyping('xiaomu', `   💻 研发工程师：技术架构设计、H5 内测 v2.0`, 'info', controller)
        await streamLogTyping('xiaomu', `   📋 项目管理：项目执行报告`, 'info', controller)
      }
      await streamLogTyping('xiaomu', `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'info', controller)

      // 更新小 U 状态
      agentsStore.completeAgentTask('xiaomu')

      // 任务完成
      status.value = 'completed'

    } catch (error) {
      if ((error as Error).message === '任务已取消') {
        status.value = 'idle'
        await streamLogTyping('xiaomu', '⛔ 任务已取消', 'warning', controller)
      } else {
        console.error('任务执行失败:', error)
        status.value = 'error'
        await streamLogTyping('xiaomu', '❌ 任务执行失败：' + (error as Error).message, 'error', controller)
      }
    } finally {
      abortController.value = null
    }
  }

  // 暂停执行
  async function pause() {
    isPaused.value = true
    await streamLogTyping('xiaomu', '⏸️ 任务已暂停', 'warning', controller)
  }

  // 继续执行
  async function resume() {
    isPaused.value = false
    await streamLogTyping('xiaomu', '▶️ 任务已继续', 'success', controller)
  }

  // 取消执行
  async function cancel() {
    if (abortController.value) {
      abortController.value.abort()
    }

    status.value = 'idle'
    currentTask.value = null
    progress.value = 0
    currentStepIndex.value = -1
    isPaused.value = false

    // 重置所有 Agent 状态（保留已完成任务统计）
    const agentsStore = useAgentsStore()
    agentsStore.resetAgentStatus()

    await streamLogTyping('xiaomu', '⛔ 任务已取消', 'warning', controller)
  }

  // 重试任务
  async function retry() {
    if (currentTask.value) {
      await executeTask(currentTask.value.title, currentTask.value.description)
    }
  }

  // 设置场景
  function setScenario(scenario: string) {
    currentScenario.value = scenario
    // 切换场景时清空日志和产出文件
    logs.value = []
    generatedFiles.value = []
  }

  return {
    // State
    currentTask,
    status,
    progress,
    currentStepIndex,
    logs,
    subTasks,
    isPaused,
    generatedFiles,
    currentScenario,
    // Getters
    currentStep,
    completedSteps,
    isExecuting,
    getAgentWorkDetails,
    // Actions
    addLog,
    clearLogs,
    executeTask,
    pause,
    resume,
    cancel,
    retry,
    setScenario
  }
})
