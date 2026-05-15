import DOMPurify from 'dompurify'

const ALLOWED_TAGS = [
  'a',
  'abbr',
  'b',
  'blockquote',
  'br',
  'code',
  'del',
  'details',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'li',
  'ol',
  'p',
  'pre',
  's',
  'span',
  'strong',
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'ul',
]

const ALLOWED_ATTR = [
  'alt',
  'class',
  'colspan',
  'href',
  'rel',
  'rowspan',
  'src',
  'target',
  'title',
]

function enforceSafeHtmlAttributes(html: string): string {
  if (typeof document === 'undefined') return html

  const template = document.createElement('template')
  template.innerHTML = html

  template.content.querySelectorAll('a[href]').forEach((link) => {
    link.setAttribute('target', '_blank')
    link.setAttribute('rel', 'noopener noreferrer')
  })

  template.content.querySelectorAll('img[src]').forEach((image) => {
    const src = image.getAttribute('src') || ''
    if (/^data:/i.test(src) && !/^data:image\/(?:png|gif|jpe?g|webp);base64,/i.test(src)) {
      image.removeAttribute('src')
    }
  })

  return template.innerHTML
}

export function sanitizeHtml(html: string): string {
  const cleanHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|data:image\/(?:png|gif|jpe?g|webp);base64,|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
  })
  return enforceSafeHtmlAttributes(cleanHtml)
}

export function escapeHtml(content: string): string {
  return String(content ?? '').replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return entities[char] || char
  })
}
