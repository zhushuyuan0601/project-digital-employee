# 🎯 数字员工集成 - Mission Control + Star Office UI

**集成完成时间**: 2026-03-24 15:30
**集成人**: 小开（研发工程师）

---

## 📋 集成概述

已成功将两个功能模块集成到数字员工项目中：

1. **Mission Control 看板** 📋
   - 功能: 智能体自动化协作 + 实时终端日志
   - 访问地址: http://localhost:5173
   - 端口: 5173

2. **Star Office UI** 🎨
   - 功能: 像素风格的办公室状态看板
   - 访问地址: http://127.0.0.1:19000
   - 端口: 19000

---

## 🚀 快速启动

### 一键启动所有服务

```bash
# 1. 进入数字员工项目目录
cd /Users/lihzz/.openclaw/shared-workspace/project-digital-employee

# 2. 启动集成服务（Mission Control + Star Office UI）
./start-integrated-services.sh

# 3. 在另一个终端窗口启动数字员工主应用
npm run dev
```

### 访问应用

启动完成后，访问以下地址：

- **数字员工主应用**: http://localhost:XXXX（见 vite 终端输出）
- **Mission Control 看板**: 通过数字员工首页 Tab "开发监控" 访问
- **Star Office UI**: 通过数字员工首页 Tab "像素办公室" 访问

---

## 📱 应用界面说明

### 侧边栏 Tab 结构

数字员工主页底部有 **3 个 Tab**：

| Tab | 名称 | 图标 | 功能 |
|-----|------|------|------|
| 1 | 对话 | 💬 | 原有的智能客服对话功能 |
| 2 | 开发监控 | 📊 | Mission Control 看板（智能体协作） |
| 3 | 像素办公室 | ⭐ | Star Office UI（像素办公状态） |

### Tab 功能说明

#### 1. 对话 Tab（原有功能）
- 联通智能客服对话
- 快捷入口（套餐查询、话费充值等）
- 历史记录管理

#### 2. 开发监控 Tab（新增）
- **左侧**: 看板系统，显示任务状态流转
- **右侧**: 实时终端日志
- **智能体四人组联动**: 小研(🔍)、小产(📊)、小开(💻)、小测(🛡️)
- **自动化工作流**: 任务状态自动推进

#### 3. 像素办公室 Tab（新增）
- 像素风格的办公空间
- 实时显示智能体工作状态
- 状态可视化：
  - 🌟 idle - 闲置
  - ✍️ writing - 写作中
  - 🔍 researching - 研究中
  - 🚀 executing - 执行中
  - 🔄 syncing - 同步中
  - ❌ error - 错误

---

## 🛠️ 技术实现

### 集成方式

**Vant Tabbar + iframe 嵌入**

```vue
<van-tabbar v-model="activeTab" active-color="#667eea">
  <van-tabbar-item name="chat" icon="chat-o">对话</van-tabbar-item>
  <van-tabbar-item name="mission-control" icon="apps-o">开发监控</van-tabbar-item>
  <van-tabbar-item name="star-office" icon="star-o">像素办公室</van-tabbar-item>
</van-tabbar>

Mission Control (iframe):
<iframe src="http://localhost:5173" width="100%" height="100%" frameborder="0"></iframe>

Star Office UI (iframe):
<iframe src="http://127.0.0.1:19000" width="100%" height="100%" frameborder="0"></iframe>
```

### 文件修改

**已修改文件**:
- ✅ `src/App.vue` - 添加侧边栏 Tab 和 iframe 集成

**新增文件**:
- ✅ `start-integrated-services.sh` - 一键启动脚本
- ✅ `stop-integrated-services.sh` - 一键停止脚本
- ✅ `INTEGRATION-README.md` - 本文档

---

## 📊 服务架构

```
数字员工主应用 (Vite/Vue3)
    │
    ├── Tab 1: 对话 💬
    │   └── 联通智能客服（原有）
    │
    ├── Tab 2: 开发监控 📊 (iframe)
    │   └── Mission Control
    │       ├── 前端: React + Vite (端口 5173)
    │       └── 后端: Express + Socket.io
    │
    └── Tab 3: 像素办公室 ⭐ (iframe)
        └── Star Office UI
            └── Python Flask (端口 19000)
```

---

## 🔍 服务健康检查

### 手动检查

```bash
# 检查 Mission Control
curl http://localhost:5173/health
# 响应: {"status":"ok","timestamp":"..."}

# 检查 Star Office UI
curl http://127.0.0.1:19000/health
# 响应: {"service":"star-office-ui","status":"ok","timestamp":"..."}
```

### 日志查看

```bash
# Mission Control 后端日志
tail -f /tmp/mission-control-backend.log

# Mission Control 前端日志
tail -f /tmp/mission-control-frontend.log

# Star Office UI 日志
tail -f /tmp/star-office-ui.log
```

---

## 🛑 停止服务

### 一键停止

```bash
#!/bin/bash
./stop-integrated-services.sh
```

### 手动停止

```bash
# 停止 Mission Control
kill -15 <PID>

# 停止 Star Office UI
kill -15 <PID>

# 清理端口占用
lsof -ti:5173 | xargs kill -9
lsof -ti:19000 | xargs kill -9
```

---

## ⚠️ 注意事项

### 1. 端口占用

- **5173**: Mission Control（如被占用，修改 vite.config.ts）
- **19000**: Star Office UI（如被占用，修改 app.py）
- **其他端口**: 数字员工主应用由 Vite 自动分配

### 2. 依赖安装

首次启动时，脚本会自动安装依赖：
- **Mission Control**: Node.js 依赖
- **Star Office UI**: Python 虚拟环境和 pip 包

### 3. 浏览器缓存

如果 Tab 内容无法显示，尝试：
- 清除浏览器缓存
- 刷新页面
- 检查控制台错误信息

---

## 📈 下一步优化

### 待实现功能

- [ ] 用户认证（JWT Token）
- [ ] 跨域配置优化
- [ ] 日志后端集成
- [ ] 拖拽功能完整实现
- [ ] 实时 WebSocket 连接状态显示

### 性能优化

- [ ] iframe 懒加载
- [ ] 首屏加载优化
- [ ] 资源缓存策略

---

## 🎉 集成完成

### 功能验证清单

- [x] 数员工主应用正常启动
- [x] Mission Control 服务正常运行
- [x] Star Office UI 服务正常运行
- [x] 3 个 Tab 均可正常切换
- [x] iframe 内容正常显示
- [x] 一键启动/停止脚本可用

### 访问地址

| 应用 | 地址 | 状态 |
|------|------|------|
| 数字员工 | http://localhost:XXXX（Vite 端口） | ✅ |
| Mission Control | http://localhost:5173 | ✅ |
| Star Office UI | http://127.0.0.1:19000 | ✅ |

---

**集成状态**: ✅ 完成
**测试状态**: ✅ 通过
**文档状态**: ✅ 完整

---

**🎉 享受数字员工的全功能体验！** 🚀