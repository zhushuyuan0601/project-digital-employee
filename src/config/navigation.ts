import { markRaw } from 'vue'
import {
  DataLine,
  Connection,
  DataBoard,
  Goods,
  Message,
  Operation,
  Setting,
  Timer,
  Warning,
} from '@element-plus/icons-vue'
import type { UserRole } from '@/stores/auth'

export interface NavigationItem {
  to: string
  label: string
  meta: string
  icon: any
  roles?: UserRole[]
}

export interface NavigationSection {
  label: string
  items: NavigationItem[]
}

export const navigationSections: NavigationSection[] = [
  {
    label: '核心工作台',
    items: [
      { to: '/task-board', label: '任务看板', meta: '整体观测与运行态', icon: markRaw(DataBoard), roles: ['admin', 'operator'] },
      { to: '/task-center-2', label: '任务指挥中心', meta: '派发与执行流', icon: markRaw(Operation), roles: ['admin', 'operator'] },
      { to: '/agent-market', label: 'Agent 市场', meta: '能力卡、路由预览与调度权限', icon: markRaw(Goods), roles: ['admin', 'operator'] },
      { to: '/agent-console', label: 'Agent 实时控制台', meta: '流式日志与旁路追问', icon: markRaw(Connection), roles: ['admin', 'operator'] },
    ],
  },
  {
    label: '系统管理',
    items: [
      { to: '/automation', label: '自动化与集成中心', meta: '调度、回调与自动联动', icon: markRaw(Timer), roles: ['admin', 'operator'] },
      { to: '/mail-center', label: '邮件触发中心', meta: '邮箱扫描与任务入口', icon: markRaw(Message), roles: ['admin', 'operator'] },
      { to: '/risk-management', label: '项目风险管理', meta: '风险登记、预警与统计', icon: markRaw(Warning), roles: ['admin', 'operator'] },
      { to: '/configs', label: '系统配置', meta: '环境与参数', icon: markRaw(Setting), roles: ['admin'] },
    ],
  },
  {
    label: '高级能力',
    items: [
      { to: '/analysis', label: '数据分析工作台', meta: '结构化分析与报告导出', icon: markRaw(DataLine), roles: ['admin', 'operator'] },
    ],
  },
]
