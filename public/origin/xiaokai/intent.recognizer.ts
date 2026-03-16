/**
 * 意图识别服务
 * 基于BERT模型的意图分类器
 * @author 小开
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface IntentResult {
  type: string;
  confidence: number;
  entities?: Entity[];
}

export interface Entity {
  type: string;
  value: string;
  start: number;
  end: number;
}

@Injectable()
export class IntentRecognizer {
  private readonly intentTypes = [
    { code: 'greeting', desc: '问候', examples: ['你好', '在吗', 'Hi'] },
    { code: 'query_order', desc: '查询订单', examples: ['我的订单', '物流到哪了', '发货了吗'] },
    { code: 'query_product', desc: '查询产品', examples: ['这个多少钱', '有什么功能', '介绍一下'] },
    { code: 'refund_request', desc: '退款申请', examples: ['我要退款', '怎么退货', '不满意'] },
    { code: 'complaint', desc: '投诉建议', examples: ['投诉', '态度太差', '要举报'] },
    { code: 'technical_support', desc: '技术支持', examples: ['API报错', '怎么接入', '技术问题'] },
    { code: 'billing', desc: '账单问题', examples: ['多少钱', '怎么收费', '发票'] },
    { code: 'transfer_human', desc: '转人工', examples: ['找人工', '人工客服', '我要真人'] },
    { code: 'goodbye', desc: '结束对话', examples: ['再见', '拜拜', '谢谢'] },
    { code: 'others', desc: '其他', examples: [] },
  ];

  constructor(private config: ConfigService) {}

  /**
   * 识别用户意图
   */
  async recognize(text: string, context?: any[]): Promise<IntentResult> {
    // 调用NLP服务进行意图识别
    try {
      const response = await axios.post(
        this.config.get('NLP_SERVICE_URL') || 'http://localhost:5000/predict',
        {
          text,
          context: context?.slice(-5) || [], // 取最近5轮上下文
        },
        { timeout: 500 }
      );

      return {
        type: response.data.intent,
        confidence: response.data.confidence,
        entities: response.data.entities,
      };
    } catch (error) {
      // 服务降级：使用规则匹配
      return this.ruleBasedRecognition(text);
    }
  }

  /**
   * 基于规则的意图识别（降级方案）
   */
  private ruleBasedRecognition(text: string): IntentResult {
    const lowerText = text.toLowerCase();

    // 规则匹配
    const rules: Array<{ pattern: RegExp; intent: string }> = [
      { pattern: /^(你好|您好|在吗|hi|hello|有人吗)/, intent: 'greeting' },
      { pattern: /(订单|物流|快递|发货|到哪了)/, intent: 'query_order' },
      { pattern: /(多少钱|价格|怎么收费|贵吗)/, intent: 'billing' },
      { pattern: /(退款|退货|退钱|不满意)/, intent: 'refund_request' },
      { pattern: /(投诉|举报|态度差|骂人)/, intent: 'complaint' },
      { pattern: /(人工|客服|真人|找你们领导)/, intent: 'transfer_human' },
      { pattern: /(api|接口|技术|报错|代码|开发)/, intent: 'technical_support' },
      { pattern: /(再见|拜拜|bye|谢谢|感谢)/, intent: 'goodbye' },
    ];

    for (const rule of rules) {
      if (rule.pattern.test(lowerText)) {
        return {
          type: rule.intent,
          confidence: 0.7, // 规则匹配的置信度较低
          entities: this.extractEntities(text),
        };
      }
    }

    return {
      type: 'others',
      confidence: 0.5,
      entities: this.extractEntities(text),
    };
  }

  /**
   * 简单实体抽取
   */
  private extractEntities(text: string): Entity[] {
    const entities: Entity[] = [];

    // 订单号匹配（如：ORD20240308001）
    const orderPattern = /ORD\d{9,}/gi;
    let match;
    while ((match = orderPattern.exec(text)) !== null) {
      entities.push({
        type: 'order_id',
        value: match[0],
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    // 手机号匹配
    const phonePattern = /1[3-9]\d{9}/g;
    while ((match = phonePattern.exec(text)) !== null) {
      entities.push({
        type: 'phone',
        value: match[0],
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    // 时间匹配（如：今天、明天、3月8日）
    const timePattern = /(今天|明天|昨天|\d{1,2}月\d{1,2}日|\d{4}-\d{2}-\d{2})/g;
    while ((match = timePattern.exec(text)) !== null) {
      entities.push({
        type: 'time',
        value: match[0],
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    return entities;
  }

  /**
   * 获取所有意图类型
   */
  getIntentTypes() {
    return this.intentTypes;
  }
}
