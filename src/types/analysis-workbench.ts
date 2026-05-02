import type { WorkspaceFile } from '@/api/analysis'

export type MessageRole = 'user' | 'assistant'

export interface UIMessage {
  id: string
  role: MessageRole
  content: string
  createdAt: number
  context?: MessageContextSnapshot | null
}

export interface ParsedSection {
  type: string
  content: string
}

export interface MessageContextSnapshot {
  fileName?: string
  filePath?: string
  sheetName?: string
  tableName?: string
  category?: WorkspaceFile['category']
  rowCount?: number
  columnCount?: number
  fieldNames?: string[]
}

export type AnalysisDisplayStepType = 'analysis' | 'understand' | 'code' | 'execute' | 'ask' | 'answer' | 'file' | 'note'

export interface AnalysisDisplayStep {
  id: string
  type: AnalysisDisplayStepType
  title: string
  summary: string
  content: string
  rawType: string
  collapsed: boolean
  tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger'
}

export interface FileArtifact {
  label: string
  url: string
  isImage: boolean
  kind: 'chart' | 'table' | 'report' | 'file'
}

export interface SuggestedPrompt {
  title: string
  description: string
  prompt: string
  icon: any
}

export interface AssetGroup {
  key: string
  label: string
  files: WorkspaceFile[]
}
