export const ROLE_DEFINITIONS = {
  xiaomu: {
    name: '小呦',
    roleName: '项目统筹',
    reportName: '小呦-任务拆解',
    description: '统筹、任务拆解、最终汇总',
    boundary: '只负责诊断、规划、协调、阶段复盘和最终汇总，不承担具体调研、产品、研发或测试执行。',
  },
  xiaokai: {
    name: '研发工程师',
    roleName: '技术开发',
    reportName: '研发工程师-技术方案报告',
    description: '技术方案、代码阅读、实现建议',
    boundary: '负责技术方案、代码阅读、工程实现和落地建议；不得替产品定义需求，不得替测试出最终验收结论。',
  },
  xiaochan: {
    name: '产品经理',
    roleName: '产品设计',
    reportName: '产品经理-需求分析报告',
    description: '需求分析、PRD、流程方案',
    boundary: '负责需求、PRD、流程、用户场景和验收口径；不得替研发做实现，不得替测试执行验证。',
  },
  xiaoyan: {
    name: '研究员',
    roleName: '调研分析',
    reportName: '研究员-调研报告',
    description: '调研、竞品、资料分析',
    boundary: '负责背景、市场、竞品、资料和事实依据分析；不得直接给出工程实现或测试验收结论。',
  },
  xiaoce: {
    name: '测试员',
    roleName: '质量检查',
    reportName: '测试员-测试验收报告',
    description: '测试方案、验收标准、风险清单',
    boundary: '负责基于产品/研发产物做测试设计、风险验证和验收建议；没有可验证产物时必须说明阻塞。',
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
角色边界：${role.boundary}

${REPORT_ONLY_CONSTRAINT}

任务上下文：
${taskContext}

请输出一份结构清晰、可直接归档的 Markdown 报告。`
}

export function buildCoordinatorPlanPrompt(task) {
  const clarificationContext = task.plan_json?.clarificationAnswers
    ? `\n用户补充信息：\n${JSON.stringify(task.plan_json.clarificationAnswers, null, 2)}\n`
    : ''
  const existingPlanContext = task.plan_json?.decision === 'ready_to_plan'
    ? `\n当前已有协作计划：\n${JSON.stringify(task.plan_json, null, 2)}\n`
    : ''
  const feedbackContext = task.plan_json?.planFeedback
    ? `\n用户对当前方案的提问或修改意见：\n${task.plan_json.planFeedback}\n\n请基于该反馈重新诊断并输出最新版 JSON。若用户是在提问，请在 planningNotes 中回答；若用户要求修改，请反映到 participants/workflow/acceptanceCriteria，并在 changeSummary 中说明变化。\n`
    : ''

  return `你是小呦，负责先诊断任务是否清楚，再动态规划多 Agent 协作流程。

${REPORT_ONLY_CONSTRAINT}

必须只输出符合 schema 的 JSON，不要输出解释文字。

任务 ID: ${task.id}
任务标题: ${task.title}
任务描述:
${task.description}
${clarificationContext}
${existingPlanContext}
${feedbackContext}

可选执行 Agent：
- xiaoyan: 研究员，负责调研、竞品、资料分析
- xiaochan: 产品经理，负责需求分析、PRD、流程方案
- xiaokai: 研发工程师，负责技术方案、代码阅读、实现建议
- xiaoce: 测试员，负责测试方案、验收标准、风险清单

诊断原则：
- 如果目标、范围、输入材料、时间要求或验收口径不足以真实拆解，输出 decision=need_clarification，并提出最少但关键的问题。
- 如果信息足够，输出 decision=ready_to_plan。
- 不要默认四个 Agent 都参与，只让任务真正需要的角色参与。
- participants 必须覆盖 xiaoyan、xiaochan、xiaokai、xiaoce，并写明参与或不参与原因。
- workflow 是阶段 + DAG。每个节点必须写清 phase、dependsOn、requiredInputs、expectedOutputs、executionMode、successCriteria。
- 测试节点必须依赖至少一个研发节点；研发节点如依赖产品方案，必须显式 dependsOn 产品节点。
- 小呦不作为 workflow 执行节点，只负责规划和最终汇总。
- 默认 executionMode=report。只有任务明确需要开发实现时，研发可用 code；只有存在研发产物时，测试可用 test。
- 如果这是基于用户反馈的重新规划，必须保留合理的原计划内容，只调整用户要求或明显不合理的部分。`
}

export function buildSubtaskPrompt(task, subtask) {
  const nodeContext = subtask.context_json || {}
  const dependsOn = Array.isArray(nodeContext.dependsOn) ? nodeContext.dependsOn : []
  const upstreamSubtasks = (task.subtasks || []).filter((item) => dependsOn.includes(item.context_json?.workflowNodeId || item.id))
  const upstreamOutputs = (task.outputs || []).filter((output) => upstreamSubtasks.some((item) => item.id === output.subtask_id))
  const upstreamSummary = upstreamSubtasks.length
    ? upstreamSubtasks.map((item) => `- ${item.title} (${ROLE_DEFINITIONS[item.assigned_agent_id]?.name || item.assigned_agent_id})\n  状态: ${item.status}\n  摘要: ${item.result_summary || '暂无摘要'}`).join('\n')
    : '- 无前置节点'
  const upstreamFiles = upstreamOutputs.length
    ? upstreamOutputs.map((output) => `- ${output.name}: ${output.path || output.git_url || '无路径'}`).join('\n')
    : '- 无前置文件'
  const role = ROLE_DEFINITIONS[subtask.assigned_agent_id] || ROLE_DEFINITIONS.xiaomu
  const executionMode = nodeContext.executionMode || 'report'
  const successCriteria = Array.isArray(nodeContext.successCriteria) && nodeContext.successCriteria.length
    ? nodeContext.successCriteria.map((item) => `- ${item}`).join('\n')
    : '- 输出满足节点目标并可供下游使用'

  const context = `taskId: ${task.id}
subTaskId: ${subtask.id}
主任务标题: ${task.title}
主任务目标: ${task.plan_json?.goal || task.description}
当前阶段: ${subtask.context_json?.phase || 'review'}
执行模式: ${executionMode}
角色边界: ${role.boundary}
子任务标题: ${subtask.title}
子任务描述:
${subtask.description}

前置依赖节点:
${upstreamSummary}

前置产物文件:
${upstreamFiles}

期望产出:
${subtask.expected_output || '请输出清晰的执行结果、关键依据和下一步建议。'}

成功标准:
${successCriteria}

请严格基于上游产物和当前节点目标执行，不要越权完成其他角色职责。`

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
    required: ['decision', 'taskTitle'],
    properties: {
      decision: { type: 'string', enum: ['need_clarification', 'ready_to_plan'] },
      taskTitle: { type: 'string' },
      knownFacts: { type: 'array', items: { type: 'string' } },
      missingInformation: { type: 'array', items: { type: 'string' } },
      questions: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'question', 'reason', 'required'],
          properties: {
            id: { type: 'string' },
            question: { type: 'string' },
            reason: { type: 'string' },
            required: { type: 'boolean' },
          },
        },
      },
      goal: { type: 'string' },
      planningNotes: { type: 'array', items: { type: 'string' } },
      changeSummary: { type: 'array', items: { type: 'string' } },
      participants: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['agentId', 'needed', 'reason'],
          properties: {
            agentId: { type: 'string', enum: ['xiaoyan', 'xiaochan', 'xiaokai', 'xiaoce'] },
            needed: { type: 'boolean' },
            reason: { type: 'string' },
          },
        },
      },
      workflow: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'title', 'phase', 'assignedAgentId', 'objective', 'dependsOn', 'requiredInputs', 'expectedOutputs', 'executionMode', 'successCriteria'],
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            phase: { type: 'string', enum: ['research', 'product', 'design', 'engineering', 'testing', 'review', 'summary'] },
            assignedAgentId: { type: 'string', enum: ['xiaoyan', 'xiaochan', 'xiaokai', 'xiaoce'] },
            objective: { type: 'string' },
            dependsOn: { type: 'array', items: { type: 'string' } },
            requiredInputs: { type: 'array', items: { type: 'string' } },
            expectedOutputs: { type: 'array', items: { type: 'string' } },
            executionMode: { type: 'string', enum: ['report', 'code', 'test'] },
            successCriteria: { type: 'array', items: { type: 'string' } },
            skipCondition: { type: 'string' },
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
