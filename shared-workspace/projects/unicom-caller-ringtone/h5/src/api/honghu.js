// 鸿鹄大模型 API 封装
const HONGHU_CONFIG = {
  baseURL: 'https://api.honghu.com/v1',
  apiKey: '', // 未配置时使用模拟回复
  model: 'honghu'
}

// 模拟回复数据
const mockResponses = {
  '拜年': '好的！帮你创作拜年视频。请问是给谁拜年呢？',
  '企业': '好的！帮你创作企业宣传视频。请选择行业类型：',
  'IP': '太棒了！联通有200+热门IP可以联动创作。请选择你喜欢的IP：',
  '默认': '我理解了你的需求。请问你希望视频是什么风格的？'
}

// 调用鸿鹄大模型
export async function chatWithHonghu(message) {
  // 如果没有配置API Key，使用模拟回复
  if (!HONGHU_CONFIG.apiKey) {
    return mockReply(message)
  }

  try {
    const response = await fetch(`${HONGHU_CONFIG.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HONGHU_CONFIG.apiKey}`
      },
      body: JSON.stringify({
        model: HONGHU_CONFIG.model,
        messages: [
          {
            role: 'system',
            content: '你是联通智能彩铃助手"小鸿"，专业、友好、简洁。帮助用户创作视频彩铃。'
          },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    })

    const data = await response.json()
    return data.choices[0].message.content
  } catch (error) {
    console.error('Honghu API Error:', error)
    return mockReply(message)
  }
}

// 模拟回复
function mockReply(message) {
  return new Promise((resolve) => {
    setTimeout(() => {
      for (const [key, value] of Object.entries(mockResponses)) {
        if (message.includes(key)) {
          resolve(value)
          return
        }
      }
      resolve(mockResponses['默认'])
    }, 800)
  })
}

export default { chatWithHonghu }