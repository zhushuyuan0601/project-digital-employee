/**
 * 技能安全扫描
 * 检测 12+ 类安全威胁
 */

// 安全规则定义
const SECURITY_RULES = [
  {
    rule: 'prompt-injection-system',
    pattern: /\b(?:ignore\s+(?:all\s+)?previous\s+instructions?|forget\s+(?:all\s+)?(?:your\s+)?instructions?|you\s+are\s+now\s+(?:a|an)\s+(?:evil|unrestricted))/i,
    severity: 'critical',
    description: '潜在的提示注入：尝试覆盖系统指令'
  },
  {
    rule: 'prompt-injection-role',
    pattern: /\b(?:act\s+as\s+(?:a\s+)?(?:root|admin|superuser)|you\s+(?:must|should)\s+(?:always\s+)?execute|bypass\s+(?:all\s+)?safety|disable\s+(?:all\s+)?(?:safety|security|filters?))/i,
    severity: 'critical',
    description: '潜在的提示注入：角色操纵或安全绕过'
  },
  {
    rule: 'shell-exec-dangerous',
    pattern: /(?:`{3,}\s*(?:bash|sh|zsh|shell)\s*\n[\s\S]*?(?:rm\s+-rf|curl\s+.*\|\s*(?:bash|sh)|wget\s+.*\|\s*(?:bash|sh)|eval\s*\(|exec\s*\())/i,
    severity: 'critical',
    description: '可执行 shell 代码包含危险命令（rm -rf, curl|bash 等）'
  },
  {
    rule: 'data-exfiltration',
    pattern: /\b(?:send\s+(?:all\s+)?(?:data|files?|contents?|secrets?|keys?|tokens?)\s+to|exfiltrate|upload\s+(?:all\s+)?(?:data|files?))/i,
    severity: 'critical',
    description: '潜在数据外传指令'
  },
  {
    rule: 'credential-harvesting',
    pattern: /\b(?:(?:api[_-]?key|secret|password|token|credential)\s*[:=]\s*['"`]?\w{8,})/i,
    severity: 'warning',
    description: '技能内容中可能包含硬编码的凭证或密钥'
  },
  {
    rule: 'obfuscated-content',
    pattern: /(?:(?:atob|btoa|Buffer\.from)\s*\(|\\x[0-9a-f]{2}(?:\\x[0-9a-f]{2}){5,}|\\u[0-9a-f]{4}(?:\\u[0-9a-f]{4}){5,})/i,
    severity: 'warning',
    description: '可能包含混淆或编码内容以隐藏恶意指令'
  },
  {
    rule: 'hidden-instructions',
    pattern: /<!--[\s\S]*?(?:ignore|override|bypass|inject|execute)[\s\S]*?-->/i,
    severity: 'warning',
    description: 'HTML 注释包含可疑指令（对用户不可见）'
  },
  {
    rule: 'excessive-permissions',
    pattern: /\b(?:sudo|chmod\s+777|chmod\s+\+x\s+\/|chown\s+root)\b/i,
    severity: 'warning',
    description: '引用提升权限或危险的文件权限更改'
  },
  {
    rule: 'network-fetch',
    pattern: /\b(?:fetch|curl|wget|axios|http\.get|request\.get)\s*\(\s*['"`]https?:\/\//i,
    severity: 'info',
    description: '技能引用外部网络 URL — 请验证是否为可信来源'
  },
  {
    rule: 'path-traversal',
    pattern: /(?:\.\.\/){2,}|(?:\.\.\\){2,}|(?:%2e%2e%2f){2,}/i,
    severity: 'critical',
    description: '潜在路径遍历攻击：尝试访问上级目录'
  },
  {
    rule: 'ssrf-internal-network',
    pattern: /\b(?:fetch|curl|wget|axios(?:\.[a-z]+)?|http(?:s?)\.\w+|request(?:\.\w+)?)\s*\(\s*['"`]https?:\/\/(?:localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+|[^'"` ]*\.internal(?:\/|['"`]))/i,
    severity: 'critical',
    description: '潜在 SSRF：技能尝试连接本地主机或内部网络地址'
  },
  {
    rule: 'ssrf-metadata-endpoint',
    pattern: /(?:169\.254\.169\.254|metadata\.google\.internal|fd00:ec2::254|instance-data)/i,
    severity: 'critical',
    description: '潜在 SSRF 攻击云元数据端点（AWS/GCP/Azure）'
  }
]

/**
 * 扫描技能内容中的安全问题
 * @param {string} content - SKILL.md 内容
 * @returns {{ status: string, issues: Array }} 安全报告
 */
export function checkSkillSecurity(content) {
  const issues = []
  const lines = content.split('\n')

  for (const rule of SECURITY_RULES) {
    // 重置正则 lastIndex
    rule.pattern.lastIndex = 0
    const match = rule.pattern.exec(content)
    if (match) {
      let lineNum = undefined
      const snippet = match[0].slice(0, 40)
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(snippet)) {
          lineNum = i + 1
          break
        }
      }
      issues.push({
        severity: rule.severity,
        rule: rule.rule,
        description: rule.description,
        line: lineNum
      })
    }
  }

  const hasCritical = issues.some(i => i.severity === 'critical')
  const hasWarning = issues.some(i => i.severity === 'warning')

  return {
    status: hasCritical ? 'rejected' : hasWarning ? 'warning' : 'clean',
    issues
  }
}

/**
 * 格式化安全报告为前端格式
 * @param {{ status: string, issues: Array }} report
 * @returns {{ status: string, level: string, issues: Array }}
 */
export function formatSecurityReport(report) {
  const levelMap = {
    clean: 'safe',
    warning: 'warning',
    rejected: 'danger'
  }

  return {
    status: levelMap[report.status] || 'unknown',
    level: report.status,
    issues: report.issues.map(issue => ({
      severity: issue.severity,
      rule: issue.rule,
      description: issue.description,
      line: issue.line
    }))
  }
}
