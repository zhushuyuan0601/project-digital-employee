export const ROLE_DEFINITIONS = {
  xiaomu: {
    name: '小呦',
    roleName: '项目统筹',
    reportName: '小呦-任务拆解',
    description: '统筹、任务拆解、最终汇总',
  },
  xiaokai: {
    name: '研发工程师',
    roleName: '技术开发',
    reportName: '研发工程师-技术方案报告',
    description: '技术方案、代码阅读、实现建议',
  },
  xiaochan: {
    name: '产品经理',
    roleName: '产品设计',
    reportName: '产品经理-需求分析报告',
    description: '需求分析、PRD、流程方案',
  },
  xiaoyan: {
    name: '研究员',
    roleName: '调研分析',
    reportName: '研究员-调研报告',
    description: '调研、竞品、资料分析',
  },
  xiaoce: {
    name: '测试员',
    roleName: '质量检查',
    reportName: '测试员-测试验收报告',
    description: '测试方案、验收标准、风险清单',
  },
}

const REPORT_ONLY_CONSTRAINT = `工作模式约束：
- 你只产出 Markdown 报告，不修改项目源码。
- 如需给出代码建议，只能写在 Markdown 代码块中。
- 不调用会修改文件、密钥、系统目录或环境配置的工具。
- 不读取 .env、密钥文件、令牌、私有凭证。
- 你运行在当前任务专属隔离工作空间内，只能使用该工作空间中的项目快照作为依据。
- 不要读取、引用或推断其他 taskId 的历史报告、历史成果或历史会话。
- 不执行破坏性命令，不安装依赖，不启动长时间服务。
- 信息不足时明确列出假设。
- 报告必须包含：结论、依据、风险、建议、交付物。`

export function buildAgentPrompt(agentId, taskContext) {
  const role = ROLE_DEFINITIONS[agentId] || ROLE_DEFINITIONS.xiaomu
  return `你是${role.name}，角色定位：${role.description}。

${REPORT_ONLY_CONSTRAINT}

任务上下文：
${taskContext}

请输出一份结构清晰、可直接归档的 Markdown 报告。`
}

export function buildCoordinatorPlanPrompt(task) {
  return `你是小呦，负责把复杂任务拆解给内置角色执行。

${REPORT_ONLY_CONSTRAINT}

请基于以下任务生成结构化任务拆解。必须只输出符合 schema 的 JSON，不要输出解释文字。

任务 ID: ${task.id}
任务标题: ${task.title}
任务描述:
${task.description}

可选执行 Agent：
- xiaoyan: 研究员，负责调研、竞品、资料分析
- xiaochan: 产品经理，负责需求分析、PRD、流程方案
- xiaokai: 研发工程师，负责技术方案、代码阅读、实现建议
- xiaoce: 测试员，负责测试方案、验收标准、风险清单

拆解原则：
- 子任务数量控制在 2-5 个。
- assignedAgentId 只能是 xiaoyan、xiaochan、xiaokai、xiaoce。
- 不要把执行子任务分配给小呦。
- 每个子任务都必须能产出独立 Markdown 报告。`
}

export function buildSubtaskPrompt(task, subtask) {
  const context = `taskId: ${task.id}
subTaskId: ${subtask.id}
主任务标题: ${task.title}
主任务目标: ${task.plan_json?.goal || task.description}
子任务标题: ${subtask.title}
子任务描述:
${subtask.description}

期望产出:
${subtask.expected_output || '请输出清晰的执行结果、关键依据和下一步建议。'}`

  return buildAgentPrompt(subtask.assigned_agent_id, context)
}

export function buildFinalSummaryPrompt(task) {
  const subtasks = (task.subtasks || [])
    .map((subtask) => `- ${subtask.title} (${ROLE_DEFINITIONS[subtask.assigned_agent_id]?.name || subtask.assigned_agent_id}): ${subtask.result_summary || subtask.status}`)
    .join('\n')
  const outputs = (task.outputs || [])
    .map((output) => `- ${output.name} (${output.agent_id || 'unknown'}): ${output.path || output.git_url || '无路径'}`)
    .join('\n') || '- 暂无文件产出'

  return buildAgentPrompt('xiaomu', `任务 ID: ${task.id}
任务标题: ${task.title}
任务目标: ${task.plan_json?.goal || task.description}

子任务状态:
${subtasks}

成果文件:
${outputs}

请输出最终汇总报告，包含整体结论、各 Agent 贡献、可验收产出、风险和下一步建议。`)
}

export const PLAN_OUTPUT_FORMAT = {
  type: 'json_schema',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['taskTitle', 'goal', 'subtasks', 'acceptanceCriteria'],
    properties: {
      taskTitle: { type: 'string' },
      goal: { type: 'string' },
      subtasks: {
        type: 'array',
        minItems: 1,
        maxItems: 5,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'description', 'assignedAgentId', 'expectedOutput'],
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            assignedAgentId: { type: 'string', enum: ['xiaoyan', 'xiaochan', 'xiaokai', 'xiaoce'] },
            expectedOutput: { type: 'string' },
          },
        },
      },
      acceptanceCriteria: {
        type: 'array',
        items: { type: 'string' },
      },
    },
  },
}
