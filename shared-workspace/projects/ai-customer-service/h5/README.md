# AI智能客服 H5

> 基于 Vue 3 + Vant UI + 鸿鹄大模型的智能客服H5应用

## 快速开始

```bash
cd ~/.openclaw/shared-workspace/projects/ai-customer-service/h5
npm install
npm run dev
# 访问 http://localhost:5174
```

## 功能

| 功能 | 说明 |
|------|------|
| 智能对话 | 鸿鹄大模型多轮对话 |
| 快捷入口 | 套餐/充值/流量/办理/故障/人工 |
| 历史记录 | 本地存储对话 |
| 个人中心 | 工单/反馈 |

## 鸿鹄配置

编辑 `src/api/honghu.js`：

```javascript
const HONGHU_API = {
  baseURL: 'https://api.honghu.com/v1',
  apiKey: 'your-api-key',
  model: 'honghu'
}
```