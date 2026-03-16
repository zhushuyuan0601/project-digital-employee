// Agent 角色类型
export type AgentRole = 'assistant' | 'developer' | 'product' | 'analyst';

// Agent 状态
export type AgentStatus = 'idle' | 'busy' | 'offline';

// Agent 接口
export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  icon: string;
  status: AgentStatus;
  currentTask?: Task;
  completedTasks: number;
  description: string;
  gatewayAgentId?: string; // 关联的 Gateway Agent ID
}

// 预定义的 Agent 角色
export const AGENT_ROLES: Record<AgentRole, Agent> = {
  assistant: {
    id: 'xiaomu',
    name: '小呦',
    role: 'assistant',
    icon: '/avatars/avatar-xiaomu.jpeg',
    status: 'idle',
    completedTasks: 0,
    description: '项目统筹 - 任务调度、分配、汇总汇报',
    gatewayAgentId: 'ceo'
  },
  developer: {
    id: 'xiaokai',
    name: '研发工程师',
    role: 'developer',
    icon: '/avatars/avatar-xiaokai.jpeg',
    status: 'idle',
    completedTasks: 0,
    description: '技术开发 - 技术规划&研发管理',
    gatewayAgentId: 'tech-lead'
  },
  product: {
    id: 'xiaochan',
    name: '产品经理',
    role: 'product',
    icon: '/avatars/avatar-xiaochan.jpeg',
    status: 'idle',
    completedTasks: 0,
    description: '产品设计 - 产品需求分析',
    gatewayAgentId: 'pm'
  },
  analyst: {
    id: 'xiaoyan',
    name: '研究员',
    role: 'analyst',
    icon: '/avatars/avatar-xiaoyan.jpeg',
    status: 'idle',
    completedTasks: 0,
    description: '调研分析 - 市场调研',
    gatewayAgentId: 'researcher'
  }
};
