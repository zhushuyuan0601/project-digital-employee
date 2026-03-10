#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header
from datetime import datetime
import os

# 读取简报内容
report_path = "/Users/lihzz/.openclaw/workspace-ceo/daily-intel-2026-03-04.md"
with open(report_path, 'r', encoding='utf-8') as f:
    report_content = f.read()

# 邮件配置
smtp_server = "smtp.qq.com"
smtp_port = 465
sender_email = "793323821@qq.com"
receiver_email = "793323821@qq.com"
auth_code = "kcvbkblgkgfcbcci"

# 创建邮件
msg = MIMEMultipart('alternative')
msg['From'] = sender_email
msg['To'] = receiver_email
msg['Subject'] = f"[AI 情报简报] 2026年3月4日"

# 添加邮件正文
html_content = f"""
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: 'Microsoft YaHei', Arial, sans-serif; line-height: 1.6; color: #333; }}
        h1 {{ color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }}
        h2 {{ color: #34495e; border-left: 4px solid #3498db; padding-left: 10px; margin-top: 30px; }}
        h3 {{ color: #7f8c8d; margin-top: 20px; }}
        .hot {{ color: #e74c3c; font-weight: bold; }}
        .stars {{ color: #f39c12; }}
        .source {{ color: #95a5a6; font-size: 0.9em; }}
        hr {{ border: none; border-top: 1px solid #ecf0f1; margin: 20px 0; }}
        .highlight {{ background-color: #f8f9fa; padding: 10px; border-radius: 5px; }}
    </style>
</head>
<body>
    <div class="highlight">
        <p><strong>📊 本简报由 Zoe（总助理）自动生成</strong></p>
        <p><strong>🕐 生成时间</strong>: {datetime.now().strftime('%Y年%m月%d日 %H:%M')}</p>
    </div>
    <hr>
    <h1>🔥 今日热点 Top 10</h1>
    <h3 class="hot">1. ★★★★★ 英伟达投资40亿美元押注共封装光学技术</h3>
    <p class="source">时间: 3月3日 | 来源: 量子位智库</p>
    <p>英伟达继续加大在光通信等前沿技术领域的投资，共封装光学技术有望大幅提升AI芯片之间的数据传输速度，为大规模AI集群建设提供关键技术支持。</p>
    <hr>
    <h3 class="hot">2. ★★★★★ 中国成为发布大模型最多的国家</h3>
    <p class="source">时间: 今日 | 来源: 百度热搜榜</p>
    <p>备受关注的热搜话题，体现了中国在AI大模型研发领域的快速发展和领先地位，反映了国内AI产业的蓬勃发展态势。</p>
    <hr>
    <h3 class="hot">3. ★★★★☆ Meta多元化算力供应链战略</h3>
    <p class="source">时间: 2026第9周 | 来源: 量子位智库周报</p>
    <p>Meta延续顶尖科技公司多元化算力供应链策略，与AMD、谷歌签署大额采购及租赁协议，降低对单一供应商的依赖，确保AI算力供应稳定。</p>
    <hr>
    <h3 class="hot">4. ★★★★☆ Meta与谷歌签署数十亿美元AI芯片租赁协议</h3>
    <p class="source">时间: 2月27日 | 来源: 量子位智库内参</p>
    <p>Meta与谷歌达成历史性合作，签署数十亿美元AI芯片租赁协议，这一合作将大幅降低AI算力成本，推动AI技术普及。</p>
    <hr>
    <h3>5. ★★★★☆ 英伟达公布2026财年Q4财报</h3>
    <p class="source">时间: 2月26日 | 来源: 量子位智库内参</p>
    <p>英伟达最新财报备受关注，作为AI芯片领域的绝对领导者，其业绩表现反映了AI产业的整体发展状况和市场需求。</p>
    <hr>
    <h3>6. ★★★☆☆ 谷歌前TPU团队芯片创企MatX获5亿美元融资</h3>
    <p class="source">时间: 2月25日 | 来源: 量子位智库内参</p>
    <p>由谷歌前TPU团队创立的芯片创企MatX获得5亿美元融资，展现了AI专用芯片领域的投资热度，也预示着更多技术实力派团队加入竞争。</p>
    <hr>
    <h3>7. ★★★☆☆ Claude Code更新引发IT、网安等传统行业关注</h3>
    <p class="source">时间: 2月24日 | 来源: 量子位智库内参</p>
    <p>Claude Code的最新更新在IT、网安等传统行业引发关注，体现了生成式AI正在渗透到传统行业的核心业务流程中。</p>
    <hr>
    <h3>8. ★★☆☆☆ 记忆平台是AI的"第二大脑"</h3>
    <p class="source">时间: 近期 | 来源: 量子位</p>
    <p>离哲提出记忆平台是AI的"第二大脑"这一观点，探讨了如何通过记忆平台增强AI的记忆能力和上下文理解能力，为Agent应用提供新思路。</p>
    <hr>
    <h3>9. ★★☆☆☆ AI与边缘计算的结合</h3>
    <p class="source">时间: 近期 | 来源: 互联网搜索</p>
    <p>随着物联网设备的普及，边缘计算与AI的结合成为重要趋势，数据在设备本地进行处理可以大幅降低延迟、节省带宽、保护隐私。</p>
    <hr>
    <h3>10. ★★☆☆☆ AI-First应用加速推出</h3>
    <p class="source">时间: 近期 | 来源: 互联网搜索</p>
    <p>2025年将有一系列由生成式AI驱动的AI-First应用被推出，这些应用离开大模型就无法独立存在，代表了AI应用的新范式。</p>
    <hr>
    <h2>📊 热点分析</h2>
    <h3>技术热点</h3>
    <ul>
        <li><strong>共封装光学技术</strong>: 可能成为下一个重要突破口</li>
        <li><strong>AI专用芯片</strong>: 开源市场巨大，竞争激烈</li>
        <li><strong>Agent记忆系统</strong>: 对提升AI长期交互能力至关重要</li>
    </ul>
    <h3>行业动态</h3>
    <ul>
        <li><strong>算力供应链多元化</strong>: 大厂不再依赖单一供应商</li>
        <li><strong>AI芯片租赁模式</strong>: 可能降低企业使用AI的门槛</li>
        <li><strong>AI向传统行业渗透</strong>: IT、网安等传统行业开始变革</li>
    </ul>
    <h3>市场趋势</h3>
    <ul>
        <li><strong>中国市场领先</strong>: 大模型发布数量全球第一</li>
        <li><strong>AI-First应用</strong>: 新的应用范式正在形成</li>
        <li><strong>边缘AI</strong>: 边缘计算与AI结合成为趋势</li>
    </ul>
    <hr>
    <h2>💡 产品机会分析</h2>
    <h3>高优先级</h3>
    <ol>
        <li><strong>AI Agent记忆平台</strong> - "第二大脑"概念的前沿应用</li>
        <li><strong>AI算力优化工具</strong> - 针对企业降低算力成本的需求</li>
        <li><strong>传统行业AI解决方案</strong> - 针对IT、网安等领域的AI化改造</li>
    </ol>
    <h3>中优先级</h3>
    <ol>
        <li><strong>边缘AI开发框架</strong> - 针对物联网设备的边缘计算场景</li>
        <li><strong>AI-First应用孵化</strong> - 寻找适合AI-First范式的应用场景</li>
    </ol>
    <hr>
    <div class="highlight">
        <p><strong>📧 如需详细内容，请回复本邮件</strong></p>
        <p><strong>🤖 Zoe（总助理） - AI 产品公司的项目总师</strong></p>
    </div>
</body>
</html>
"""

html_part = MIMEText(html_content, 'html', 'utf-8')
msg.attach(html_part)

# 发送邮件
try:
    server = smtplib.SMTP_SSL(smtp_server, smtp_port)
    server.login(sender_email, auth_code)
    server.sendmail(sender_email, [receiver_email], msg.as_string())
    server.quit()
    print(f"✅ 邮件发送成功！收件人: {receiver_email}")
except Exception as e:
    print(f"❌ 邮件发送失败: {str(e)}")