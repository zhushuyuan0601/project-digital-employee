import { useState } from 'react'
import './DemoPanel.css'

// 预设模板
const templates = [
  {
    id: 1,
    name: '新年祝福',
    preview: '🎊',
    style: '喜庆吉祥',
    color: '#e74c3c'
  },
  {
    id: 2,
    name: '生日快乐',
    preview: '🎂',
    style: '温馨快乐',
    color: '#f39c12'
  },
  {
    id: 3,
    name: '商务宣传',
    preview: '💼',
    style: '专业大气',
    color: '#3498db'
  },
  {
    id: 4,
    name: '文旅推广',
    preview: '🏞️',
    style: '清新自然',
    color: '#27ae60'
  }
]

// 模拟生成效果
const generateEffects = [
  { icon: '✨', text: 'AI 正在理解您的需求...' },
  { icon: '🎨', text: '正在生成场景画面...' },
  { icon: '🎬', text: '正在制作视频动画...' },
  { icon: '🎵', text: '正在生成背景音乐...' },
  { icon: '📝', text: '正在添加字幕...' },
  { icon: '✅', text: '视频彩铃生成完成！' }
]

function DemoPanel() {
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [userInput, setUserInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatingStep, setGeneratingStep] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [generatedResult, setGeneratedResult] = useState(null)

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template)
    setUserInput(`帮我生成${template.name}视频彩铃，${template.style}风格`)
  }

  const handleGenerate = () => {
    if (!userInput.trim()) return

    setIsGenerating(true)
    setGeneratingStep(0)
    setIsComplete(false)

    // 模拟生成过程
    let step = 0
    const interval = setInterval(() => {
      step++
      setGeneratingStep(step)

      if (step >= generateEffects.length) {
        clearInterval(interval)
        setIsGenerating(false)
        setIsComplete(true)
        setGeneratedResult({
          title: userInput,
          duration: '15 秒',
          style: selectedTemplate?.style || '自定义风格',
          resolution: '1080p',
          videoUrl: '#',
          musicUrl: '#'
        })
      }
    }, 1500)
  }

  const handleReset = () => {
    setSelectedTemplate(null)
    setUserInput('')
    setIsGenerating(false)
    setGeneratingStep(0)
    setIsComplete(false)
    setGeneratedResult(null)
  }

  return (
    <div className="demo-panel">
      <div className="demo-header">
        <h2 className="demo-title">🎬 AI 彩铃工坊 - 演示 Demo</h2>
        <p className="demo-subtitle">输入需求，AI 自动生成视频彩铃</p>
      </div>

      <div className="demo-content">
        {/* 左侧：输入区 */}
        <div className="demo-input-section">
          {/* 模板选择 */}
          <div className="template-section">
            <h3 className="section-title">选择模板</h3>
            <div className="template-grid">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <div className="template-emoji">{template.preview}</div>
                  <div className="template-name">{template.name}</div>
                  <div className="template-style">{template.style}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 输入框 */}
          <div className="input-section">
            <h3 className="section-title">或自定义输入</h3>
            <textarea
              className="demo-input"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="例如：帮我生成新年祝福视频彩铃，要喜庆吉祥的风格，有红灯笼和烟花效果..."
              rows={4}
            />
          </div>

          {/* 操作按钮 */}
          <div className="action-buttons">
            <button
              className="btn-generate"
              onClick={handleGenerate}
              disabled={!userInput.trim() || isGenerating}
            >
              {isGenerating ? '生成中...' : '✨ 开始生成'}
            </button>
            {isComplete && (
              <button className="btn-reset" onClick={handleReset}>
                🔄 重新生成
              </button>
            )}
          </div>
        </div>

        {/* 右侧：展示区 */}
        <div className="demo-preview-section">
          {!isGenerating && !isComplete && (
            <div className="preview-placeholder">
              <div className="placeholder-icon">🎬</div>
              <div className="placeholder-text">
                选择模板或输入需求
                <br />
                点击"开始生成"按钮
              </div>
            </div>
          )}

          {/* 生成中 */}
          {isGenerating && (
            <div className="preview-generating">
              <div className="generating-animation">
                <div className="loading-spinner"></div>
                <div className="generating-steps">
                  {generateEffects.map((effect, index) => (
                    <div
                      key={index}
                      className={`step ${index === generatingStep - 1 ? 'active' : ''} ${index < generatingStep - 1 ? 'completed' : ''}`}
                    >
                      <span className="step-icon">{effect.icon}</span>
                      <span className="step-text">{effect.text}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${(generatingStep / generateEffects.length) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* 生成完成 */}
          {isComplete && generatedResult && (
            <div className="preview-complete">
              <div className="result-header">
                <span className="result-badge">✅ 生成完成</span>
              </div>

              {/* 视频预览 */}
              <div className="video-preview">
                <div className="video-placeholder">
                  <div className="video-content">
                    <div className="video-emoji">🎊</div>
                    <div className="video-title">{generatedResult.title}</div>
                    <div className="video-info">
                      <span>⏱️ {generatedResult.duration}</span>
                      <span>📺 {generatedResult.resolution}</span>
                      <span>🎨 {generatedResult.style}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 音乐信息 */}
              <div className="music-info">
                <div className="music-icon">🎵</div>
                <div className="music-text">
                  <div className="music-title">背景音乐已生成</div>
                  <div className="music-desc">15 秒 新年欢快背景音乐</div>
                </div>
                <div className="music-player">
                  <div className="music-wave">
                    <span></span><span></span><span></span><span></span><span></span>
                  </div>
                </div>
              </div>

              {/* 字幕信息 */}
              <div className="subtitle-info">
                <div className="subtitle-icon">📝</div>
                <div className="subtitle-text">
                  <div className="subtitle-title">字幕已生成</div>
                  <div className="subtitle-desc">新年快乐，万事如意！</div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="result-actions">
                <button className="btn-primary">
                  📱 一键设置为彩铃
                </button>
                <button className="btn-secondary">
                  💾 保存到相册
                </button>
                <button className="btn-secondary">
                  📤 分享给好友
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 底部技术说明 */}
      <div className="demo-footer">
        <div className="tech-stack">
          <span className="tech-badge">GLM-5 意图识别</span>
          <span className="tech-badge">wan2.2 视频生成</span>
          <span className="tech-badge">SDXL 图像生成</span>
          <span className="tech-badge">InspireMusic 音乐生成</span>
        </div>
      </div>
    </div>
  )
}

export default DemoPanel
