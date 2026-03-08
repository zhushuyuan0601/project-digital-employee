# 联通智能客服 H5 原型

> 基于 Vue 3 + Vant UI + 鸿鹄大模型的智能客服H5应用

## 🚀 快速开始

### 1. 安装依赖

```bash
cd ~/.openclaw/shared-workspace/projects/联通智能客服
npm install
```

### 2. 配置鸿鹄大模型

编辑 `src/api/honghu.js`，修改以下配置：

```javascript
const HONGHU_CONFIG = {
  baseURL: 'https://api.honghu.com/v1', // 鸿鹄API地址
  apiKey: 'your-api-key', // 您的API Key
  model: 'honghu'
}
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问：http://localhost:5173

### 4. 构建生产版本

```bash
npm run build
```

## 📱 功能特性

### 核心功能

| 功能 | 说明 |
|------|------|
| **智能对话** | 基于鸿鹄大模型的多轮对话 |
| **快捷入口** | 套餐查询、话费充值、流量查询等 |
| **历史记录** | 本地存储对话历史 |
| **响应式设计** | 适配各种移动端屏幕 |

### 快捷入口

- 📱 套餐查询
- 💰 话费充值
- 📶 流量查询
- 📋 办理业务
- 🔧 故障报修
- 👥 人工客服

## 🏗️ 项目结构

```
联通智能客服/
├── src/
│   ├── api/
│   │   └── honghu.js      # 鸿鹄大模型API
│   ├── App.vue            # 主组件
│   ├── main.js            # 入口文件
│   └── style.css          # 全局样式
├── index.html             # HTML模板
├── package.json           # 依赖配置
├── vite.config.js         # Vite配置
└── README.md              # 说明文档
```

## 🔌 鸿鹄大模型集成

### API格式

采用 OpenAI 兼容接口格式：

```javascript
// 请求
POST /v1/chat/completions
{
  "model": "honghu",
  "messages": [
    { "role": "system", "content": "系统提示词" },
    { "role": "user", "content": "用户问题" }
  ],
  "temperature": 0.7,
  "max_tokens": 500
}

// 响应
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "AI回复内容"
      }
    }
  ]
}
```

## 🎨 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue | 3.4+ | 前端框架 |
| Vite | 5.0+ | 构建工具 |
| Vant | 4.8+ | UI组件库 |
| Axios | 1.6+ | HTTP请求 |

## 📝 开发说明

### 模拟模式

未配置API Key时，系统会使用模拟回复，支持以下关键词：

- 套餐、充值、流量、办理、故障、人工

### 自定义快捷入口

修改 `src/App.vue` 中的 `quickActions` 数组：

```javascript
const quickActions = [
  { text: '新功能', icon: '🆕', prompt: '问题提示词' }
]
```

## 📊 效果预览

```
┌─────────────────────────┐
│  联通智能客服      [···] │
├─────────────────────────┤
│  🤖 您好！我是联通智能  │
│     客服小通...         │
│                         │
│  👤 帮我查询套餐        │
│                         │
│  🤖 您当前使用的是...   │
│                         │
├─────────────────────────┤
│ [📱套餐] [💰充值] ...   │
├─────────────────────────┤
│ [请输入问题...] [发送]  │
└─────────────────────────┘
```

---

**创建时间**: 2026-03-09  
**技术负责**: 小开