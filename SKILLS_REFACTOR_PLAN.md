# 技能模块重构实施方案

## 目标
将当前技能模块改造为 Mission Control 架构，实现与 `http://localhost:3100/skills` 相同的功能，保持现有前端风格。

## 架构对比

| 特性 | 当前系统 | Mission Control | 目标系统 |
|------|----------|-----------------|----------|
| 框架 | Vue 3 + Express | Next.js + SQLite | Vue 3 + Express + SQLite |
| 数据存储 | 内存数组 | SQLite + WAL | SQLite + WAL |
| 技能来源 | 硬编码 mock 数据 | 6 个根目录扫描 | 6 个根目录扫描 |
| 同步方式 | 无 | 双向 disk ↔ DB | 双向 disk ↔ DB |
| 安全扫描 | 简单状态 | 12+ 规则扫描 | 12+ 规则扫描 |
| 注册表 | 无 | ClawdHub/skills.sh | ClawdHub/skills.sh |
| 认证 | 无 | RBAC | 可选 |

## 实施步骤

### 阶段 1：数据库集成

#### 1.1 安装依赖
```bash
npm install better-sqlite3
npm install --save-dev @types/better-sqlite3
```

#### 1.2 创建数据库目录结构
```
server/
├── db/
│   ├── index.js          # 数据库连接
│   ├── migrations.js     # 迁移系统
│   └── schema.sql        # Schema 定义
├── skills/
│   ├── skill-sync.js     # 双向同步
│   ├── skill-registry.js # 注册表客户端
│   └── security-scan.js  # 安全扫描
```

#### 1.3 SQLite Schema 设计
```sql
CREATE TABLE IF NOT EXISTS skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  source TEXT NOT NULL,
  path TEXT NOT NULL,
  description TEXT,
  content_hash TEXT,
  registry_slug TEXT,
  registry_version TEXT,
  security_status TEXT DEFAULT 'unchecked',
  installed_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(source, name)
);

CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);
CREATE INDEX IF NOT EXISTS idx_skills_source ON skills(source);
CREATE INDEX IF NOT EXISTS idx_skills_registry_slug ON skills(registry_slug);
```

### 阶段 2：技能根目录配置

#### 2.1 配置 6 个技能根目录
```javascript
const skillRoots = [
  { source: 'user-agents', path: '~/.agents/skills' },
  { source: 'user-codex', path: '~/.codex/skills' },
  { source: 'project-agents', path: './.agents/skills' },
  { source: 'project-codex', path: './.codex/skills' },
  { source: 'openclaw', path: '~/.openclaw/skills' },
  { source: 'workspace', path: '~/.openclaw/workspace/skills' },
];
```

#### 2.2 动态扫描 workspace-<agent> 目录
```javascript
// 扫描 ~/.openclaw/workspace-<agent>/skills
```

### 阶段 3：双向同步实现

#### 3.1 扫描磁盘技能
```javascript
function scanDiskSkills() {
  // 遍历所有技能根目录
  // 查找包含 SKILL.md 的目录
  // 计算内容 hash (SHA-256)
  // 提取描述信息
}
```

#### 3.2 同步逻辑
```javascript
async function syncSkillsFromDisk() {
  // 1. 扫描磁盘技能
  // 2. 从 DB 加载现有技能
  // 3. 比较并同步：
  //    - 新增：磁盘有 DB 无 → INSERT
  //    - 更新：hash 不同 → UPDATE (disk wins)
  //    - 删除：DB 有磁盘无 (非 registry) → DELETE
}
```

### 阶段 4：API 路由实现

#### 4.1 GET /api/skills
```javascript
// 返回所有技能
// 支持 mode=content 获取具体内容
// 支持 mode=check 运行安全检查
```

#### 4.2 POST /api/skills
```javascript
// 创建新技能
// 验证技能名称（字母数字，点，下划线，连字符）
// 写入文件系统 + DB
```

#### 4.3 PUT /api/skills
```javascript
// 更新现有技能
// 更新文件系统 + DB
```

#### 4.4 DELETE /api/skills
```javascript
// 删除技能
// 从文件系统和 DB 移除
```

### 阶段 5：安全扫描实现

#### 5.1 安全规则（12+ 规则）
1. **Prompt Injection** - 系统指令覆盖尝试
2. **Shell Execution** - 危险命令（rm -rf, curl|bash）
3. **Data Exfiltration** - 数据外传指令
4. **Credential Harvesting** - 硬编码凭证
5. **Obfuscated Content** - 混淆内容
6. **Hidden Instructions** - HTML 注释隐藏指令
7. **Excessive Permissions** - 提权命令
8. **Network Fetch** - 外部网络请求
9. **Path Traversal** - 路径遍历攻击
10. **SSRF Internal Network** - 内网访问
11. **SSRF Metadata** - 云元数据端点
12. **Prompt Injection Role** - 角色操纵

#### 5.2 扫描结果
```javascript
{
  status: 'clean' | 'warning' | 'rejected',
  issues: [
    {
      severity: 'info' | 'warning' | 'critical',
      rule: 'rule-name',
      description: '描述',
      line: 行号
    }
  ]
}
```

### 阶段 6：注册表集成

#### 6.1 支持的注册表
- **ClawdHub** - https://clawhub.ai/api
- **skills.sh** - https://skills.sh/api
- **Awesome OpenClaw** - GitHub README 解析

#### 6.2 安装流程
```javascript
async function installFromRegistry({ source, slug, targetRoot }) {
  // 1. 从注册表下载 SKILL.md
  // 2. SHA-256 验证（ClawdHub）
  // 3. 安全扫描
  // 4. 写入目标目录
  // 5. 更新 DB
}
```

### 阶段 7：前端适配

#### 7.1 API 客户端更新
```typescript
// src/api/index.ts
interface Skill {
  id: string;        // source:name 格式
  name: string;
  source: string;
  path: string;
  description?: string;
  registry_slug?: string;
  security_status?: string;
  content_hash?: string;
  installed?: boolean; // 从 source 推断
  updateAvailable?: boolean;
  icon?: string;       // 从 category 推断
  category?: string;   // 从 source 推断
  downloads?: number;  // mock 或 registry 提供
  rating?: number;     // mock 或 registry 提供
}
```

#### 7.2 Store 更新
```typescript
// src/stores/skills.ts
async function fetchSkills() {
  const response = await skillsApi.getSkills();
  // 转换 Mission Control 格式为前端格式
}

async function installSkill(skillData: { url?: string; slug?: string; source?: string }) {
  // 支持 URL 安装和 registry 安装
}
```

### 阶段 8：SKILL.md 格式

#### 8.1 标准格式
```markdown
---
name: skill-name
description: "简短描述"
---

# 技能名称

详细描述...

## Usage
...

## Examples
...
```

#### 8.2 描述提取
- 取第一个非标题段落
- 最多 220 字符

## 文件结构

```
server/
├── index.js              # 主服务器（保留现有路由）
├── db/
│   ├── index.js          # 数据库连接和配置
│   ├── migrations.js     # 迁移管理
│   └── schema.sql        # Schema 定义
├── skills/
│   ├── skill-sync.js     # 双向同步逻辑
│   ├── skill-registry.js # 注册表客户端
│   └── security-scan.js  # 安全扫描实现
└── utils/
    ├── paths.js          # 路径解析工具
    └── logger.js         # 日志工具
```

## 数据流

### 获取技能列表
```
前端 → GET /api/skills →
  1. 尝试从 DB 读取（快速路径）
  2. DB 为空则扫描磁盘
  3. 返回 { skills, groups, total }
```

### 安装技能
```
前端 → POST /api/skills/install →
  1. 判断是 URL 还是 registry slug
  2. URL: 下载 → 安全扫描 → 写入目标目录 → DB upsert
  3. Registry: 从注册表下载 → 验证 → 扫描 → 写入 → DB
  4. 触发 sync 更新 hash
```

### 编辑技能
```
前端 → PUT /api/skills →
  1. 验证 source 和 name
  2. 写入 SKILL.md
  3. 更新 DB content_hash
```

### 删除技能
```
前端 → DELETE /api/skills →
  1. 验证 source 和 name
  2. 删除目录
  3. 删除 DB 记录
```

## 保持现有前端风格

### 不做改变
- Vue 3 Composition API
- Pinia 状态管理
- UI 组件样式和布局
- 页面标题、图标、文案

### 需要适配
- API 响应格式转换（后端新格式 → 前端旧格式）
- 技能状态推断（installed 从 source 推断）
- 分类映射（source → category）

## 时间表

| 阶段 | 任务 | 预计时间 |
|------|------|----------|
| 1 | 数据库集成 | 2 小时 |
| 2 | 技能根目录配置 | 30 分钟 |
| 3 | 双向同步实现 | 3 小时 |
| 4 | API 路由实现 | 3 小时 |
| 5 | 安全扫描实现 | 2 小时 |
| 6 | 注册表集成 | 2 小时 |
| 7 | 前端适配 | 2 小时 |
| 8 | 测试和调试 | 2 小时 |
| **总计** | | **16 小时** |

## 成功标准

1. ✅ 技能数据持久化到 SQLite
2. ✅ 支持从 6 个根目录扫描技能
3. ✅ 双向同步工作正常（disk wins）
4. ✅ 安全扫描检测 12+ 类威胁
5. ✅ 支持从 ClawdHub/skills.sh 安装
6. ✅ API 兼容 http://localhost:3100/skills
7. ✅ 前端风格和交互保持不变
