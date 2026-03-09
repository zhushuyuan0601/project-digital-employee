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
        { role: 'system', content: '你是联通智铃AI助手"小铃"，专业、友好。帮助用户创作视频彩铃：拜年、企业宣传、IP模板等。引导用户描述需求，生成视频创意。' },
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
  if (msg.includes('拜年')) return '好的！我来帮您创作拜年视频彩铃。\n\n请选择风格：\n1. 国风传统\n2. 现代时尚\n3. 卡通可爱\n\n回复数字选择，或描述您想要的风格~'
  if (msg.includes('企业') || msg.includes('宣传')) return '企业宣传视频彩铃是个好选择！\n\n请告诉我：\n• 企业名称是什么？\n• 主要业务是什么？\n• 想突出什么特点？\n\n我来帮您生成专属企业彩铃！'
  if (msg.includes('模板') || msg.includes('IP')) return '我们有多种IP模板可选：\n\n🧧 春节拜年系列\n🏢 企业宣传系列\n🎉 节日祝福系列\n📈 商务营销系列\n\n告诉我您的需求，我帮您推荐合适的模板！'
  if (msg.includes('国风') || msg.includes('传统')) return '国风拜年视频已为您准备好！\n\n🎬 视频预览：\n• 风格：国风传统\n• 时长：15秒\n• 元素：祥云、福字、舞狮\n\n确认生成视频吗？回复"确认"开始生成~'
  if (msg.includes('确认')) return '🎉 视频生成中...\n\n预计等待时间：1-2分钟\n\n生成完成后将自动预览，您可以直接设为视频彩铃！'
  return '您好！我是联通智铃助手小铃 🔔\n\n我可以帮您创作视频彩铃：\n• 🧧 拜年祝福\n• 🏢 企业宣传\n• 🎨 IP模板\n\n说一句话，我来帮您创作专属视频彩铃！'
}

export function clearMessages() { messages = [] }
export function getMessages() { return [...messages] }