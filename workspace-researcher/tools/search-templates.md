# 搜索模板库

## 微信公众号搜索（核心数据源）

### AI 技术前沿

```bash
# 机器之心 - 最新文章
web_fetch({"url": "https://wx.sogou.com/weixin?type=2&query=机器之心 site:weixin.qq.com"})

# 量子位 - 大模型相关
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com 量子位 大模型&tbs=qdr:d"})

# AI科技评论 - 学术会议
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com AI科技评论 NeurIPS CVPR&tbs=qdr:w"})

# 新智元 - Agent 应用
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com 新智元 Agent&tbs=qdr:d"})

# 深度求索（DeepSeek）- 模型更新
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com 深度求索 DeepSeek&tbs=qdr:d"})

# 智谱AI - GLM 系列
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com 智谱AI GLM&tbs=qdr:d"})

# 通义千问 - Qwen 系列
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com 通义千问 Qwen&tbs=qdr:d"})

# 百度智能云 - ERNIE Bot
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com 百度智能云 文心&tbs=qdr:d"})
```

### 运营商动态

```bash
# 中国移动 - 算力网络
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com 中国移动 算力网络&tbs=qdr:d"})

# 中国移动 - 九天AI
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com 中国移动 九天AI&tbs=qdr:d"})

# 中国电信 - 云网融合
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com 中国电信 云网融合&tbs=qdr:d"})

# 中国电信 - 星辰大模型
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com 中国电信 星辰&tbs=qdr:d"})

# 中国联通 - 鸿湖大模型
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com 中国联通 鸿湖&tbs=qdr:d"})

# 中国移动研究院 - 白皮书
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com 中国移动研究院 白皮书 filetype:pdf"})

# 中国电信研究院 - 6G 预研
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com 中国电信研究院 6G&tbs=qdr:w"})
```

### 互联网产品

```bash
# 阿里技术 - 通义千问
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com 阿里技术 通义千问&tbs=qdr:d"})

# 腾讯研究院 - 混元大模型
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com 腾讯研究院 混元&tbs=qdr:d"})

# 华为研究 - 盘古大模型
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com 华为研究 盘古&tbs=qdr:d"})

# 晚点LatePost - 大厂战略
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com 晚点LatePost AI&tbs=qdr:w"})

# 36氪 - 创业公司融资
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com 36氪 AI 融资&tbs=qdr:d"})

# 虎嗅APP - 商业分析
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com 虎嗅 商业&tbs=qdr:w"})
```

### 市场报告

```bash
# IDC咨询 - 市场数据
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com IDC咨询 AI 市场&tbs=qdr:m"})

# 艾瑞咨询 - 行业报告
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com 艾瑞咨询 白皮书 filetype:pdf"})

# 头豹研究院 - PPT 报告
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com 头豹研究院 报告&tbs=qdr:m"})

# 甲子光年 - AI 基础设施
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com 甲子光年 Agent&tbs=qdr:w"})
```

## 站点搜索（备用方案）

当微信公众号搜索结果不理想时，使用全网搜索：

```bash
# 百度搜索 - 最新 AI 新闻
web_fetch({"url": "https://www.baidu.com/s?wd=人工智能 最新新闻&tbs=qdr:d"})

# 百度搜索 - Agent 相关
web_fetch({"url": "https://www.baidu.com/s?wd=AI Agent 应用&tbs=qdr:w"})

# 必应国际 - 英文新闻
web_fetch({"url": "https://cn.bing.com/search?q=AI Agent news&ensearch=1&tbs=qdr:d"})

# DuckDuckGo - 隐私搜索
web_fetch({"url": "https://duckduckgo.com/html/?q=AI model release&tbs=qdr:d"})
```

## 关键词组合搜索

### 技术突破类
- "大模型 发布"
- "推理 优化"
- "模型架构"
- "多模态 突破"
- "Agent 平台"
- "工具调用"

### 产品应用类
- "产品上线"
- "商业化 落地"
- "场景 应用"
- "API 开放"
- "SDK 发布"

### 市场动态类
- "融资 轮次"
- "估值 变化"
- "市场份额"
- "白皮书 发布"
- "战略合作"

## 时间过滤器说明

- `tbs=qdr:h` - 过去 1 小时
- `tbs=qdr:d` - 过去 1 天
- `tbs=qdr:w` - 过去 1 周
- `tbs=qdr:m` - 过去 1 个月
- `tbs=qdr:y` - 过去 1 年

## 批量脚本示例

```bash
# 快速扫描热点（复制这些命令）

# 扫描 AI 前沿（8 个号）
web_fetch({"url": "https://wx.sogou.com/weixin?type=2&query=机器之心"})
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com 量子位&tbs=qdr:d"})
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com AI科技评论&tbs=qdr:d"})
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com 新智元&tbs=qdr:d"})
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com 深度求索&tbs=qdr:d"})
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com 智谱AI&tbs=qdr:d"})
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com 通义千问&tbs=qdr:d"})
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com 百度智能云&tbs=qdr:d"})

# 扫描运营商（8 个号）
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com 中国移动&tbs=qdr:d"})
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com 中国电信&tbs=qdr:d"})
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com 中国联通&tbs=qdr:d"})
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com 中国移动研究院&tbs=qdr:w"})
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com 中国电信研究院&tbs=qdr:w"})
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com 中国联通研究院&tbs=qdr:w"})
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com 天翼物联&tbs=qdr:w"})
web_fetch({"url": "https://www.google.com/search?q=site:weixin.qq.com 九天人工智能&tbs=qdr:d"})
```