// OpenAI API 兼容的 AI 模型服务客户端
// 本地 AI 模型服务

// 默认配置 - 使用 Vite 代理
export const AI_MODEL_CONFIG = {
  baseUrl: '/ai-api', // 使用本地代理
  apiKey: 'xbgaoB4K9iQNETmoEg2j8Tu5HKxlxv8Odx3ak0vOIXne73jNlm3ePtTV46fKH2KtzmpC1pOjMzuDbgx2efueAPKUmdzxZLOaX5H0l9H1QYIdLsfXCjGN2x2VJEpumhnfHAfCoPFOnLqiUc3wdSG',
  model: 'Qwen3-235B-A22B-Instruct-2507'
}

// Chat 消息类型
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// 请求参数
export interface ChatCompletionParams {
  messages: ChatMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

// 响应结构
export interface ChatCompletionResponse {
  id: string
  object: 'chat.completion'
  created: number
  model: string
  choices: Array<{
    index: number
    message: ChatMessage
    finishReason: string
  }>
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

/**
 * 发送 Chat Completion 请求
 */
export async function chatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResponse> {
  const { messages, model = AI_MODEL_CONFIG.model, temperature = 0.7, maxTokens = 4096 } = params

  const response = await fetch(`${AI_MODEL_CONFIG.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AI_MODEL_CONFIG.apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: false
    }),
    mode: 'cors'
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`AI 模型服务请求失败：${response.status} ${response.statusText} - ${errorText}`)
  }

  return response.json()
}

/**
 * 调用 AI 模型并返回文本内容
 */
export async function callAiModel(prompt: string, systemPrompt?: string): Promise<string> {
  const messages: ChatMessage[] = []

  if (systemPrompt) {
    messages.push({
      role: 'system',
      content: systemPrompt
    })
  }

  messages.push({
    role: 'user',
    content: prompt
  })

  const response = await chatCompletion({ messages })

  return response.choices[0]?.message?.content || ''
}

/**
 * 解析 AI 返回的 JSON 响应
 */
export function parseJsonResponse<T>(content: string): T | null {
  try {
    // 尝试从响应中提取 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }

    // 尝试直接解析
    const trimmed = content.trim()
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return JSON.parse(trimmed)
    }

    return null
  } catch (err) {
    console.warn('[AI Model] JSON 解析失败:', err)
    return null
  }
}
