import MarkdownIt from 'markdown-it'
import { sanitizeHtml } from './sanitize'

type MarkdownProfile = 'default' | 'chat' | 'analysis'

interface RenderMarkdownOptions {
  profile?: MarkdownProfile
  preprocess?: (content: string) => string
}

const markdownRenderers: Record<MarkdownProfile, MarkdownIt> = {
  default: new MarkdownIt({
    html: false,
    linkify: true,
    typographer: true,
    breaks: false,
  }),
  chat: new MarkdownIt({
    html: false,
    linkify: true,
    typographer: true,
    breaks: true,
  }),
  analysis: new MarkdownIt({
    html: false,
    linkify: true,
    typographer: true,
    breaks: false,
  }),
}

export function renderMarkdown(content = '', options: RenderMarkdownOptions = {}): string {
  const profile = options.profile || 'default'
  const source = options.preprocess ? options.preprocess(content || '') : content || ''
  return sanitizeHtml(markdownRenderers[profile].render(source))
}
