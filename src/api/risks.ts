import type {
  RiskItem,
  AlertRule,
  RiskListResponse,
  RiskResponse,
  RiskStatsResponse,
  AlertRuleListResponse,
  RiskLevel,
  RiskStatus,
  RiskCategory,
} from '@/types/risk'

const SIMULATED_DELAY_MS = 300

function delay<T>(data: T, ms = SIMULATED_DELAY_MS): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(data), ms))
}

function now(): string {
  return new Date().toISOString()
}

// ─── In-memory data store ───

let risks: RiskItem[] = [
  {
    id: 'risk-001',
    projectId: 'default',
    title: '核心依赖库存在安全漏洞',
    description: '项目使用的 lodash 版本存在原型链污染漏洞，需升级至 4.17.21+，该漏洞可能导致恶意构造的请求数据覆盖对象原型链上的属性。',
    category: 'technical',
    level: 'high',
    status: 'mitigating',
    probability: 4,
    impact: 5,
    owner: '张三',
    createdBy: '李四',
    createdAt: '2026-05-01T09:00:00Z',
    updatedAt: '2026-05-05T14:30:00Z',
    dueDate: '2026-05-15T00:00:00Z',
    mitigationPlan: '升级 lodash 至最新版，补充回归测试',
    resolution: '',
    alertStatus: 'triggered',
    lastAlertAt: '2026-05-10T08:00:00Z',
    tags: ['安全', '依赖'],
  },
  {
    id: 'risk-002',
    projectId: 'default',
    title: '前端构建时间超过 10 分钟',
    description: '随着模块数量增加，Vite 全量构建时间已超 10 分钟，影响发版效率。',
    category: 'technical',
    level: 'medium',
    status: 'monitoring',
    probability: 5,
    impact: 3,
    owner: '王五',
    createdBy: '王五',
    createdAt: '2026-04-28T10:00:00Z',
    updatedAt: '2026-05-02T16:00:00Z',
    dueDate: '2026-05-20T00:00:00Z',
    mitigationPlan: '评估模块拆分 + 增量构建方案',
    resolution: '',
    alertStatus: 'none',
    lastAlertAt: null,
    tags: ['性能', '构建'],
  },
  {
    id: 'risk-003',
    projectId: 'default',
    title: '关键开发人员请假导致进度延期',
    description: '核心后端工程师请假 2 周，API 开发进度滞后。',
    category: 'resource',
    level: 'high',
    status: 'open',
    probability: 5,
    impact: 4,
    owner: '赵六',
    createdBy: '李四',
    createdAt: '2026-05-03T11:00:00Z',
    updatedAt: '2026-05-03T11:00:00Z',
    dueDate: '2026-05-10T00:00:00Z',
    mitigationPlan: '',
    resolution: '',
    alertStatus: 'triggered',
    lastAlertAt: '2026-05-10T08:00:00Z',
    tags: ['人员', '进度'],
  },
  {
    id: 'risk-004',
    projectId: 'default',
    title: '第三方 API 限流策略变更',
    description: '外部支付接口可能调整限流阈值，影响交易峰值处理能力。',
    category: 'external',
    level: 'critical',
    status: 'open',
    probability: 3,
    impact: 5,
    owner: '李四',
    createdBy: '李四',
    createdAt: '2026-05-08T08:00:00Z',
    updatedAt: '2026-05-08T08:00:00Z',
    dueDate: '2026-05-12T00:00:00Z',
    mitigationPlan: '联系第三方确认策略，准备降级方案',
    resolution: '',
    alertStatus: 'triggered',
    lastAlertAt: '2026-05-10T08:00:00Z',
    tags: ['外部依赖', '支付'],
  },
  {
    id: 'risk-005',
    projectId: 'default',
    title: '需求变更频繁导致范围蔓延',
    description: '客户在迭代期间频繁提出新需求，项目范围持续扩大。',
    category: 'scope',
    level: 'medium',
    status: 'monitoring',
    probability: 4,
    impact: 3,
    owner: '张三',
    createdBy: '张三',
    createdAt: '2026-04-20T09:00:00Z',
    updatedAt: '2026-04-25T11:00:00Z',
    dueDate: '2026-05-30T00:00:00Z',
    mitigationPlan: '建立变更控制委员会，所有变更需走审批流程',
    resolution: '',
    alertStatus: 'none',
    lastAlertAt: null,
    tags: ['需求', '范围'],
  },
  {
    id: 'risk-006',
    projectId: 'default',
    title: '测试环境数据库偶尔宕机',
    description: '测试环境数据库每周约 1-2 次意外重启，影响测试进度。',
    category: 'quality',
    level: 'low',
    status: 'accepted',
    probability: 2,
    impact: 2,
    owner: '王五',
    createdBy: '王五',
    createdAt: '2026-04-15T14:00:00Z',
    updatedAt: '2026-04-22T10:00:00Z',
    dueDate: null,
    mitigationPlan: '',
    resolution: '已接受该风险，测试团队调整测试计划规避影响',
    alertStatus: 'none',
    lastAlertAt: null,
    tags: ['测试', '基础设施'],
  },
  {
    id: 'risk-007',
    projectId: 'default',
    title: '新入职员工培训周期长',
    description: '3 名新入职开发人员需要较长时间熟悉项目架构和业务逻辑。',
    category: 'resource',
    level: 'low',
    status: 'closed',
    probability: 3,
    impact: 2,
    owner: '赵六',
    createdBy: '赵六',
    createdAt: '2026-03-10T09:00:00Z',
    updatedAt: '2026-04-10T16:00:00Z',
    dueDate: '2026-04-10T00:00:00Z',
    mitigationPlan: '',
    resolution: '新员工已完成培训并独立承担模块开发',
    alertStatus: 'none',
    lastAlertAt: null,
    tags: ['人员', '培训'],
  },
  {
    id: 'risk-008',
    projectId: 'default',
    title: '安全审计发现高危漏洞',
    description: '第三方安全审计发现用户认证模块存在 SQL 注入漏洞，需紧急修复。',
    category: 'technical',
    level: 'critical',
    status: 'mitigating',
    probability: 5,
    impact: 5,
    owner: '李四',
    createdBy: '安全团队',
    createdAt: '2026-05-09T07:00:00Z',
    updatedAt: '2026-05-10T09:00:00Z',
    dueDate: '2026-05-13T00:00:00Z',
    mitigationPlan: '立即修复 SQL 注入漏洞，全面审查数据库查询代码',
    resolution: '',
    alertStatus: 'triggered',
    lastAlertAt: '2026-05-10T08:00:00Z',
    tags: ['安全', '漏洞', '紧急'],
  },
]

let alertRules: AlertRule[] = [
  {
    id: 'rule-high-level',
    name: '高风险自动预警',
    enabled: true,
    triggerCondition: {
      levelThreshold: 'high',
      daysBeforeDue: null,
      statusFilter: ['open', 'monitoring', 'mitigating'],
    },
    notificationType: 'in-app',
    cooldownMinutes: 240,
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z',
  },
  {
    id: 'rule-due-3days',
    name: '截止前 3 天提醒',
    enabled: true,
    triggerCondition: {
      levelThreshold: null,
      daysBeforeDue: 3,
      statusFilter: ['open', 'monitoring', 'mitigating'],
    },
    notificationType: 'in-app',
    cooldownMinutes: 1440,
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z',
  },
  {
    id: 'rule-overdue',
    name: '过期未处理预警',
    enabled: true,
    triggerCondition: {
      levelThreshold: null,
      daysBeforeDue: 0,
      statusFilter: ['open', 'monitoring', 'mitigating'],
    },
    notificationType: 'in-app',
    cooldownMinutes: 1440,
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z',
  },
]

// ─── Risk API ───

function generateId(): string {
  return `risk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const levelOrder: Record<RiskLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 }

export const riskApi = {
  async listRisks(params: {
    page?: number
    pageSize?: number
    level?: RiskLevel[]
    status?: RiskStatus[]
    category?: RiskCategory[]
    owner?: string
    keyword?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  } = {}): Promise<RiskListResponse> {
    const {
      page = 1,
      pageSize = 20,
      level,
      status,
      category,
      owner,
      keyword,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params

    let filtered = [...risks]

    if (level?.length) {
      filtered = filtered.filter(r => level.includes(r.level))
    }
    if (status?.length) {
      filtered = filtered.filter(r => status.includes(r.status))
    }
    if (category?.length) {
      filtered = filtered.filter(r => category.includes(r.category))
    }
    if (owner) {
      filtered = filtered.filter(r => r.owner === owner)
    }
    if (keyword) {
      const kw = keyword.toLowerCase()
      filtered = filtered.filter(
        r => r.title.toLowerCase().includes(kw) || r.description.toLowerCase().includes(kw),
      )
    }

    // Sort
    filtered.sort((a, b) => {
      let cmp = 0
      switch (sortBy) {
        case 'level':
          cmp = levelOrder[a.level] - levelOrder[b.level]
          break
        case 'dueDate':
          cmp = (a.dueDate || '9999').localeCompare(b.dueDate || '9999')
          break
        case 'createdAt':
        default:
          cmp = a.createdAt.localeCompare(b.createdAt)
          break
      }
      return sortOrder === 'desc' ? -cmp : cmp
    })

    const total = filtered.length
    const start = (page - 1) * pageSize
    const data = filtered.slice(start, start + pageSize)

    return delay({ success: true, data, total, page, pageSize })
  },

  async getRisk(id: string): Promise<RiskResponse> {
    const risk = risks.find(r => r.id === id)
    if (!risk) {
      return delay({ success: false, data: null, error: '风险事项不存在' })
    }
    return delay({ success: true, data: risk })
  },

  async createRisk(input: Omit<RiskItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<RiskResponse> {
    const newRisk: RiskItem = {
      ...input,
      id: generateId(),
      createdAt: now(),
      updatedAt: now(),
    }
    risks = [newRisk, ...risks]
    return delay({ success: true, data: newRisk })
  },

  async updateRisk(id: string, input: Partial<RiskItem>): Promise<RiskResponse> {
    const index = risks.findIndex(r => r.id === id)
    if (index === -1) {
      return delay({ success: false, data: null, error: '风险事项不存在' })
    }
    const updated: RiskItem = {
      ...risks[index],
      ...input,
      id,
      updatedAt: now(),
    }
    risks[index] = updated
    return delay({ success: true, data: updated })
  },

  async deleteRisk(id: string): Promise<{ success: boolean; error?: string }> {
    const index = risks.findIndex(r => r.id === id)
    if (index === -1) {
      return delay({ success: false, error: '风险事项不存在' })
    }
    risks = risks.filter(r => r.id !== id)
    return delay({ success: true })
  },

  // ─── Alert Rules API ───

  async listAlertRules(): Promise<AlertRuleListResponse> {
    return delay({ success: true, data: [...alertRules] })
  },

  async updateAlertRule(id: string, input: Partial<AlertRule>): Promise<AlertRuleListResponse> {
    const index = alertRules.findIndex(r => r.id === id)
    if (index === -1) {
      return delay({ success: false, data: [], error: '规则不存在' })
    }
    const updated: AlertRule = {
      ...alertRules[index],
      ...input,
      id,
      updatedAt: now(),
    }
    alertRules[index] = updated
    return delay({ success: true, data: [...alertRules] })
  },

  async createAlertRule(input: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<AlertRuleListResponse> {
    const newRule: AlertRule = {
      ...input,
      id: `rule-${Date.now()}`,
      createdAt: now(),
      updatedAt: now(),
    }
    alertRules = [...alertRules, newRule]
    return delay({ success: true, data: [...alertRules] })
  },

  async deleteAlertRule(id: string): Promise<{ success: boolean; error?: string }> {
    const index = alertRules.findIndex(r => r.id === id)
    if (index === -1) {
      return delay({ success: false, error: '规则不存在' })
    }
    alertRules = alertRules.filter(r => r.id !== id)
    return delay({ success: true })
  },

  // ─── Stats API ───

  async getStats(): Promise<RiskStatsResponse> {
    const byLevel: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0, critical: 0 }
    const byStatus: Record<RiskStatus, number> = { open: 0, monitoring: 0, mitigating: 0, closed: 0, accepted: 0 }
    const byCategory: Record<RiskCategory, number> = {
      technical: 0, schedule: 0, resource: 0, quality: 0, scope: 0, external: 0, other: 0,
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let overdueCount = 0
    let triggeredAlertCount = 0

    for (const risk of risks) {
      byLevel[risk.level]++
      byStatus[risk.status]++
      byCategory[risk.category]++

      if (risk.dueDate) {
        const due = new Date(risk.dueDate)
        if (due < today && risk.status !== 'closed' && risk.status !== 'accepted') {
          overdueCount++
        }
      }

      if (risk.alertStatus === 'triggered') {
        triggeredAlertCount++
      }
    }

    // Generate 7-day trend
    const trendLast7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      const dateStr = d.toISOString().slice(0, 10)
      const dayRisks = risks.filter(r => r.createdAt.slice(0, 10) === dateStr)
      return {
        date: dateStr,
        openCount: dayRisks.length,
        closedCount: dayRisks.filter(r => r.status === 'closed' || r.status === 'accepted').length,
      }
    })

    return delay({
      success: true,
      data: {
        total: risks.length,
        byLevel,
        byStatus,
        byCategory,
        overdueCount,
        triggeredAlertCount,
        trendLast7Days,
      },
    })
  },

  // ─── Alert Check API ───

  async checkAlerts(): Promise<{ notifications: Array<{ risk: RiskItem; rule: AlertRule; message: string }> }> {
    const notifications: Array<{ risk: RiskItem; rule: AlertRule; message: string }> = []
    const nowTime = Date.now()

    for (const rule of alertRules) {
      if (!rule.enabled) continue

      for (const risk of risks) {
        if (!rule.triggerCondition.statusFilter.includes(risk.status)) continue

        // Check cooldown
        if (risk.lastAlertAt) {
          const lastAlert = new Date(risk.lastAlertAt).getTime()
          const cooldownMs = rule.cooldownMinutes * 60 * 1000
          if (nowTime - lastAlert < cooldownMs) continue
        }

        let matched = false
        let message = ''

        // Level threshold check
        const levelThreshold = rule.triggerCondition.levelThreshold
        if (levelThreshold) {
          const thresholds: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 }
          if (thresholds[risk.level] >= thresholds[levelThreshold]) {
            matched = true
            const levelLabel: Record<RiskLevel, string> = { low: '低', medium: '中', high: '高', critical: '紧急' }
            message = `⚠️ 风险「${risk.title}」已触发预警（等级：${levelLabel[risk.level]}）`
          }
        }

        // Due date check
        if (!matched && rule.triggerCondition.daysBeforeDue !== null && risk.dueDate) {
          const due = new Date(risk.dueDate).getTime()
          const daysDiff = Math.ceil((due - nowTime) / (1000 * 60 * 60 * 24))

          if (rule.triggerCondition.daysBeforeDue === 0 && daysDiff <= 0) {
            matched = true
            message = `🚨 风险「${risk.title}」已过期未处理`
          } else if (rule.triggerCondition.daysBeforeDue > 0 && daysDiff <= rule.triggerCondition.daysBeforeDue && daysDiff > 0) {
            matched = true
            message = `📅 风险「${risk.title}」将在 ${daysDiff} 天后到期`
          }
        }

        if (matched) {
          notifications.push({ risk, rule, message })
        }
      }
    }

    return delay({ notifications })
  },
}
