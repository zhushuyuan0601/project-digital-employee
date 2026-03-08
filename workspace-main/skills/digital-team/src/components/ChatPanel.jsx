import { useState } from 'react'
import './ChatPanel.css'

// 数字员工配置
const teamMembers = {
  '领导': {
    avatar: '👔',
    color: '#f6ad55',
    role: '领导'
  },
  '小 U': {
    avatar: '👩‍💼',
    color: '#667eea',
    role: '任务秘书'
  },
  '小研': {
    avatar: '🔍',
    color: '#48bb78',
    role: '竞品分析师'
  },
  '小产': {
    avatar: '📊',
    color: '#ed8936',
    role: '产品经理'
  },
  '小开': {
    avatar: '💻',
    color: '#4299e1',
    role: '研发工程师'
  },
  '系统': {
    avatar: '⚙️',
    color: '#a0aec0',
    role: '系统通知'
  }
}

// 模拟聊天数据
const initialMessages = [
  {
    id: 1,
    sender: '领导',
    content: '最近我看到中国电信上线了"天翼智铃"。用户可以用 AI 自动生成视频彩铃。我们联通能不能也做一个类似的能力？',
    timestamp: '09:30:00',
    type: 'message'
  },
  {
    id: 2,
    sender: '小 U',
    content: `收到任务。

**【任务理解】**
设计一款 AI 智能彩铃生成产品

**【任务拆解】**

1. 竞品分析 → 负责人：小研
2. 产品方案 → 负责人：小产
3. 技术方案与 Demo → 负责人：小开

**【执行计划】**
现在开始协调团队执行任务。`,
    timestamp: '09:30:05',
    type: 'message'
  },
  {
    id: 3,
    sender: '小研',
    content: `**【正在调研天翼智铃产品...】**

正在获取竞品信息...`,
    timestamp: '09:30:10',
    type: 'working'
  },
  {
    id: 4,
    sender: '小产',
    content: `收到调研任务，我已准备分析框架...

等待小研的调研结果。`,
    timestamp: '09:30:10',
    type: 'message'
  },
  {
    id: 5,
    sender: '小开',
    content: `收到技术评估任务，准备架构框架...

等待小产的产品需求。`,
    timestamp: '09:30:10',
    type: 'message'
  },
  {
    id: 6,
    sender: '小研',
    content: `**【竞品分析完成】**

**【天翼智铃】**

【基本信息】
- 产品类型：AI 视频彩铃生成平台
- 运营商：中国电信
- 上线时间：2025 年 Q4

【核心功能】
- 文生视频彩铃
- 图生视频彩铃
- 文生音乐彩铃
- AI 对话式创作（"星小辰"助手）

【技术路线】
- 技术基座：星辰大模型
- 多模态生成：文生图、图生视频、文生音乐
- 智能体架构：20 类分支，核心 8 类创作智能体

【运营数据】
- 峰值调用：1.5 万次/分钟
- 日活用户：40 万 +
- 部署规模：2 万张 910B + 1500 台服务器

【总结】
天翼智铃本质是 AIGC 内容创作平台，核心创新在于：
1. 多模态生成能力统一
2. 自然语言对话降低使用门槛
3. 规模化 AI 推理服务`,
    timestamp: '09:32:15',
    type: 'deliverable'
  },
  {
    id: 7,
    sender: '小产',
    content: `收到调研结果！开始设计产品方案...`,
    timestamp: '09:32:20',
    type: 'working'
  },
  {
    id: 8,
    sender: '小产',
    content: `**【产品方案完成】**

**【AI 彩铃工坊】**

【产品定位】
为联通用户提供 AI 驱动的智能彩铃创作服务，让每个人都能轻松制作个性化视频彩铃

【目标用户】
- C 端用户：个人彩铃定制（生日、节日、纪念日）
- B 端企业：企业营销彩铃、品牌宣传

【核心功能】

1. 文生视频彩铃
   - 输入文字描述（如"喜庆风格的新年祝福"）
   - AI 自动生成视频 + 音乐 + 字幕

2. 图生视频彩铃
   - 上传图片
   - AI 转动态视频彩铃

3. AI 音乐彩铃
   - 自然语言描述音乐风格
   - AI 生成背景音乐

【用户使用流程】
输入需求 → AI 理解意图 → 选择模板 → 生成预览 → 设置为彩铃

【MVP 版本建议】

核心功能：
✅ 文生视频彩铃（简化版）
✅ 3-5 个预设模板
✅ 一键设置彩铃

迭代功能：
📋 图生视频彩铃
📋 智能音乐生成
📋 更多模板和风格`,
    timestamp: '09:33:30',
    type: 'deliverable'
  },
  {
    id: 9,
    sender: '小开',
    content: `收到产品需求！开始设计技术架构...`,
    timestamp: '09:33:35',
    type: 'working'
  },
  {
    id: 10,
    sender: '小开',
    content: `**【技术方案完成】**

**【技术架构】**

【模块设计】

| 模块 | 技术选型 | 说明 |
|------|---------|------|
| 文生图 | SDXL/豆包图像 | 生成场景图 |
| 文生视频 | wan2.2/豆包视频 | 图转视频 |
| 图生视频 | Qwen-VL | 图片理解 + 生成 |
| 音乐生成 | InspireMusic | 背景音乐生成 |
| 意图识别 | GLM-5 | 理解用户需求 |

**【开发任务分配】**

🤖 ClaudeCode-1
> 任务：开发 AI 视频生成模块
> 技术栈：Python + wan2.2 API
> 预计时间：4 小时

🤖 ClaudeCode-2
> 任务：开发彩铃生成接口
> 技术栈：Node.js + Express
> 预计时间：3 小时

🤖 ClaudeCode-3
> 任务：开发 Demo 演示页面
> 技术栈：React + Vite
> 预计时间：2 小时

**【Demo 演示流程】**

用户输入："帮我生成新年祝福视频彩铃"

↓ 意图识别（GLM-5）

↓ SDXL 生成喜庆场景图

↓ wan2.2 转视频

↓ InspireMusic 生成背景音乐

↓ 输出视频彩铃预览

↓ 一键设置彩铃

**预计完成时间：** 8 小时

**技术栈已准备就绪，正在启动 ClaudeCode 工程团队...**`,
    timestamp: '09:35:00',
    type: 'deliverable'
  },
  {
    id: 11,
    sender: '小开',
    content: `🚀 ClaudeCode 工程团队已启动！

3 个开发 Agent 正在并行工作...`,
    timestamp: '09:35:10',
    type: 'system-notify'
  },
  {
    id: 12,
    sender: '小开',
    content: `✅ ClaudeCode-1 完成：AI 视频生成模块

✅ ClaudeCode-2 完成：彩铃生成接口

✅ ClaudeCode-3 完成：Demo 演示页面

**【Demo 已生成！】**

演示场景：用户输入"帮我生成新年祝福视频彩铃"

🎬 视频：已生成（15 秒，喜庆风格）
🎵 音乐：已生成（新年欢快背景音乐）
📝 字幕：新年快乐，万事如意！

✨ 视频彩铃生成完成，可一键设置为彩铃！

查看工作成果 → 点击"工作成果"标签👉`,
    timestamp: '09:45:00',
    type: 'demo-complete'
  },
  {
    id: 13,
    sender: '小 U',
    content: `**领导您好，数字员工团队已完成初步方案！**

✅ 竞品分析 → 小研完成
✅ 产品方案 → 小产完成
✅ 技术方案 → 小开完成
✅ Demo 开发 → ClaudeCode 团队完成

**成果汇总：**

1. 竞品：天翼智铃已验证市场需求
2. 产品：AI 彩铃工坊 - 3 大核心功能
3. 技术：多模态 AIGC + GLM-5 意图识别
4. Demo：已生成可演示原型

**【时间预估】**
- Demo 优化：1 周
- MVP 开发：1 个月
- 正式上线：3 个月

**建议：** 立即启动 Demo 优化，准备向领导汇报！`,
    timestamp: '09:45:30',
    type: 'final-report'
  }
]

function ChatPanel() {
  const [messages, setMessages] = useState(initialMessages)
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage = inputValue.trim()

    // 添加领导的消息
    const leaderMessage = {
      id: messages.length + 1,
      sender: '领导',
      content: userMessage,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      type: 'message'
    }

    setMessages(prev => [...prev, leaderMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // 调用后端 API，让小 U 处理任务
      const response = await fetch('http://localhost:3100/api/agent/xiaoU', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: userMessage, context: [] })
      })

      const data = await response.json()

      if (data.success) {
        // 添加小 U 的回复
        const zoeMessage = {
          id: messages.length + 2,
          sender: '小 U',
          content: data.reply,
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
          type: 'message'
        }

        setMessages(prev => [...prev, leaderMessage, zoeMessage])
      } else {
        throw new Error(data.error || '处理失败')
      }
    } catch (error) {
      console.error('调用 API 失败:', error)

      // 添加错误消息
      const errorMessage = {
        id: messages.length + 2,
        sender: '系统',
        content: `处理失败：${error.message}`,
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        type: 'system-notify'
      }

      setMessages(prev => [...prev, leaderMessage, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="chat-panel">
      {/* 聊天头部 */}
      <div className="chat-header">
        <div className="header-left">
          <span className="chat-title">💬 数字员工协作群</span>
          <span className="member-count">5 人</span>
        </div>
        <div className="header-right">
          <span className="status-badge active">协作中</span>
        </div>
      </div>

      {/* 聊天消息 */}
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message-row ${msg.sender === '领导' ? 'leader' : ''}`}>
            {/* 头像 */}
            <div className="message-avatar">
              <div className="avatar-circle" style={{ background: teamMembers[msg.sender]?.color }}>
                {teamMembers[msg.sender]?.avatar}
              </div>
            </div>

            {/* 消息内容 */}
            <div className="message-content">
              <div className="message-header">
                <span className="sender-name">{msg.sender}</span>
                {teamMembers[msg.sender]?.role && (
                  <span className="sender-role">{teamMembers[msg.sender].role}</span>
                )}
                <span className="message-time">{msg.timestamp}</span>
              </div>

              {/* 不同类型的消息展示 */}
              {msg.type === 'working' && (
                <div className="message-body working">
                  <div className="working-indicator">
                    <span className="working-dot"></span>
                    <span className="working-dot"></span>
                    <span className="working-dot"></span>
                  </div>
                  <div className="working-text">{msg.content}</div>
                </div>
              )}
              {(msg.type === 'demo-complete' || msg.type === 'final-report') && (
                <div className="message-body highlight">
                  <pre>{msg.content}</pre>
                </div>
              )}
              {msg.type === 'system-notify' && (
                <div className="message-body system">
                  {msg.content}
                </div>
              )}
              {!['working', 'demo-complete', 'final-report', 'system-notify'].includes(msg.type) && (
                <div className="message-body">
                  <pre>{msg.content}</pre>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 输入框 */}
      <div className="chat-input">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="作为领导，您有什么新任务吗？"
          className="input-textarea"
        />
        <button
          onClick={handleSend}
          className="send-button"
          disabled={!inputValue.trim() || isLoading}
        >
          {isLoading ? '发送中... ⏳' : '发送 📤'}
        </button>
      </div>
    </div>
  )
}

export default ChatPanel