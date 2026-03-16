# Unicom UI 开发文档

## 项目结构

```
unicom-ui-new/
├── src/                    # 前端源码
│   ├── views/              # 页面组件
│   │   ├── TaskCenter2.vue # 任务指挥中心 II（支持文件扫描和 Markdown 渲染）
│   │   ├── GroupChat.vue   # 团队对话
│   │   └── ...
│   ├── stores/             # Pinia 状态管理
│   └── simulation/         # 模拟数据
├── server/                 # 后端文件扫描 API 服务
│   ├── index.js            # API 服务器主文件
│   ├── package.json        # 服务依赖
│   ├── start.sh            # 启动脚本
│   └── README.md           # API 文档
├── package.json            # 前端依赖
└── vite.config.ts          # Vite 配置（包含 API 代理）
```

## 快速启动

### 1. 启动文件扫描 API 服务

```bash
cd server
chmod +x start.sh
./start.sh
# 或手动启动
npm install
npm start
```

服务将在 `http://localhost:18888` 启动。

### 2. 启动前端服务

```bash
npm install
npm run dev
```

前端将在 `http://localhost:3000` 启动。

## 功能特性

### TaskCenter2.vue - 任务指挥中心 II

#### 1. 产出文件扫描
- 自动扫描 `~/.openclaw/shared-workspace/daily-intel/roles/{roleId}/{date}/` 目录
- 支持按任务时间范围过滤文件
- 显示文件类型图标（Markdown、Word、PPT、Excel 等）
- tech-lead 角色自动显示 Git 仓库链接

#### 2. Markdown 文件渲染
使用 `markdown-it` 库将 Markdown 文件渲染为美观的 HTML：
- 标题、段落、列表
- 代码块（带语法高亮）
- 表格、引用
- 链接、图片

#### 3. 文件预览
点击产出文件可预览：
- **Markdown 文件**：渲染为 HTML
- **文本文件**：纯文本显示（转义 HTML）
- **HTML 文件**：直接渲染
- **其他格式**：提供下载

### API 接口

#### GET /api/files/role
获取角色产出文件列表

```bash
GET /api/files/role?roleId=ceo&date=2026-03-12&startTime=1710234000000&endTime=1710237600000
```

响应：
```json
{
  "success": true,
  "roleId": "ceo",
  "date": "2026-03-12",
  "gitUrl": null,
  "count": 3,
  "files": [
    {
      "name": "daily-report.md",
      "path": "/Users/xxx/.../daily-report.md",
      "type": "markdown",
      "icon": "📘",
      "size": 1234,
      "mtime": 1710234567890,
      "mtimeStr": "2026-03-12 10:30:00"
    }
  ]
}
```

#### GET /api/files/content
读取文件内容

```bash
GET /api/files/content?path=/Users/xxx/.../daily-report.md
```

响应：
```json
{
  "success": true,
  "content": "# Daily Report\n\n...",
  "path": "/Users/xxx/..."
}
```

## UI 调整

### 下达任务框
- 减少了上下内边距（16px → 12px）
- 与使用说明框对齐
- 角色卡片整体上移

### Markdown 渲染样式
- 标题带下边框线
- 代码块深色背景
- 表格带边框
- 引用块左侧边框
- 链接主题色

## 依赖

### 前端
- Vue 3
- Pinia
- Element Plus
- markdown-it
- Vue Router

### 后端
- Express
- CORS

## 开发说明

### 添加新的产出文件类型
1. 在 `server/index.js` 中更新 `getFileType()` 和 `getFileIcon()` 函数
2. 在 `TaskCenter2.vue` 中更新文件预览逻辑

### 修改 Markdown 渲染样式
在 `TaskCenter2.vue` 的 `<style>` 部分修改 `.markdown-rendered` 相关样式。

### 添加新的 API 接口
在 `server/index.js` 中添加新的路由处理函数。

### 流式输出逻辑
TaskCenter2.vue 的执行日志采用流式逐字输出效果（与 unicom-ui 一致）：
- **延迟函数**：位于 `src/stores/multiAgentChat.ts`
  - `getStreamDelay()`: 300-700ms（日志间隔）
  - `getCharDelay()`: 80-120ms（字符间隔，约 0.1 秒/字）
- **流式输出**：`streamLogTyping()` 函数实现逐字打字效果
- **正在输入指示器**：当 Agent 输出时显示跳动圆点和"正在输入..."文字

## 故障排除

### 文件扫描返回空列表
1. 检查后端服务是否启动
2. 检查路径是否正确
3. 检查时间范围是否合理
4. 查看服务器日志

### Markdown 渲染不正常
1. 检查文件类型是否正确识别为 `markdown`
2. 查看浏览器控制台错误
3. 确认 `markdown-it` 已正确导入

### API 请求失败
1. 检查 Vite 代理配置（`vite.config.ts`）
2. 确认后端服务端口为 `18888`
3. 检查 CORS 配置

## 联系

如有问题，请查看项目日志或联系开发团队。
