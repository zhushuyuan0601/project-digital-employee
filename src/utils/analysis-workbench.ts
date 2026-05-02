import type {
  AnalysisDisplayStep,
  AnalysisDisplayStepType,
  FileArtifact,
  ParsedSection,
} from '@/types/analysis-workbench'

export function parseSections(content: string): ParsedSection[] {
  const pattern = /<(Analyze|Understand|Code|Execute|Ask|Answer|File)>([\s\S]*?)<\/\1>/g
  const sections: ParsedSection[] = []
  let match: RegExpExecArray | null
  while ((match = pattern.exec(content)) !== null) {
    sections.push({ type: match[1], content: (match[2] || '').trim() })
  }
  return sections
}

export function toStepType(type: string): AnalysisDisplayStepType {
  const map: Record<string, AnalysisDisplayStepType> = {
    Analyze: 'analysis',
    Understand: 'understand',
    Code: 'code',
    Execute: 'execute',
    Ask: 'ask',
    Answer: 'answer',
    File: 'file',
  }
  return map[type] || 'note'
}

export function summarizePlainText(content: string, fallback = '已生成一段分析记录') {
  const plain = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[[^\]]+]\([^)]+\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!plain) return fallback
  return plain.length > 68 ? `${plain.slice(0, 68)}...` : plain
}

export function summarizeExecution(content: string) {
  const plain = content.replace(/```/g, '').trim()
  if (!plain) return '执行完成，没有返回额外日志'
  const lowered = plain.toLowerCase()
  if (lowered.includes('traceback') || lowered.includes('error') || lowered.includes('exception')) {
    return '执行遇到异常，已保留完整日志'
  }
  if (plain.includes('⏳')) return '代码正在执行，等待结果返回'
  return summarizePlainText(plain, '代码执行完成')
}

export function getStepTone(type: AnalysisDisplayStepType, content: string): AnalysisDisplayStep['tone'] {
  if (type === 'answer' || type === 'file') return 'success'
  if (type === 'ask') return 'warning'
  if (type === 'execute') {
    const lowered = content.toLowerCase()
    return lowered.includes('traceback') || lowered.includes('error') || lowered.includes('exception') ? 'danger' : 'info'
  }
  if (type === 'code') return 'neutral'
  return 'info'
}

export function getStepDisplayContent(step: AnalysisDisplayStep) {
  if (step.type !== 'code' && step.type !== 'execute') return step.content
  const fenced = step.content.match(/^```(?:\w+)?\s*\n([\s\S]*?)\n```$/)
  return fenced ? fenced[1].trim() : step.content
}

export function normalizeArtifactUrl(url: string) {
  if (url.startsWith('/workspace/')) return `/api/analysis${url}`
  return url
}

export function getArtifactKind(label: string): FileArtifact['kind'] {
  const lower = label.toLowerCase()
  if (/\.(png|jpg|jpeg|webp|gif|svg)$/.test(lower)) return 'chart'
  if (/\.(csv|tsv|xlsx|xls|parquet)$/.test(lower)) return 'table'
  if (/\.(md|pdf|docx|pptx)$/.test(lower)) return 'report'
  return 'file'
}

export function parseFileArtifacts(content: string): FileArtifact[] {
  const artifacts: FileArtifact[] = []
  const imagePattern = /!\[([^\]]*)]\(([^)]+)\)/g
  const linkPattern = /(?:^|\n)\s*-?\s*\[([^\]]+)]\(([^)]+)\)/g
  let match: RegExpExecArray | null

  while ((match = imagePattern.exec(content)) !== null) {
    const label = match[1] || '图表产物'
    artifacts.push({
      label,
      url: normalizeArtifactUrl(match[2]),
      isImage: true,
      kind: getArtifactKind(label),
    })
  }

  while ((match = linkPattern.exec(content)) !== null) {
    const label = match[1] || '文件产物'
    const url = normalizeArtifactUrl(match[2])
    if (artifacts.some((artifact) => artifact.url === url)) continue
    artifacts.push({
      label,
      url,
      isImage: /\.(png|jpg|jpeg|webp|gif|svg)(\?|$)/i.test(url),
      kind: getArtifactKind(label),
    })
  }

  return artifacts
}

export function getChartArtifacts(content: string) {
  return parseFileArtifacts(content).filter((artifact) => artifact.isImage)
}

export function getAttachmentArtifacts(content: string) {
  return parseFileArtifacts(content).filter((artifact) => !artifact.isImage)
}
