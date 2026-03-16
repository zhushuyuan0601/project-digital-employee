// 任务状态
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

// 任务接口
export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignedTo?: string;  // agent id
  parentId?: string;    // 父任务 ID（用于子任务）
  subTasks?: Task[];    // 子任务列表
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: string;      // 执行结果
  progress: number;     // 进度 0-100
}

// 创建任务请求
export interface CreateTaskRequest {
  title: string;
  description: string;
}

// 任务流转日志
export interface TaskLog {
  id: string;
  taskId: string;
  agentId: string;
  action: 'assign' | 'start' | 'complete' | 'fail';
  message: string;
  timestamp: number;
}
