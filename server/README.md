# Unicom File Scanner API Server

文件扫描 API 服务，用于扫描指定目录并返回文件列表。

## 功能

- 扫描指定目录下的所有文件
- 支持按时间范围过滤文件
- 支持按角色获取产出文件
- 读取文件内容
- 自动检测 git 仓库 URL

## 安装

```bash
npm install
```

## 启动

```bash
# 开发模式
npm run dev

# 生产模式
npm start

# 或使用启动脚本
./start.sh
```

默认端口：`18888`

## API 接口

### 1. 健康检查

```http
GET /health
```

响应：
```json
{
  "status": "ok",
  "timestamp": "2026-03-12T00:00:00.000Z"
}
```

### 2. 扫描目录

```http
GET /api/files/scan?path=xxx&startTime=xxx&endTime=xxx
```

参数：
- `path`: 目录路径（支持 `~` 开头的路径）
- `startTime`: 开始时间（时间戳，可选）
- `endTime`: 结束时间（时间戳，可选）

响应：
```json
{
  "success": true,
  "path": "~/.openclaw/shared-workspace/daily-intel/roles/ceo/2026-03-12/",
  "count": 5,
  "files": [
    {
      "name": "market-research.md",
      "path": "/Users/xxx/.openclaw/.../market-research.md",
      "type": "markdown",
      "icon": "📘",
      "size": 1234,
      "mtime": 1710234567890,
      "mtimeStr": "2026-03-12 10:30:00"
    }
  ]
}
```

### 3. 读取文件内容

```http
GET /api/files/content?path=xxx
```

参数：
- `path`: 文件路径

响应：
```json
{
  "success": true,
  "content": "文件内容...",
  "path": "/Users/xxx/..."
}
```

### 4. 获取角色产出文件

```http
GET /api/files/role?roleId=xxx&date=xxxx-xx-xx&startTime=xxx&endTime=xxx
```

参数：
- `roleId`: 角色 ID（ceo, researcher, pm, tech-lead）
- `date`: 日期（格式：yyyy-MM-dd，可选，默认今天）
- `startTime`: 开始时间（时间戳，可选）
- `endTime`: 结束时间（时间戳，可选）

响应：
```json
{
  "success": true,
  "roleId": "tech-lead",
  "date": "2026-03-12",
  "basePath": "~/.openclaw/shared-workspace/daily-intel/roles/tech-lead/2026-03-12/",
  "gitUrl": "https://github.com/username/project-name",
  "count": 3,
  "files": [
    {
      "name": "code-review.md",
      "path": "...",
      "type": "markdown",
      "icon": "📘"
    }
  ]
}
```

## 文件类型映射

| 扩展名 | 类型 | 图标 |
|--------|------|------|
| .md, .markdown | markdown | 📘 |
| .txt | text | 📄 |
| .html, .htm | html | 🌐 |
| .doc, .docx | word | 📝 |
| .ppt, .pptx | ppt | 📊 |
| .xls, .xlsx | excel | 📈 |
| .js, .ts, .py, etc | code | 📜 |

## 路径说明

服务支持 `~` 开头的路径，会自动解析为用户主目录：
- `~/.openclaw/...` → `/Users/username/.openclaw/...`

## 与前端集成

前端项目已经配置了代理，将 `/api` 请求转发到此服务：

```typescript
// vite.config.ts
proxy: {
  '/api': {
    target: 'http://127.0.0.1:18888',
    changeOrigin: true,
    ws: true
  }
}
```

前端调用示例：

```typescript
// 获取角色产出文件
const response = await fetch('/api/files/role?roleId=ceo&date=2026-03-12')
const data = await response.json()

// 读取文件内容
const response = await fetch('/api/files/content?path=' + encodeURIComponent(filePath))
const data = await response.json()
```

## 启动完整服务

1. 启动文件扫描 API 服务：
```bash
cd server
npm start
```

2. 启动前端服务：
```bash
npm run dev
```

现在可以通过前端访问文件扫描功能了！
