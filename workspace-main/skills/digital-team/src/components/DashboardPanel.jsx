import { useState, useEffect } from 'react'
import './DashboardPanel.css'

// 数字员工配置
const teamMembers = {
  '小U': {
    name: '小U',
    role: '任务秘书',
    avatar: '👩‍💼',
    color: '#667eea',
    tasks: [
      { name: '接收并理解任务', status: 'completed', duration: 5 },
      { name: '任务拆解与分配', status: 'completed', duration: 5 },
      { name: '跟踪执行状态', status: 'completed', duration: 13 },
      { name: '汇总汇报', status: 'completed', duration: 30 }
    ]
  },
  '小研': {
    name: '小研',
    role: '竞品分析师',
    avatar: '🔍',
    color: '#48bb78',
    tasks: [
      { name: '竞品信息调研', status: 'completed', duration: 120 },
      { name: '数据分析与总结', status: 'completed', duration: 30 },
      { name: '输出竞品报告', status: 'completed', duration: 20 }
    ]
  },
  '小产': {
    name: '小产',
    role: '产品经理',
    avatar: '📊',
    color: '#ed8936',
    tasks: [
      { name: '需求分析框架准备', status: 'completed', duration: 48 },
      { name: '基于竞品设计产品方案', status: 'completed', duration: 70 },
      { name: '输出产品需求文档', status: 'completed', duration: 30 }
    ]
  },
  '小开': {
    name: '小开',
    role: '研发工程师',
    avatar: '💻',
    color: '#4299e1',
    tasks: [
      { name: '技术架构设计', status: 'completed', duration: 90 },
      { name: '分配ClaudeCode任务', status: 'completed', duration: 10 },
      { name: '技术方案输出', status: 'completed', duration: 20 },
      { name: 'Demo开发协调', status: 'completed', duration: 480 }
    ]
  }
}

// 任务完成度计算
const calculateProgress = (tasks) => {
  const completed = tasks.filter(t => t.status === 'completed').length
  return Math.round((completed / tasks.length) * 100)
}

// 工作量计算（秒）
const calculateWorkload = (tasks) => {
  return tasks.reduce((sum, t) => sum + t.duration, 0)
}

function DashboardPanel() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeTask, setActiveTask] = useState('全部')

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const timeString = currentTime.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })

  // 计算团队总数据
  const totalTasks = Object.values(teamMembers).reduce((sum, member) =>
    sum + member.tasks.length, 0)
  const completedTasks = Object.values(teamMembers).reduce((sum, member) =>
    sum + member.tasks.filter(t => t.status === 'completed').length, 0)
  const totalWorkload = Object.values(teamMembers).reduce((sum, member) =>
    sum + calculateWorkload(member.tasks), 0)

  return (
    <div className="dashboard-panel">
      {/* 顶部统计 */}
      <div className="dashboard-header">
        <div className="header-left">
          <h2 className="header-title">📊 工作过程监控大盘</h2>
          <p className="header-time">实时时间：{timeString}</p>
        </div>
        <div className="header-right">
          <div className="filter-tabs">
            <button
              className={`filter-tab ${activeTask === '全部' ? 'active' : ''}`}
              onClick={() => setActiveTask('全部')}
            >
              全部任务
            </button>
            <button
              className={`filter-tab ${activeTask === '进行中' ? 'active' : ''}`}
              onClick={() => setActiveTask('进行中')}
            >
              进行中
            </button>
            <button
              className={`filter-tab ${activeTask === '已完成' ? 'active' : ''}`}
              onClick={() => setActiveTask('已完成')}
            >
              已完成
            </button>
          </div>
        </div>
      </div>

      {/* 关键指标卡片 */}
      <div className="stats-grid">
        <div className="stat-card total">
          <div className="stat-icon">📋</div>
          <div className="stat-info">
            <div className="stat-value">{totalTasks}</div>
            <div className="stat-label">总任务数</div>
          </div>
        </div>

        <div className="stat-card completed">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <div className="stat-value">{completedTasks}</div>
            <div className="stat-label">已完成任务</div>
          </div>
        </div>

        <div className="stat-card workload">
          <div className="stat-icon">⏱️</div>
          <div className="stat-info">
            <div className="stat-value">{Math.floor(totalWorkload / 60)}分</div>
            <div className="stat-label">总工作量</div>
          </div>
        </div>

        <div className="stat-card efficiency">
          <div className="stat-icon">🎯</div>
          <div className="stat-info">
            <div className="stat-value">{Math.round((completedTasks / totalTasks) * 100)}%</div>
            <div className="stat-label">完成率</div>
          </div>
        </div>
      </div>

      {/* 员工工作详情 */}
      <div className="members-grid">
        {Object.values(teamMembers).map((member) => {
          const progress = calculateProgress(member.tasks)
          const workload = calculateWorkload(member.tasks)

          return (
            <div key={member.name} className="member-card" style={{ borderColor: member.color }}>
              {/* 员工头部 */}
              <div className="member-header" style={{ background: member.color }}>
                <div className="header-left">
                  <span className="member-avatar">{member.avatar}</span>
                  <div className="member-info">
                    <h3 className="member-name">{member.name}</h3>
                    <span className="member-role">{member.role}</span>
                  </div>
                </div>
                <div className="header-right">
                  <div className="progress-ring">
                    <svg width="60" height="60">
                      <circle
                        cx="30"
                        cy="30"
                        r="26"
                        fill="none"
                        stroke="rgba(255,255,255,0.2)"
                        strokeWidth="4"
                      />
                      <circle
                        cx="30"
                        cy="30"
                        r="26"
                        fill="none"
                        stroke="white"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={163.36}
                        strokeDashoffset={163.36 * (1 - progress / 100)}
                        transform="rotate(-90 30 30)"
                      />
                      <text
                        x="30"
                        y="30"
                        textAnchor="middle"
                        dy=".3em"
                        fill="white"
                        fontSize="14"
                        fontWeight="bold"
                      >
                        {progress}%
                      </text>
                    </svg>
                  </div>
                </div>
              </div>

              {/* 工作详情 */}
              <div className="member-body">
                {/* 统计数据 */}
                <div className="member-stats">
                  <div className="stat-item">
                    <span className="stat-label">任务数</span>
                    <span className="stat-val">{member.tasks.length}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">工作量</span>
                    <span className="stat-val">
                      {workload >= 60 ? `${Math.floor(workload / 60)}分${workload % 60}秒` : `${workload}秒`}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">状态</span>
                    <span className="stat-val status-completed">已完成</span>
                  </div>
                </div>

                {/* 任务列表 */}
                <div className="tasks-list">
                  <h4 className="tasks-title">任务列表</h4>
                  {member.tasks.map((task, index) => (
                    <div key={index} className="task-item">
                      <div className="task-left">
                        <span className="task-number">{index + 1}</span>
                        <span className="task-name">{task.name}</span>
                      </div>
                      <div className="task-right">
                        <span className={`task-status ${task.status}`}>
                          {task.status === 'completed' ? '✓ 完成' : '进行中'}
                        </span>
                        <span className="task-duration">
                          {task.duration >= 60
                            ? `${Math.floor(task.duration / 60)}:${(task.duration % 60).toString().padStart(2, '0')}`
                            : `00:${task.duration.toString().padStart(2, '0')}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 工作流程图 */}
      <div className="workflow-section">
        <h3 className="section-title">🔄 工作流程流转图</h3>
        <div className="workflow-diagram">
          <div className="workflow-node">
            <div className="node-icon">👔</div>
            <div className="node-label">领导</div>
            <div className="node-time">09:30:00</div>
          </div>
          <div className="workflow-arrow">↓</div>
          <div className="workflow-node">
            <div className="node-icon" style={{ background: '#667eea' }}>👩‍💼</div>
            <div className="node-label">小U</div>
            <div className="node-time">09:30:05</div>
          </div>
          <div className="workflow-arrow">↓</div>
          <div className="workflow-node">
            <div className="node-icon" style={{ background: '#48bb78' }}>🔍</div>
            <div className="node-label">小研</div>
            <div className="node-time">09:32:15</div>
          </div>
          <div className="workflow-arrow">↓</div>
          <div className="workflow-node">
            <div className="node-icon" style={{ background: '#ed8936' }}>📊</div>
            <div className="node-label">小产</div>
            <div className="node-time">09:33:30</div>
          </div>
          <div className="workflow-arrow">↓</div>
          <div className="workflow-node">
            <div className="node-icon" style={{ background: '#4299e1' }}>💻</div>
            <div className="node-label">小开</div>
            <div className="node-time">09:35:00</div>
          </div>
          <div className="workflow-arrow">↓</div>
          <div className="workflow-node">
            <div className="node-icon" style={{ background: '#48bb78' }}>🤖</div>
            <div className="node-label">ClaudeCode</div>
            <div className="node-time">09:45:00</div>
          </div>
          <div className="workflow-arrow">↓</div>
          <div className="workflow-node success">
            <div className="node-icon" style={{ background: '#48bb78' }}>✅</div>
            <div className="node-label">Demo完成</div>
            <div className="node-time">09:45:30</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPanel