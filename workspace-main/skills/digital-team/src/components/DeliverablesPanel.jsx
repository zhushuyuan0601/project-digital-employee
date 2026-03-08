import './DeliverablesPanel.css'

// 模拟工作成果数据
const deliverables = {
  '小U': {
    title: '任务统筹与汇总报告',
    type: '任务秘书',
    icon: '👩‍💼',
    color: '#667eea',
    status: 'completed',
    deliverables: [
      {
        name: '任务拆解文档',
        content: `【任务理解】
设计一款AI智能彩铃生成产品

【任务拆解】
1. 竞品分析 → 小研
2. 产品方案 → 小产
3. 技术方案与Demo → 小开

【完成时间】 09:30:05`,
        format: 'text'
      },
      {
        name: '最终汇报报告',
        content: `领导您好，数字员工团队已完成初步方案！

✅ 竞品分析 → 小研完成
✅ 产品方案 → 小产完成
✅ 技术方案 → 小开完成
✅ Demo开发 → ClaudeCode团队完成

【成果汇总】

1. 竞品：天翼智铃已验证市场需求
2. 产品：AI彩铃工坊 - 3大核心功能
3. 技术：多模态AIGC + GLM-5意图识别
4. Demo：已生成可演示原型

【时间预估】
- Demo优化：1周
- MVP开发：1个月
- 正式上线：3个月`,
        format: 'text'
      }
    ]
  },
  '小研': {
    title: '竞品分析报告',
    type: '竞品分析师',
    icon: '🔍',
    color: '#48bb78',
    status: 'completed',
    deliverables: [
      {
        name: '天翼智铃竞品分析',
        content: `【天翼智铃】

【基本信息】
- 产品类型：AI视频彩铃生成平台
- 运营商：中国电信
- 上线时间：2025年Q4

【核心功能】
✓ 文生视频彩铃
✓ 图生视频彩铃
✓ 文生音乐彩铃
✓ AI对话式创作（"星小辰"助手）

【技术路线】
✓ 技术基座：星辰大模型
✓ 多模态生成：文生图、图生视频、文生音乐
✓ 智能体架构：20类分支，核心8类创作智能体

【运营数据】
📈 峰值调用：1.5万次/分钟
👤 日活用户：40万+
🖥️ 部署规模：2万张910B + 1500台服务器

【结论】
天翼智铃本质是AIGC内容创作平台，核心创新：
1. 多模态生成能力统一
2. 自然语言对话降低使用门槛  3. 规模化AI推理服务

【市场机会】
✓ 用户需求强烈
✓ 技术方案可行
✓ 值得跟进`,
        format: 'text'
      }
    ]
  },
  '小产': {
    title: '产品方案设计',
    type: '产品经理',
    icon: '📊',
    color: '#ed8936',
    status: 'completed',
    deliverables: [
      {
        name: 'AI彩铃工坊产品设计',
        content: `【AI彩铃工坊】

【产品定位】
为联通用户提供AI驱动的智能彩铃创作服务

【目标用户】
• C端用户：个人彩铃定制（生日、节日、纪念日）
• B端企业：企业营销彩铃、品牌宣传

【核心功能】

1. 文生视频彩铃
   输入文字描述 → AI生成视频+音乐+字幕

2. 图生视频彩铃
   上传图片 → AI转动态视频

3. AI音乐彩铃
   自然语言描述 → AI生成背景音乐

【用户流程】
输入需求 → AI理解 → 选择模板 → 生成预览 → 设为彩铃

【MVP版本建议】

核心功能：
✓ 文生视频彩铃（简化版）
✓ 3-5个预设模板
✓ 一键设置彩铃

迭代功能：
📋 图生视频彩铃
📋 智能音乐生成
📋 更多模板和风格

【差异化策略】
✓ 简洁易用（vs 钉钉功能臃肿）
✓ 高质量生成（vs 竞品效果不稳定）
✓ 快速预览（vs 竞品等待时间长）`,
        format: 'text'
      }
    ]
  },
  '小开': {
    title: '技术架构与Demo',
    type: '研发工程师',
    icon: '💻',
    color: '#4299e1',
    status: 'completed',
    deliverables: [
      {
        name: '技术架构方案',
        content: `【技术架构】

【模块设计】

模块          技术选型           说明
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
文生图         SDXL/豆包图像      生成场景图
文生视频       wan2.2/豆包视频    图转视频
图生视频       Qwen-VL            图片理解+生成
音乐生成       InspireMusic       背景音乐生成
意图识别       GLM-5              理解用户需求

【开发任务分配】

🤖 ClaudeCode-1
任务：开发AI视频生成模块
技术栈：Python + wan2.2 API

🤖 ClaudeCode-2
任务：开发彩铃生成接口
技术栈：Node.js + Express

🤖 ClaudeCode-3
任务：开发Demo演示页面
技术栈：React + Vite

【Demo流程】
用户输入 → 意图识别 → 生成预览 → 设置彩铃`,
        format: 'text'
      },
      {
        name: '演示Demo',
        content: `【Demo演示 - 新年祝福视频彩铃】

🎬 视频已生成
   • 时长：15秒
   • 风格：喜庆吉祥
   • 内容：红灯笼、烟花、祝福文字

🎵 音乐已生成
   • 类型：新年欢快背景音乐
   • 时长：15秒
   • 风格：电子+传统元素

📝 字幕已生成
   • 文字：新年快乐，万事如意！
   • 动画：淡入淡出
   • 字体：喜庆红色

✨ 完成状态： ready
🔗 操作：一键设置为彩铃

【演示效果】
✅ 响应速度：3秒生成
✅ 视频质量：1080p
✅ 用户体验：流畅自然`,
        format: 'demo'
      }
    ]
  }
}

function DeliverablesPanel() {
  return (
    <div className="deliverables-panel">
      <div className="panel-header">
        <h2 className="panel-title">📦 工作成果展示</h2>
        <p className="panel-subtitle">数字员工团队输出成果汇总</p>
      </div>

      <div className="deliverables-grid">
        {Object.entries(deliverables).map(([member, data]) => (
          <div key={member} className="deliverable-card">
            {/* 卡片头部 */}
            <div className="card-header" style={{ background: data.color }}>
              <div className="header-left">
                <span className="member-icon">{data.icon}</span>
                <div className="member-info">
                  <h3 className="member-name">{member}</h3>
                  <span className="member-role">{data.type}</span>
                </div>
              </div>
              <div className="header-right">
                <span className={`status-badge ${data.status}`}>
                  {data.status === 'completed' ? '✓ 已完成' : '进行中'}
                </span>
              </div>
            </div>

            {/* 产出物列表 */}
            <div className="card-body">
              <h4 className="deliverables-title">产出成果：</h4>
              <div className="deliverables-list">
                {data.deliverables.map((item, index) => (
                  <div key={index} className="deliverable-item">
                    <div className="item-header">
                      <span className="item-number">{index + 1}</span>
                      <span className="item-name">{item.name}</span>
                      <span className="item-format">{item.format === 'text' ? '📄 文档' : '🎬 Demo'}</span>
                    </div>
                    <div className="item-content">
                      <pre>{item.content}</pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 汇总统计 */}
      <div className="summary-section">
        <div className="summary-card">
          <div className="summary-item">
            <span className="summary-label">总任务数</span>
            <span className="summary-value">4</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">已完成</span>
            <span className="summary-value success">4</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">总产出物</span>
            <span className="summary-value">7</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">完成时间</span>
            <span className="summary-value">15分钟</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DeliverablesPanel