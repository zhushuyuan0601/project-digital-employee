import { markRaw } from 'vue'
import {
  DataLine,
  Connection,
  DataBoard,
  OfficeBuilding,
  Operation,
  Setting,
  Timer,
  WarningFilled,
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
      { to: '/dashboard', label: '运行观测中心', meta: '总览、健康度与事件流', icon: markRaw(DataBoard) },
      { to: '/team-output', label: '团队与产出中心', meta: '成员、项目与成果资产', icon: markRaw(OfficeBuilding) },
      { to: '/task-center-2', label: '任务指挥中心 II', meta: '派发与执行流', icon: markRaw(Operation), roles: ['admin', 'operator'] },
      { to: '/group-chat', label: '群聊会话', meta: '多人协作频道', icon: markRaw(Connection), roles: ['admin', 'operator'] },
    ],
  },
  {
    label: '系统管理',
    items: [
      { to: '/automation', label: '自动化与集成中心', meta: '调度、回调与自动联动', icon: markRaw(Timer), roles: ['admin', 'operator'] },
      { to: '/configs', label: '系统配置', meta: '环境与参数', icon: markRaw(Setting), roles: ['admin'] },
    ],
  },
  {
    label: '高级能力',
    items: [
      { to: '/analysis', label: '数据分析工作台', meta: '结构化分析与报告导出', icon: markRaw(DataLine), roles: ['admin', 'operator'] },
      { to: '/security', label: '安全治理中心', meta: '密钥、MCP 与审计事件', icon: markRaw(WarningFilled), roles: ['admin'] },
    ],
  },
]
