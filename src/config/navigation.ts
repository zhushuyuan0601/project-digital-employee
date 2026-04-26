import { markRaw } from 'vue'
import {
  Coin,
  Collection,
  Connection,
  DataBoard,
  Document,
  Link,
  MagicStick,
  OfficeBuilding,
  Operation,
  Setting,
  Timer,
  Tools,
  User,
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
      { to: '/dashboard', label: '系统仪表盘', meta: '总览与态势', icon: markRaw(DataBoard) },
      { to: '/agents', label: '团队成员', meta: '协作角色与状态', icon: markRaw(User) },
      { to: '/digital-employee', label: '数字员工监控中心', meta: '产出与项目跟踪', icon: markRaw(OfficeBuilding) },
      { to: '/task-center-2', label: '任务指挥中心 II', meta: '派发与执行流', icon: markRaw(Operation), roles: ['admin', 'operator'] },
      { to: '/group-chat', label: '群聊会话', meta: '多人协作频道', icon: markRaw(Connection), roles: ['admin', 'operator'] },
    ],
  },
  {
    label: '系统管理',
    items: [
      { to: '/logs', label: '行动日志', meta: '运行轨迹', icon: markRaw(Document) },
      { to: '/status', label: '系统状态', meta: '资源与健康度', icon: markRaw(Connection) },
      { to: '/tools', label: '工具箱', meta: '能力开关', icon: markRaw(Tools), roles: ['admin', 'operator'] },
      { to: '/configs', label: '系统配置', meta: '环境与参数', icon: markRaw(Setting), roles: ['admin'] },
    ],
  },
  {
    label: '高级能力',
    items: [
      { to: '/skills', label: '技能中心', meta: '扩展能力管理', icon: markRaw(MagicStick), roles: ['admin', 'operator'] },
      { to: '/tokens', label: '成本追踪', meta: 'Token 与请求', icon: markRaw(Coin) },
      { to: '/memory', label: '内存图谱', meta: '知识与上下文', icon: markRaw(Collection), roles: ['admin', 'operator'] },
      { to: '/security', label: '安全审计', meta: '风险巡检', icon: markRaw(WarningFilled), roles: ['admin'] },
      { to: '/cron', label: '定时任务', meta: '自动化调度', icon: markRaw(Timer), roles: ['admin', 'operator'] },
      { to: '/webhooks', label: 'Webhook 管理', meta: '外部联动', icon: markRaw(Link), roles: ['admin', 'operator'] },
    ],
  },
]
