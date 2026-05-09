import {
  agentPromptList,
  getCoordinatorAgent,
  roleDefinitions,
} from './agent-registry.js'

export const ROLE_DEFINITIONS = new Proxy({}, {
  get(_target, prop) {
    const roles = roleDefinitions()
    return roles[prop] || roles.xiaomu
  },
  ownKeys() {
    return Reflect.ownKeys(roleDefinitions())
  },
  getOwnPropertyDescriptor() {
    return { enumerable: true, configurable: true }
  },
})

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

const PLAN_CONSTRAINT = `计划模式约束：
- 你只负责诊断和拆解，不修改项目源码。
- 不调用工具，不读取 .env、密钥文件、令牌、私有凭证。
- 不要读取、引用或推断其他 taskId 的历史报告、历史成果或历史会话。
- 信息不足时明确列出假设或澄清问题。`

const CODE_EXECUTION_CONSTRAINT = `编码执行约束：
- 你必须在当前工作目录内完成实际文件修改；不要只给代码建议。
- 当前工作目录就是本节点允许操作的目标项目目录。
- 允许使用读写文件工具和 Bash 执行项目已有的构建、测试或语法检查命令。
- 不读取 .env、密钥文件、令牌、私有凭证。
- 不执行破坏性命令，不删除无关文件，不重构无关代码，不安装依赖，除非任务明确要求且风险已说明。
- 若无法安全修改，必须明确说明阻塞原因，并不要伪造已修改文件。
- 最终仍需输出 Markdown 报告，包含：结论、修改文件、实现说明、验证结果、风险。`

const TEST_EXECUTION_CONSTRAINT = `测试执行约束：
- 你必须基于当前工作目录中的真实项目状态执行可用验证；不要只给测试建议。
- 允许使用读写文件工具和 Bash 执行项目已有的构建、测试或语法检查命令。
- 如需新增低风险测试文件或修正测试配置，可在当前工作目录内修改。
- 不读取 .env、密钥文件、令牌、私有凭证。
- 不执行破坏性命令，不删除无关文件，不安装依赖，除非任务明确要求且风险已说明。
- 若无法执行验证，必须明确说明阻塞原因和已检查依据。
- 最终输出 Markdown 报告，包含：结论、验证命令、验证结果、修改文件、风险。`

function coordinatorId() {
  return getCoordinatorAgent()?.id || 'xiaomu'
}

export function getRoleDefinition(agentId) {
  const roles = roleDefinitions()
  return roles[agentId] || roles[coordinatorId()] || roles.xiaomu || {
    name: String(agentId || 'agent'),
    roleName: String(agentId || 'agent'),
    reportName: `${String(agentId || 'agent')}-报告`,
    description: '通用任务执行',
    boundary: '严格基于任务上下文执行，不越权完成其他角色职责。',
  }
}

function constraintForExecutionMode(executionMode = 'report') {
  if (executionMode === 'code') return CODE_EXECUTION_CONSTRAINT
  if (executionMode === 'test') return TEST_EXECUTION_CONSTRAINT
  return REPORT_ONLY_CONSTRAINT
}

export function buildAgentPrompt(agentId, taskContext, options = {}) {
  const role = getRoleDefinition(agentId)
  return `你是${role.name}，角色定位：${role.description}。
角色边界：${role.boundary}

${constraintForExecutionMode(options.executionMode)}

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

${PLAN_CONSTRAINT}

必须只输出一个 JSON 对象，不要输出 Markdown、代码围栏或解释文字。平台会直接解析你的 JSON。

任务 ID: ${task.id}
任务标题: ${task.title}
目标项目目录: ${task.project_cwd || '未指定，使用系统默认 Runtime CWD'}
任务描述:
${task.description}
${clarificationContext}
${existingPlanContext}
${feedbackContext}

会话维护规则：
- 如果当前 Claude session 是续接会话，只能延续本 taskId 的澄清、方案反馈和规划上下文。
- 不要引用其他 taskId、其他项目或群聊中的历史上下文。
- 若 session 记忆与本提示中的任务描述/补充信息冲突，以本提示为准。

可选执行 Agent 来自平台 Registry，只能选择下列 enabled 且非统筹的 Agent：
${agentPromptList() || '- 暂无可执行 Agent。'}

诊断原则：
- 如果目标、范围、输入材料、时间要求或验收口径不足以真实拆解，输出 decision=need_clarification，并提出最少但关键的问题。
- 如果信息足够，输出 decision=ready_to_plan。
- 不要为了使用 Agent 而使用 Agent，只选择任务真正需要的专业 Agent。
- 简单任务可以只生成 1 个执行节点；复杂任务可以拆成多个节点。
- 不要套用固定流程；不强制研究、产品、研发、测试全部参与。
- participants 只列出本次任务实际需要的 Agent，并写明选择原因。
- workflow 是 1-N 个节点的阶段 + DAG。每个节点必须写清 phase、dependsOn、requiredInputs、expectedOutputs、executionMode、successCriteria。
- phase 只用于展示和归类，真实执行顺序由 dependsOn 决定。
- 小呦不作为 workflow 执行节点，只负责规划和最终汇总。
- 默认 topology=hierarchical；如果多个无依赖节点适合并发可用 parallel；高风险交付可用 review-gate。
- 默认 executionMode=report。只有任务明确需要开发实现时才使用 code；只有存在可验证产物时才使用 test。
- 如果这是基于用户反馈的重新规划，必须保留合理的原计划内容，只调整用户要求或明显不合理的部分。

JSON 输出结构：
- 需要澄清时：{"decision":"need_clarification","taskTitle":"...","knownFacts":["..."],"missingInformation":["..."],"questions":[{"id":"q1","question":"...","reason":"...","required":true}]}
- 可以执行时：{"decision":"ready_to_plan","taskTitle":"...","topology":"hierarchical|parallel|review-gate","goal":"...","knownFacts":["..."],"missingInformation":[],"questions":[],"planningNotes":["..."],"changeSummary":["..."],"participants":[{"agentId":"xiaokai","needed":true,"reason":"..."}],"workflow":[{"id":"node-01","title":"...","phase":"engineering","assignedAgentId":"xiaokai","objective":"...","dependsOn":[],"requiredInputs":["..."],"expectedOutputs":["..."],"executionMode":"code","successCriteria":["..."],"requiredTools":["Read","Glob","Grep"],"riskLevel":"medium","agentCapabilityHints":["..."]}],"acceptanceCriteria":["..."]}`
}

export function buildSubtaskPrompt(task, subtask) {
  const nodeContext = subtask.context_json || {}
  const dependsOn = Array.isArray(nodeContext.dependsOn) ? nodeContext.dependsOn : []
  const upstreamSubtasks = (task.subtasks || []).filter((item) => dependsOn.includes(item.context_json?.workflowNodeId || item.id))
  const upstreamOutputs = (task.outputs || []).filter((output) => upstreamSubtasks.some((item) => item.id === output.subtask_id))
  const upstreamSummary = upstreamSubtasks.length
    ? upstreamSubtasks.map((item) => `- ${item.title} (${getRoleDefinition(item.assigned_agent_id)?.name || item.assigned_agent_id})\n  状态: ${item.status}\n  摘要: ${item.result_summary || '暂无摘要'}`).join('\n')
    : '- 无前置节点'
  const upstreamFiles = upstreamOutputs.length
    ? upstreamOutputs.map((output) => `- ${output.name}: ${output.path || output.git_url || '无路径'}`).join('\n')
    : '- 无前置文件'
  const role = getRoleDefinition(subtask.assigned_agent_id)
  const executionMode = nodeContext.executionMode || 'report'
  const successCriteria = Array.isArray(nodeContext.successCriteria) && nodeContext.successCriteria.length
    ? nodeContext.successCriteria.map((item) => `- ${item}`).join('\n')
    : '- 输出满足节点目标并可供下游使用'
  const requiredTools = Array.isArray(nodeContext.requiredTools) && nodeContext.requiredTools.length
    ? nodeContext.requiredTools.join('、')
    : '按平台为该节点裁剪后的工具权限执行'

  const context = `taskId: ${task.id}
subTaskId: ${subtask.id}
主任务标题: ${task.title}
主任务目标: ${task.plan_json?.goal || task.description}
目标项目目录: ${task.project_cwd || '未指定，使用系统默认 Runtime CWD'}
当前阶段: ${subtask.context_json?.phase || 'review'}
执行模式: ${executionMode}
角色边界: ${role.boundary}
节点所需工具: ${requiredTools}
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

  return buildAgentPrompt(subtask.assigned_agent_id, context, { executionMode })
}

export function buildFinalSummaryPrompt(task) {
  const subtasks = (task.subtasks || [])
    .map((subtask) => `- ${subtask.title} (${getRoleDefinition(subtask.assigned_agent_id)?.name || subtask.assigned_agent_id}): ${subtask.result_summary || subtask.status}`)
    .join('\n')
  const outputs = (task.outputs || [])
    .map((output) => `- ${output.name} (${output.agent_id || 'unknown'}): ${output.path || output.git_url || '无路径'}`)
    .join('\n') || '- 暂无文件产出'

  return buildAgentPrompt(coordinatorId(), `任务 ID: ${task.id}
任务标题: ${task.title}
任务目标: ${task.plan_json?.goal || task.description}
目标项目目录: ${task.project_cwd || '未指定，使用系统默认 Runtime CWD'}
调度拓扑: ${task.plan_json?.topology || 'hierarchical'}

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
      topology: { type: 'string', enum: ['hierarchical', 'parallel', 'review-gate'] },
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
            agentId: { type: 'string' },
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
            assignedAgentId: { type: 'string' },
            objective: { type: 'string' },
            dependsOn: { type: 'array', items: { type: 'string' } },
            requiredInputs: { type: 'array', items: { type: 'string' } },
            expectedOutputs: { type: 'array', items: { type: 'string' } },
            executionMode: { type: 'string', enum: ['report', 'code', 'test'] },
            successCriteria: { type: 'array', items: { type: 'string' } },
            skipCondition: { type: 'string' },
            requiredTools: { type: 'array', items: { type: 'string' } },
            riskLevel: { type: 'string' },
            agentCapabilityHints: { type: 'array', items: { type: 'string' } },
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
