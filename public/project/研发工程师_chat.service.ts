/**
 * 智能客服核心服务类
 * @author 小开
 * @since 2026-03-08
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Redis } from 'ioredis';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { ChatSession, ChatMessage } from './entities';
import { IntentRecognizer } from './nlp/intent.recognizer';
import { KnowledgeBaseService } from './knowledge-base.service';
import { LLMService } from './llm/llm.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatSession)
    private sessionRepo: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private messageRepo: Repository<ChatMessage>,
    @InjectRedis()
    private redis: Redis,
    private intentRecognizer: IntentRecognizer,
    private kbService: KnowledgeBaseService,
    private llmService: LLMService,
  ) {}

  /**
   * 创建新的对话会话
   */
  async createSession(userId: string, channel: string, metadata?: any): Promise<ChatSession> {
    const session = this.sessionRepo.create({
      userId,
      channel,
      metadata,
      status: 'active',
    });

    const saved = await this.sessionRepo.save(session);

    // 缓存会话信息
    await this.redis.setex(
      `session:${saved.id}`,
      1800, // 30分钟过期
      JSON.stringify({ userId, channel, context: [] })
    );

    return saved;
  }

  /**
   * 处理用户消息并生成回复
   */
  async processMessage(sessionId: string, content: string): Promise<MessageResponse> {
    const startTime = Date.now();

    // 1. 获取会话上下文
    const session = await this.getSession(sessionId);

    // 2. 保存用户消息
    await this.saveMessage(sessionId, content, 'user');

    // 3. 意图识别
    const intent = await this.intentRecognizer.recognize(content, session.context);

    // 4. 根据意图类型处理
    let reply: string;
    let source: 'kb' | 'llm' | 'template';

    if (intent.confidence > 0.8) {
      // 高置信度：查询知识库
      const kbResult = await this.kbService.search(content, 1);
      if (kbResult.length > 0 && kbResult[0].score > 0.85) {
        reply = kbResult[0].answer;
        source = 'kb';
      } else {
        reply = await this.llmService.generate(content, session.context);
        source = 'llm';
      }
    } else {
      // 低置信度：使用大模型兜底
      reply = await this.llmService.generate(content, session.context);
      source = 'llm';
    }

    // 5. 保存机器人回复
    await this.saveMessage(sessionId, reply, 'bot', { intent: intent.type, source });

    // 6. 更新会话上下文
    await this.updateContext(sessionId, content, reply);

    // 7. 记录响应时间
    const responseTime = Date.now() - startTime;
    await this.redis.lpush('metrics:response_time', responseTime.toString());

    return {
      messageId: `msg_${Date.now()}`,
      content: reply,
      intent: intent.type,
      confidence: intent.confidence,
      source,
      responseTime,
      suggestions: await this.generateSuggestions(intent.type),
    };
  }

  /**
   * 获取会话历史
   */
  async getHistory(sessionId: string, limit: number = 50): Promise<ChatMessage[]> {
    return this.messageRepo.find({
      where: { sessionId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * 转人工服务
   */
  async transferToHuman(sessionId: string, reason: string): Promise<void> {
    await this.sessionRepo.update(sessionId, {
      status: 'transferred',
      transferredAt: new Date(),
      transferReason: reason,
    });

    // 通知人工客服系统
    await this.redis.publish('transfer:human', JSON.stringify({
      sessionId,
      reason,
      timestamp: Date.now(),
    }));
  }

  /**
   * 获取会话信息（带缓存）
   */
  private async getSession(sessionId: string): Promise<SessionCache> {
    const cached = await this.redis.get(`session:${sessionId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      throw new Error('Session not found');
    }

    const data = {
      userId: session.userId,
      channel: session.channel,
      context: [],
    };

    await this.redis.setex(`session:${sessionId}`, 1800, JSON.stringify(data));
    return data;
  }

  /**
   * 保存消息
   */
  private async saveMessage(
    sessionId: string,
    content: string,
    sender: 'user' | 'bot',
    metadata?: any,
  ): Promise<void> {
    const message = this.messageRepo.create({
      sessionId,
      content,
      senderType: sender,
      metadata,
    });
    await this.messageRepo.save(message);
  }

  /**
   * 更新对话上下文
   */
  private async updateContext(sessionId: string, userMsg: string, botReply: string): Promise<void> {
    const key = `session:${sessionId}`;
    const cached = await this.redis.get(key);

    if (cached) {
      const data = JSON.parse(cached);
      data.context.push({ role: 'user', content: userMsg });
      data.context.push({ role: 'assistant', content: botReply });

      // 只保留最近10轮对话
      if (data.context.length > 20) {
        data.context = data.context.slice(-20);
      }

      await this.redis.setex(key, 1800, JSON.stringify(data));
    }
  }

  /**
   * 生成推荐问题
   */
  private async generateSuggestions(intentType: string): Promise<string[]> {
    const suggestionsMap: Record<string, string[]> = {
      query_order: ['查看最近订单', '物流查询', '申请退款'],
      query_product: ['产品价格', '功能介绍', '与XX的区别'],
      technical_support: ['API文档', '接入指南', '常见问题'],
      complaint: ['投诉进度查询', '联系客服经理', '服务评价'],
    };

    return suggestionsMap[intentType] || ['联系人工客服', '查看帮助中心'];
  }
}

// 类型定义
interface MessageResponse {
  messageId: string;
  content: string;
  intent: string;
  confidence: number;
  source: 'kb' | 'llm' | 'template';
  responseTime: number;
  suggestions: string[];
}

interface SessionCache {
  userId: string;
  channel: string;
  context: Array<{ role: string; content: string }>;
}
