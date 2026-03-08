import axios from 'axios'

const HONGHU_API = {
  baseURL: 'https://api.honghu.com/v1',
  apiKey: 'your-api-key',
  model: 'honghu'
}

const api = axios.create({
  baseURL: HONGHU_API.baseURL,
  headers: { 'Authorization': `Bearer ${HONGHU_API.apiKey}` },
  timeout: 30000
})

let messages = []

export async function chat(message) {
  messages.push({ role: 'user', content: message })
  
  try {
    const res = await api.post('/chat/completions', {
      model: HONGHU_API.model,
      messages: [
        { role: 'system', content: '你是联通AI智能客服，专业、友好、简洁。帮助用户解决套餐查询、话费充值、业务办理、故障报修等问题。' },
        ...messages.slice(-10)
      ]
    })
    const reply = res.data.choices[0].message.content
    messages.push({ role: 'assistant', content: reply })
    return reply
  } catch (e) {
    return getMockReply(message)
  }
}

function getMockReply(msg) {
  if (msg.includes('套餐')) return '您当前使用的是"5G畅享套餐"\n月费：129元\n流量：30GB/月\n通话：500分钟/月\n\n如需变更套餐，请回复"变更套餐"。'
  if (msg.includes('充值')) return '话费充值方式：\n1. 微信充值\n2. 支付宝充值\n3. 联通APP充值\n4. 拨打10011\n\n请问您需要哪种方式？'
  if (msg.includes('流量')) return '您的流量使用情况：\n已使用：12.5GB\n剩余：17.5GB\n套餐总量：30GB'
  if (msg.includes('办理')) return '可办理业务：\n📱 新办号码\n📱 套餐变更\n📱 宽带办理\n📱 增值业务\n\n请告诉我您想办理的业务。'
  if (msg.includes('故障')) return '请描述您遇到的故障：\n1. 网络信号差\n2. 无法上网\n3. 无法通话\n4. 其他问题\n\n回复数字选择。'
  if (msg.includes('人工')) return '正在转接人工客服...\n客服热线：10010\n服务时间：7:00-22:00'
  return '感谢您的咨询！请问还有什么可以帮您？\n\n您可以：\n• 继续描述问题\n• 回复"人工"转人工客服'
}

export function clearMessages() { messages = [] }
export function getMessages() { return [...messages] }