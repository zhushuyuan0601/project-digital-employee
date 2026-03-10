# AI 情报自动收集系统 - 技术评估报告

## 需求摘要

**产品名称**: AI 情报自动收集系统（MVP）

**核心目标**: 自动化爬取、分类、生成并推送 AI 行业情报简报

**关键需求**:
- 支持微信公众号和新闻网站爬取
- 自动智能分类（大模型、智能体、产品、竞品、学术）
- 每日 7:30 爬取，8:00 推送
- 推送至邮件（793323821@qq.com）和飞书群组

---

## 技术可行性评估

| 评估项 | 结果 | 说明 |
|--------|------|------|
| **整体可行性** | ✅ 可行 | 技术栈成熟，无关键技术障碍 |
| **技术难度** | 中等 | 需处理爬取反爬、AI分类、定时调度等 |
| **预估工期** | 2-3 周 | MVP 核心功能开发 + 测试 |

---

## 详细技术方案评估

### 1. 微信公众号爬取方案

#### 方案对比

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **方案A：第三方 API（微信公众号素材管理 API）** | 官方合规、稳定、无反爬风险 | 需要公众号运营者授权、仅限自有公众号 | ⭐ |
| **方案B：爬虫 + 模拟浏览器（Playwright/Selenium）** | 无需授权、可爬取任何公开文章 | 反爬强、维护成本高、合规风险 | ⭐⭐ |
| **方案C：第三方数据服务商** | 稳定、合规、数据质量高 | 需付费、成本较高 | ⭐⭐⭐⭐ |
| **方案D：RSS 订阅（部分第三方服务）** | 简单、稳定、无反爬 | 仅支持部分公众号、实时性差 | ⭐⭐ |

#### 推荐方案：**混合方案（MVP 阶段）**

**Phase 1（MVP）**:
- **新闻网站**：使用 Playwright 爬取（36氪、机器之心、新智元）
- **微信公众号**：暂时跳过或使用 RSS 订阅工具（如 weRSS、ReallyRSS）
- **理由**：MVP 优先验证核心流程，公众号爬取可后续增强

**Phase 2（增强版）**:
- 接入第三方公众号内容 API（如搜狗搜索、新榜等）
- 或申请公众号授权，使用官方素材管理 API

#### 技术实现
```python
# 推荐技术栈
- 爬虫引擎: Playwright（支持动态页面、反爬对抗）
- 反爬策略: 
  - 随机 User-Agent
  - 请求间隔随机化（2-5秒）
  - 代理 IP 池（可选）
- 数据提取: BeautifulSoup + lxml
```

#### 合规性建议
- 遵守 robots.txt
- 控制爬取频率，避免对服务器造成压力
- 明确标注内容来源，不用于商业用途
- MVP 阶段可先从公开新闻网站入手

---

### 2. 数据存储方式

#### 方案对比

| 存储方式 | 优点 | 缺点 | 推荐度 |
|----------|------|------|--------|
| **方案A：文件存储（JSON/Markdown）** | 简单、无依赖、易于迁移 | 难以查询、无索引、并发能力弱 | ⭐⭐ |
| **方案B：PostgreSQL** | 功能强大、支持全文搜索、ACID | 相对重量、需部署 | ⭐⭐⭐⭐ |
| **方案C：MongoDB** | 灵活、Schema-less、适合 JSON | 查询复杂度较高 | ⭐⭐⭐ |
| **方案D：SQLite** | 轻量、无服务器、单文件 | 并发写入能力有限 | ⭐⭐⭐⭐⭐ |

#### 推荐方案：**SQLite**

**理由**:
- MVP 阶段数据量不大（每日约 100-200 条记录）
- 轻量级，无需额外部署服务
- 支持全文搜索（使用 FTS5）
- 易于备份和迁移（单文件）
- 可平滑迁移到 PostgreSQL 后续扩展

#### 数据库设计
```sql
-- 文章表
CREATE TABLE articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    source TEXT,           -- 来源：公众号/36氪/机器之心
    source_id TEXT,        -- 源ID
    content TEXT,          -- 摘要内容
    full_content TEXT,     -- 完整内容（可选）
    category TEXT,         -- AI分类：大模型/智能体/产品/竞品/学术
    published_at TIMESTAMP,
    crawled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    importance INTEGER,    -- 重要性评分
    status TEXT DEFAULT 'new'  -- new/processed/sent
);

-- 分类表
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT
);

-- 全文搜索索引
CREATE VIRTUAL TABLE articles_fts USING fts5(
    title, content, source,
    content='articles',
    content_rowid='id'
);

-- 索引优化
CREATE INDEX idx_articles_category ON articles(category);
CREATE INDEX idx_articles_source ON articles(source);
CREATE INDEX idx_articles_published ON articles(published_at DESC);
```

#### 数据备份策略
- 每日自动备份数据库文件（gzip 压缩）
- 保留最近 7 天的备份
- 保留每周的备份（4 周）

---

### 3. AI 分类模型选择

#### 方案对比

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **方案A：OpenAI API (GPT-4/3.5)** | 准确率高、无需训练、即时可用 | 需付费、依赖外部服务、延迟较高 | ⭐⭐⭐⭐ |
| **方案B：本地模型（Qwen/GLM）** | 免费调用、无延迟、数据隐私 | 需硬件资源、准确率略低 | ⭐⭐⭐⭐⭐ |
| **方案C：微调的专用模型** | 针对性强，准确率高 | 需训练数据和模型调优成本 | ⭐⭐ |
| **方案D：传统 NLP（BERT + 分类器）** | 轻量、推理快 | 准确率较低、训练复杂 | ⭐⭐ |

#### 推荐方案：**本地模型（GLM-4 或 Qwen）**

**理由**:
- 你本地已有 GLM-4-Qwen3 模型（local-qwen3/GLM-4.7-FP8）
- 免费无限制调用，节省成本
- 延迟低，可快速处理批量文章
- 数据安全，不受外部服务影响
- MVP 阶段准确率已足够（目标 80%）

#### 技术实现
```python
# 使用本地 LLM 进行分类
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:11434/v1",  # 假设使用本地 Ollama
    api_key="dummy"
)

def classify_article(title, content):
    """分类文章主题"""
    prompt = f"""
请将以下文章分类为以下类别之一：
1. 大模型动态（发布、更新、评测）
2. 智能体 AI（Agent 框架、工具、案例）
3. 互联网产品（新产品、功能更新）
4. 竞品动态（电信、移动等）
5. 学术研究（论文、技术突破）

文章标题: {title}
文章内容: {content}

请只返回类别名称，不要其他内容。
"""
    
    response = client.chat.completions.create(
        model="glm-4",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,  # 低温度保证稳定性
        max_tokens=20
    )
    
    return response.choices[0].message.content.strip()
```

#### 分类准确率保障
- 使用 Few-shot Prompting 提供示例
- 温度设为 0.1 提高稳定性
- 加入关键词匹配作为后兜底策略
- MVP 验证期手动标注 100 条样本，评估准确率

#### 降级方案
如果本地模型不稳定，可临时切换到 OpenAI API：
- GPT-4o-mini（便宜且准确）
- 预估成本：每日 200 条 × 0.0015 = $0.3/天

---

### 4. 定时任务实现

#### 方案对比

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **方案A：系统 Cron** | 简单、稳定、无依赖 | 不适合复杂任务调度 | ⭐⭐⭐ |
| **方案B：APScheduler** | 功能强大、支持重试、易于管理 | 额外依赖 | ⭐⭐⭐⭐⭐ |
| **方案C：Celery + Beat** | 分布式支持、任务队列复杂 | 重量级、过度设计 | ⭐⭐⭐ |
| **方案D：OpenClaw Cron** | 集成度高、支持触发事件 | 依赖 OpenClaw | ⭐⭐⭐⭐ |

#### 推荐方案：**APScheduler + OpenClaw Cron（混合）**

**理由**:
- APScheduler 适合处理内部定时任务（爬取、分类、生成简报）
- OpenClaw Cron 适合跨系统通知（如触发其他 Agent）
- 灵活可控，支持任务重试和错误处理

#### 技术实现
```python
# 使用 APScheduler
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.events import EVENT_JOB_ERROR

scheduler = BackgroundScheduler()

# 任务1：爬取数据（每日 7:30）
scheduler.add_job(
    func=crawl_articles,
    trigger=CronTrigger(hour=7, minute=30),
    id='crawl_task',
    max_instances=1,
    replace_existing=True
)

# 任务2：生成简报并推送（每日 8:00）
scheduler.add_job(
    func=generate_and_send_report,
    trigger=CronTrigger(hour=8, minute=0),
    id='report_task',
    max_instances=1,
    replace_existing=True
)

# 错误处理
def job_error_listener(event):
    if event.exception:
        log_error(f"任务失败: {event.job_id}", event.exception)

scheduler.add_listener(job_error_listener, EVENT_JOB_ERROR)

# 自动备份（每日凌晨 2:00）
scheduler.add_job(
    func=backup_database,
    trigger=CronTrigger(hour=2, minute=0),
    id='backup_task'
)

scheduler.start()
```

#### 任务编排
```
7:30 - 爬取任务启动
  ├── 爬取 36氪 → 存入 DB
  ├── 爬取 机器之心 → 存入 DB
  └── 爬取 新智元 → 存入 DB
      ↓
7:35 - 分类任务（等待爬取完成）
  ├── 批量调用 LLM 分类
  └── 更新 DB 分类标签
      ↓
7:50 - 生成简报
  ├── 按分类筛选 Top 10
  ├── 生成 Markdown
  └── 评分排序
      ↓
8:00 - 推送任务
  ├── 发送邮件
  └── 发送飞书消息
```

#### 容错机制
- 任务超时：设置 timeout（爬取 30 分钟，分类 10 分钟）
- 失败重试：最多重试 2 次，间隔 5 分钟
- 幂等性：任务完成后记录 status，避免重复执行

---

### 5. 错误处理和监控

#### 错误处理策略

| 错误类型 | 处理方式 | 最终动作 |
|----------|----------|----------|
| **爬取单个源失败** | 记录日志、跳过该源 | 继续处理其他源 |
| **所有爬取源失败** | 发送告警邮件 | 推送失败通知 + 原始数据 |
| **AI分类失败** | 降级到关键词匹配 | 标记为 "未分类" |
| **简报生成失败** | 降级到基础版 | 发送原始数据列表 |
| **邮件发送失败** | 重试 3 次 | 失败后推送到飞书 |
| **飞书发送失败** | 重试 3 次 | 失败后记录日志 |
| **系统崩溃** | 日志记录 | 自动重启 + 发送告警 |

#### 日志系统
```python
import logging
from logging.handlers import RotatingFileHandler

# 日志配置
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        RotatingFileHandler(
            'logs/app.log',
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5
        ),
        logging.StreamHandler()
    ]
)

# 告警日志
alert_logger = logging.getLogger('ALERT')
alert_logger.addHandler(logging.FileHandler('logs/alerts.log'))
```

#### 监控指标
```python
# 关键指标
METRICS = {
    'crawl_success_rate': 0.95,    # 爬取成功率 ≥ 95%
    'crawl_time_max': 30,          # 最大爬取时间（分钟）
    'classify_accuracy': 0.80,     # 分类准确率 ≥ 80%
    'report_gen_time': 5,          # 简报生成时间（分钟）
    'send_success_rate': 0.99,     # 推送成功率 ≥ 99%
    'uptime': 0.99,                # 系统可用性 ≥ 99%
}
```

#### 健康检查端点
```python
from fastapi import FastAPI
import psutil

app = FastAPI()

@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {
        'status': 'ok',
        'cpu': psutil.cpu_percent(),
        'memory': psutil.virtual_memory().percent,
        'last_crawl_time': get_last_crawl_time(),
        'next_scheduled_time': get_next_schedule_time()
    }
```

#### 告警通知
- **邮件告警**：严重错误（系统崩溃、所有源失败）
- **飞书告警**：重要错误（推送失败、分类准确率 < 70%）
- **日志告警**：记录所有错误，定期审查

---

## 成本评估

### 开发成本

| 阶段 | 工作量 | 说明 |
|------|--------|------|
| 技术设计 | 1 天 | 架构设计、数据模型设计 |
| 爬虫开发 | 3 天 | 爬取 3 个新闻源 |
| 数据库 & 分类 | 2 天 | SQLite + LLM 分类集成 |
| 简报生成 | 1 天 | Markdown 生成 + 排序 |
| 推送集成 | 2 天 | 邮件 + 飞书集成 |
| 测试 & 调优 | 3 天 | 端到端测试 + 优化 |
| **总计** | **12 天** | 约 2.5 周 |

### 运营成本

| 项目 | 成本 | 说明 |
|------|------|------|
| 服务器 | 免费 | 本机运行或免费云服务器 |
| AI 调用 | $0/月 | 使用本地模型 |
| 邮件发送 | 免费 | 使用 SMTP 免费服务 |
| 存储 | 免费 | SQLite 轻量存储 |
| **总计** | **$0/月** | MVP 阶段零成本 |

---

## 技术风险与缓解

| 风险 | 等级 | 缓解方案 |
|------|------|----------|
| **爬虫反爬** | 高 | 使用 Playwright + 代理 IP + 随机延迟 |
| **AI分类准确率不足** | 中 | Few-shot Prompting + 关键词兜底 + 人工标注优化 |
| **数据源失效** | 中 | 多源备份 + 定期检查源可用性 |
| **定时任务执行失败** | 低 | 任务重试 + 备用调度（系统 cron） |
| **推送服务不可用** | 低 | 双渠道推送（邮件 + 飞书）兜底 |
| **系统崩溃** | 中 | 日志记录 + 自动重启 + 健康检查 |

---

## 推荐技术栈

| 层级 | 技术 | 理由 |
|------|------|------|
| **编程语言** | Python 3.11+ | 生态丰富、上手快 |
| **爬虫引擎** | Playwright | 动态渲染、支持 JS |
| **数据存储** | SQLite + FTS5 | 轻量、支持全文搜索 |
| **AI 分类** | 本地 GLM-4/Qwen | 免费、准确、低延迟 |
| **定时调度** | APScheduler | 功能完善、易维护 |
| **邮件发送** | smtplib + SMTP | 免费、原生支持 |
| **飞书集成** | 飞书 Python SDK | 官方 SDK、稳定 |
| **日志** | Python logging | 原生、易扩展 |
| **监控** | 自定义健康检查 | 轻量、满足 MVP |

---

## 开发里程碑

### Week 1: 基础框架
- [ ] 项目初始化 + 依赖安装
- [ ] 数据库设计 + SQLite 集成
- [ ] 爬虫框架搭建（单源验证）
- [ ] AI 分类集成（单条测试）

### Week 2: 核心功能
- [ ] 多源爬取（36氪、机器之心、新智元）
- [ ] 批量分类 + 准确率优化
- [ ] 简报生成 + 排序算法
- [ ] 定时任务调度

### Week 3: 推送 & 优化
- [ ] 邮件发送集成
- [ ] 飞书消息集成
- [ ] 错误处理 + 日志系统
- [ ] 端到端测试 + 上线

---

## 结论

### ✅ 建议立项

**理由**:
1. **技术可行**: 所有技术点均有成熟方案，无技术瓶颈
2. **成本可控**: MVP 阶段零成本，本地模型免费调用
3. **工期合理**: 2-3 周可完成核心功能
4. **风险可控**: 识别了主要风险，有明确缓解方案
5. **可扩展**: 架构设计支持后续增强（新源、更多分类）

### 下一步行动
1. ✅ CEO 确认立项
2. 🤞 产品经理确认需求细节（明确爬取源 URL、分类定义）
3. 💻 技术总监开始技术设计（详细技术文档）
4. 🤖 协调 Claude Code 开发（或本地编写）
5. 📊 开发完成后，产品经理验收

---

**评估人**: Alex（技术总监）💻
**评估时间**: 2026-03-04
**状态**: 待 CEO 决策