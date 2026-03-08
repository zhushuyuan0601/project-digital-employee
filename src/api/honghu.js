import axios from 'axios'

// 鸿鹄大模型配置
const HONGHU_CONFIG = {
  baseURL: 'https://api.honghu.com/v1', // 替换为实际API地址
  apiKey: 'your-api-key', // 替换为实际API Key
  model: 'honghu'
}

// 创建axios实例
const api = axios.create({
  baseURL: HONGHU_CONFIG.baseURL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${HONGHU_CONFIG.apiKey}`
  },
  timeout: 30000
})

// 对话历史（用于多轮对话）
let conversationHistory = []

/**
 * 调用鸿鹄大模型进行对话
 * @param {string} message - 用户消息
 * @returns {Promise<string>} - AI回复
 */
export async function chatWithHonghu(message) {
  try {
    // 添加用户消息到历史
    conversationHistory.push({
      role: 'user',
      content: message
    })

    // 构建请求体（OpenAI格式）
    const requestBody = {
      model: HONGHU_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: `你是联通智能客服小通，专业、友好、简洁。
          
你的职责是帮助用户解决联通业务相关问题，包括：
- 套餐查询和办理
- 话费充值
- 流量查询
- 业务咨询
- 故障报修
- 投诉建议

请用简洁友好的语言回答用户问题。如果问题超出你的能力范围，建议用户转接人工客服。`
        },
        ...conversationHistory.slice(-10) // 保留最近10轮对话
      ],
      temperature: 0.7,
      max_tokens: 500
    }

    // 调用API
    const response = await api.post('/chat/completions', requestBody)

    // 提取回复
    const reply = response.data.choices[0].message.content

    // 添加到历史
    conversationHistory.push({
      role: 'assistant',
      content: reply
    })

    return reply

  } catch (error) {
    console.error('鸿鹄大模型调用失败:', error)
    
    // 模拟回复（开发环境）
    return getMockReply(message)
  }
}

/**
 * 清空对话历史
 */
export function clearHistory() {
  conversationHistory = []
}

/**
 * 模拟回复（开发环境使用）
 */
function getMockReply(message) {
  const mockReplies = {
    '套餐': '您当前使用的是联通5G套餐，月费99元，包含：\n• 国内流量：20GB\n• 国内语音：200分钟\n• 短信：100条\n\n如需变更套餐，请回复"变更套餐"或拨打10010。',
    '充值': '话费充值方式：\n\n1️⃣ 微信充值：打开微信-我-服务-手机充值\n2️⃣ 支付宝充值：打开支付宝-充值中心\n3️⃣ 联通APP：登录联通APP-充值缴费\n4️⃣ 拨打10011电话充值\n\n请问您需要哪种方式？',
    '流量': '您的流量使用情况：\n\n📊 已使用：8.5GB\n📊 剩余：11.5GB\n📊 套餐总量：20GB\n\n💡 温馨提示：您还可以办理流量叠加包，回复"流量包"了解详情。',
    '办理': '您可以办理以下业务：\n\n📱 新办号码\n📱 携号转网\n📱 套餐变更\n📱 宽带办理\n📱 增值业务\n\n请告诉我您想办理哪项业务，我会为您提供详细指引。',
    '故障': '很抱歉给您带来不便！请描述您遇到的故障情况：\n\n1️⃣ 网络信号差\n2️⃣ 无法上网\n3️⃣ 无法通话\n4️⃣ 短信收发异常\n5️⃣ 其他问题\n\n回复对应数字，我会帮您排查。',
    '人工': '正在为您转接人工客服...\n\n📞 客服热线：10010\n📞 服务时间：7:00-22:00\n\n您也可以描述您的问题，我会先尝试为您解决。',
    'default': '感谢您的咨询！我已记录您的问题。\n\n如需进一步帮助，您可以：\n• 继续描述您的问题\n• 回复"人工"转接人工客服\n• 拨打10010客服热线'
  }

  // 匹配关键词
  for (const [key, reply] of Object.entries(mockReplies)) {
    if (message.includes(key)) {
      return reply
    }
  }

  return mockReplies.default
}

export default {
  chatWithHonghu,
  clearHistory
}