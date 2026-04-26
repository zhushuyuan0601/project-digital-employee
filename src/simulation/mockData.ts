// 模拟数据类型定义
import { AGENT_DEFINITIONS, type AgentRole } from '@/config/agents'
import type { TaskStatus } from '@/types/task'

// 执行日志
export interface ExecutionLog {
  id: string
  timestamp: number
  agentId: string
  agentName: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
}

// 任务执行步骤
export interface TaskStep {
  id: string
  description: string
  agentId: string
  status: TaskStatus
  output?: string
  duration: number // 模拟执行时间 (ms)
}

// 模拟响应模板
export interface MockResponseTemplate {
  keywords: string[]
  agentId: string
  steps: string[]
  finalOutput: string
}

// 预设的响应模板
export const MOCK_TEMPLATES: MockResponseTemplate[] = [
  {
    keywords: ['市场', '竞品', '调研', '分析', '研究'],
    agentId: 'xiaoyan',
    steps: [
      '正在收集市场数据和行业报告...',
      '分析主要竞争对手的产品特点...',
      '对比各竞品的功能差异...',
      '整理竞品定价策略...',
      '生成市场调研报告...'
    ],
    finalOutput: '✅ 市场调研完成！报告已生成，包含竞品分析、市场趋势、用户画像等关键信息。'
  },
  {
    keywords: ['产品', '需求', '设计', 'PRD', '原型', '功能'],
    agentId: 'xiaochan',
    steps: [
      '理解用户需求和业务目标...',
      '梳理功能列表和优先级...',
      '设计产品流程和交互...',
      '编写 PRD 文档...',
      '输出原型图...'
    ],
    finalOutput: '✅ 产品分析完成！PRD 文档和原型图已输出，包含功能列表、流程图、交互说明等。'
  },
  {
    keywords: ['开发', '代码', '实现', '编程', '技术', '系统', '搭建'],
    agentId: 'xiaokai',
    steps: [
      '设计技术架构和方案...',
      '搭建项目基础结构...',
      '编写核心业务代码...',
      '实现关键功能模块...',
      '进行单元测试和代码审查...'
    ],
    finalOutput: '✅ 开发完成！代码已提交，包含完整的功能实现、单元测试和技术文档。'
  },
  {
    keywords: ['测试', '验证', '质量', 'QA', '检查', '验收'],
    agentId: 'xiaoce',
    steps: [
      '制定测试计划和测试用例...',
      '执行功能测试和边界测试...',
      '进行兼容性和性能测试...',
      '记录和跟踪缺陷问题...',
      '编写测试报告和验收文档...'
    ],
    finalOutput: '✅ 测试完成！测试报告已生成，包含测试用例、缺陷列表、质量评估等。'
  },
  {
    keywords: ['文档', '写作', '文案', '报告', '总结', '计划'],
    agentId: 'xiaomu',
    steps: [
      '收集相关资料和素材...',
      '梳理文档结构和大纲...',
      '撰写各章节内容...',
      '校对和优化文字...',
      '格式化输出文档...'
    ],
    finalOutput: '✅ 文档撰写完成！文档已生成，结构清晰、内容完整。'
  }
]

// 默认模板（不匹配任何关键词时使用）
export const DEFAULT_TEMPLATE: MockResponseTemplate = {
  keywords: [],
  agentId: 'xiaomu',
  steps: [
    '分析任务内容和目标...',
    '拆解任务为可执行的子任务...',
    '协调各角色开始工作...',
    '收集各角色的输出结果...',
    '汇总并生成最终报告...'
  ],
  finalOutput: '✅ 任务完成！各角色协作完成，结果已汇总。'
}

// Agent 配置
export const AGENT_CONFIG: Record<string, { name: string; role: AgentRole; icon: string; description: string }> = Object.fromEntries(
  AGENT_DEFINITIONS.map((agent) => [
    agent.id,
    {
      name: agent.roleLabel,
      role: agent.roleType,
      icon: agent.icon,
      description: agent.description,
    },
  ])
) as Record<string, { name: string; role: AgentRole; icon: string; description: string }>
