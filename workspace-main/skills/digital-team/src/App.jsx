import { useState } from 'react'
import ChatPanel from './components/ChatPanel'
import DeliverablesPanel from './components/DeliverablesPanel'
import DashboardPanel from './components/DashboardPanel'
import DemoPanel from './components/DemoPanel'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('chat')

  return (
    <div className="app">
      {/* 顶部导航 */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">🏢</span>
            <div>
              <h1>联通AI数字员工团队</h1>
              <p className="subtitle">智能协同 · 自动办公</p>
            </div>
          </div>
          <nav className="tabs">
            <button
              className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              💬 群聊协作
            </button>
            <button
              className={`tab ${activeTab === 'demo' ? 'active' : ''}`}
              onClick={() => setActiveTab('demo')}
            >
              🎬 AI 彩铃 Demo
            </button>
            <button
              className={`tab ${activeTab === 'deliverables' ? 'active' : ''}`}
              onClick={() => setActiveTab('deliverables')}
            >
              📦 工作成果
            </button>
            <button
              className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              📊 监控大盘
            </button>
          </nav>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="main-content">
        {activeTab === 'chat' && <ChatPanel />}
        {activeTab === 'demo' && <DemoPanel />}
        {activeTab === 'deliverables' && <DeliverablesPanel />}
        {activeTab === 'dashboard' && <DashboardPanel />}
      </main>

      {/* 底部状态 */}
      <footer className="footer">
        <div className="footer-content">
          <div className="team-status">
            <span className="status-dot online"></span>
            <span>团队在线：4人</span>
          </div>
          <div className="system-info">
            OpenClaw v2.0 | 多Agent协作系统
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App