// 任务分析器 - 通过 Gateway 让项目管理（ceo）分析任务
import { useTaskGatewayStore } from '@/stores/taskGateway'
import { AGENT_DEFINITIONS } from '@/config/agents'

// 任务执行步骤
export interface TaskStep {
  id: string
  description: string
  agentId: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  duration: number
}

// Agent 角色配置
export const AGENT_CONFIG: Record<string, { name: string; icon: string; description: string; role: string }> = Object.fromEntries(
  AGENT_DEFINITIONS.map((agent) => [
    agent.id,
    {
      name: agent.name,
      icon: agent.icon,
      description: agent.roleLabel,
      role: agent.roleType,
    },
  ])
) as Record<string, { name: string; icon: string; description: string; role: string }>

/**
 * 通过 Gateway 让项目管理（ceo）分析任务
 */
async function analyzeTaskWithGateway(taskDescription: string): Promise<TaskStep[]> {
  console.log('[TaskAnalyzer] 开始分析任务，使用 Gateway Agent...')

  const gatewayStore = useTaskGatewayStore()

  // 构建任务分析提示
  const prompt = `你是一个智能任务调度助手（项目统筹）。请分析用户任务，并将其拆解为多个可执行的子任务，分配给不同的 Agent 角色执行。

Agent 角色说明：
- xiaomu (小呦): 项目统筹，负责任务调度、文档撰写、汇总报告
- xiaokai (研发工程师): 技术开发，负责代码实现、技术研发
- xiaochan (产品经理): 产品设计，负责需求分析、产品设计
- xiaoyan (研究员): 调研分析，负责市场调研、竞品分析
- xiaoce (测试员): 质量检查，负责测试验证、质量保障

任务描述：${taskDescription}

请返回 JSON 格式的任务拆解结果：
{
  "steps": [
    {
      "agentId": "xiaomu" | "xiaokai" | "xiaochan" | "xiaoyan",
      "description": "任务描述",
      "duration": 3000-10000
    }
  ]
}

示例："帮我分析一下竞品市场情况" 的拆解:
{"steps":[{"agentId":"xiaomu","description":"项目统筹：分析任务需求，确定调研方向","duration":3000},{"agentId":"xiaoyan","description":"研究员：收集行业市场数据和报告","duration":5000},{"agentId":"xiaoyan","description":"研究员：分析主要竞品的功能特点","duration":5000},{"agentId":"xiaomu","description":"项目统筹：汇总调研结果，生成最终报告","duration":3000}]}

现在请分析以下任务：${taskDescription}

只返回 JSON：`

  try {
    // 发送任务给项目管理进行分析
    const success = gatewayStore.sendMessageToAgent('xiaomu', prompt)

    if (!success) {
      throw new Error('项目管理未连接，无法分析任务')
    }

    // 等待项目管理返回任务分析结果
    const analysisResult = await waitForTaskAnalysis('xiaomu', 60000)

    console.log('[TaskAnalyzer] 项目管理返回的任务分析结果:', analysisResult)

    // 解析返回的 JSON
    const parsed = parseJsonResponse<{ steps: Array<{ agentId: string; description: string; duration: number }> }>(analysisResult)

    if (parsed && parsed.steps && parsed.steps.length > 0) {
      const baseTime = Date.now()
      const steps: TaskStep[] = parsed.steps.map((step, index) => ({
        id: `step_${baseTime}_${index}`,
        description: step.description || `执行任务 - ${index + 1}`,
        agentId: step.agentId || 'xiaomu',
        status: 'pending' as const,
        duration: Math.max(3000, Math.min(10000, step.duration || 5000))
      }))

      console.log('[TaskAnalyzer] Gateway Agent 分析成功，步骤数:', steps.length)
      return steps
    }

    throw new Error('项目管理返回的任务分析结果解析失败')
  } catch (error) {
    console.error('[TaskAnalyzer] Gateway Agent 分析失败:', error)
    throw error
  }
}

/**
 * 等待任务分析完成
 */
function waitForTaskAnalysis(agentId: string, timeout: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      gatewayStore.removeMessageListener(listener)
      reject(new Error('任务分析超时'))
    }, timeout)

    let accumulatedContent = ''

    const listener = (message: any) => {
      if (message.agentId === agentId) {
        if (message.type === 'task_completed' || message.type === 'task_assigned') {
          clearTimeout(timer)
          gatewayStore.removeMessageListener(listener)
          resolve(accumulatedContent || message.content)
        } else if (message.type === 'task_error') {
          clearTimeout(timer)
          gatewayStore.removeMessageListener(listener)
          reject(new Error(message.content))
        } else if (message.type === 'task_progress') {
          accumulatedContent += message.content
        }
      }
    }

    const gatewayStore = useTaskGatewayStore()
    gatewayStore.addMessageListener(listener)
  })
}

/**
 * 分析任务（主入口函数）
 */
export async function analyzeTask(taskDescription: string): Promise<TaskStep[]> {
  return analyzeTaskWithGateway(taskDescription)
}

/**
 * 解析 AI 返回的 JSON 响应
 */
function parseJsonResponse<T>(content: string): T | null {
  try {
    // 尝试从响应中提取 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }

    // 尝试直接解析
    const trimmed = content.trim()
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return JSON.parse(trimmed)
    }

    return null
  } catch (err) {
    console.warn('[TaskAnalyzer] JSON 解析失败:', err)
    return null
  }
}
