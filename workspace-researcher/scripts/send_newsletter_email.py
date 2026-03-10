#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI每日简报邮件发送脚本
发送时间：每天定时发送
收件人：zhusy62@chinaunicom.cn
"""

import smtplib
import ssl
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

# 邮件配置
SMTP_SERVER = "xcm.mail.chinaunicom.cn"
SMTP_PORT = 465
FROM_ADDR = "hqs-ltzxpms@chinaunicom.cn"
PASSWORD = "Ltzxpms@1qa2ws"

# 收件人列表
TO_ADDRS = [
    "zhusy62@chinaunicom.cn",
    "jianghao11@chinaunicom.cn",
]

def read_newsletter():
    """读取今日简报内容"""
    today = datetime.now().strftime("%Y-%m-%d")
    # 尝试多个可能的文件名
    possible_files = [
        os.path.expanduser(f"~/.openclaw/shared-workspace/daily-intel/{today}-newsletter.md"),
        os.path.expanduser(f"~/.openclaw/shared-workspace/daily-intel/{today}-ai-briefing.md"),
        os.path.expanduser(f"~/.openclaw/shared-workspace/daily-intel/{today}-researcher.md"),
    ]
    
    for newsletter_path in possible_files:
        if os.path.exists(newsletter_path):
            with open(newsletter_path, 'r', encoding='utf-8') as f:
                return f.read()
    
    print(f"❌ 简报文件不存在，尝试了以下路径：")
    for f in possible_files:
        print(f"   {f}")
    return None

def send_email(content):
    """发送邮件"""
    if not content:
        print("❌ 无内容可发送")
        return False
    
    # 创建邮件
    msg = MIMEMultipart()
    msg["Subject"] = f"📰 AI每日简报 - {datetime.now().strftime('%Y年%m月%d日')}"
    msg["From"] = FROM_ADDR
    msg["To"] = ", ".join(TO_ADDRS)
    
    # 将Markdown转换为HTML（简单处理）
    html_content = f"""
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }}
            h1 {{ color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }}
            h2 {{ color: #1e40af; margin-top: 30px; }}
            h3 {{ color: #3b82f6; }}
            h4 {{ color: #60a5fa; }}
            ul, ol {{ padding-left: 20px; }}
            li {{ margin: 5px 0; }}
            strong {{ color: #1f2937; }}
            code {{ background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }}
            hr {{ border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }}
            .highlight {{ background: #fef3c7; padding: 10px; border-radius: 6px; margin: 10px 0; }}
        </style>
    </head>
    <body>
    <pre style="white-space: pre-wrap; font-family: inherit;">{content}</pre>
    </body>
    </html>
    """
    
    # 添加HTML内容
    html_part = MIMEText(html_content, "html", "utf-8")
    msg.attach(html_part)
    
    # 也添加纯文本版本
    text_part = MIMEText(content, "plain", "utf-8")
    msg.attach(text_part)
    
    try:
        # 创建SSL上下文
        context = ssl.create_default_context()
        
        # 连接并发送
        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, context=context) as server:
            server.login(FROM_ADDR, PASSWORD)
            server.sendmail(FROM_ADDR, TO_ADDRS, msg.as_string())
        
        print(f"✅ 邮件发送成功！")
        print(f"   收件人: {', '.join(TO_ADDRS)}")
        print(f"   主题: {msg['Subject']}")
        return True
        
    except Exception as e:
        print(f"❌ 邮件发送失败: {e}")
        return False

def main():
    """主函数"""
    print("=" * 50)
    print("📰 AI每日简报邮件发送")
    print("=" * 50)
    print(f"📅 日期: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # 读取简报
    print("📖 读取今日简报...")
    content = read_newsletter()
    
    if content:
        print(f"✅ 简报内容长度: {len(content)} 字符")
        print()
        
        # 发送邮件
        print("📧 发送邮件...")
        send_email(content)
    else:
        print("❌ 无法发送：简报内容为空")

if __name__ == "__main__":
    main()