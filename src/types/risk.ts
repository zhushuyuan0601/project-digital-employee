/** 风险等级 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

/** 风险状态 */
export type RiskStatus = 'open' | 'monitoring' | 'mitigating' | 'closed' | 'accepted'

/** 风险类别 */
export type RiskCategory =
  | 'technical'    // 技术风险
  | 'schedule'     // 进度风险
  | 'resource'     // 资源风险
  | 'quality'      // 质量风险
  | 'scope'        // 范围风险
  | 'external'     // 外部风险
  | 'other'        // 其他

/** 预警状态 */
export type AlertStatus = 'none' | 'pending' | 'triggered' | 'acknowledged'

/** 风险事项 */
export interface RiskItem {
  id: string
  projectId: string
  title: string
  description: string
  category: RiskCategory
  level: RiskLevel
  status: RiskStatus
  probability: 1 | 2 | 3 | 4 | 5
  impact: 1 | 2 | 3 | 4 | 5
  owner: string
  createdBy: string
  createdAt: string
  updatedAt: string
  dueDate: string | null
  mitigationPlan: string
  resolution: string
  alertStatus: AlertStatus
  lastAlertAt: string | null
  tags: string[]
}

/** 预警规则 */
export interface AlertRule {
  id: string
  name: string
  enabled: boolean
  triggerCondition: AlertCondition
  notificationType: NotificationType
  cooldownMinutes: number
  createdAt: string
  updatedAt: string
}

/** 预警触发条件 */
export interface AlertCondition {
  levelThreshold: RiskLevel | null
  daysBeforeDue: number | null
  statusFilter: RiskStatus[]
}

/** 通知方式 */
export type NotificationType = 'in-app'

/** 风险统计 */
export interface RiskStats {
  total: number
  byLevel: Record<RiskLevel, number>
  byStatus: Record<RiskStatus, number>
  byCategory: Record<RiskCategory, number>
  overdueCount: number
  triggeredAlertCount: number
  trendLast7Days: Array<{
    date: string
    openCount: number
    closedCount: number
  }>
}

/** API 响应 */
export interface RiskResponse {
  success: boolean
  data: RiskItem | null
  error?: string
}

export interface RiskListResponse {
  success: boolean
  data: RiskItem[]
  error?: string
  total: number
  page: number
  pageSize: number
}

export interface RiskStatsResponse {
  success: boolean
  data: RiskStats
  error?: string
}

export interface AlertRuleListResponse {
  success: boolean
  data: AlertRule[]
  error?: string
}

/** 预警通知项 */
export interface AlertNotification {
  id: string
  riskId: string
  riskTitle: string
  ruleId: string
  ruleName: string
  triggeredAt: string
  acknowledged: boolean
  message: string
}

/** 等级配置 */
export interface LevelConfig {
  label: string
  color: string
  tagType: 'info' | 'warning' | 'danger'
  minScore: number
  maxScore: number
}

export const LEVEL_CONFIG_MAP: Record<RiskLevel, LevelConfig> = {
  low: { label: '低', color: '#409EFF', tagType: 'info', minScore: 1, maxScore: 4 },
  medium: { label: '中', color: '#E6A23C', tagType: 'warning', minScore: 5, maxScore: 9 },
  high: { label: '高', color: '#F56C6C', tagType: 'danger', minScore: 10, maxScore: 16 },
  critical: { label: '紧急', color: '#F56C6C', tagType: 'danger', minScore: 17, maxScore: 25 },
}

export const CATEGORY_LABELS: Record<RiskCategory, string> = {
  technical: '技术风险',
  schedule: '进度风险',
  resource: '资源风险',
  quality: '质量风险',
  scope: '范围风险',
  external: '外部风险',
  other: '其他',
}

export const STATUS_LABELS: Record<RiskStatus, string> = {
  open: '开放',
  monitoring: '监控中',
  mitigating: '处置中',
  closed: '已关闭',
  accepted: '已接受',
}

export const LEVEL_ORDER: RiskLevel[] = ['critical', 'high', 'medium', 'low']

/** 根据概率和影响自动计算风险等级 */
export function calculateRiskLevel(
  probability: number,
  impact: number,
): RiskLevel {
  const score = probability * impact
  if (score >= 17) return 'critical'
  if (score >= 10) return 'high'
  if (score >= 5) return 'medium'
  return 'low'
}

/** 风险等级排序权重 */
export function levelSortWeight(level: RiskLevel): number {
  const map: Record<RiskLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 }
  return map[level]
}
