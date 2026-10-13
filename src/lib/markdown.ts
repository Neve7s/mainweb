import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

// Markdown de la DB → HTML saneado (sin XSS aunque el contenido sea hostil).
export function renderMarkdown(md: string): string {
  const raw = marked.parse(md, { async: false, breaks: true }) as unknown as string;
  return sanitizeHtml(raw, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img'],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'loading'],
      code: ['class'],
      pre: ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: (tag, attribs) => ({
        tagName: 'a',
        attribs: { ...attribs, target: '_blank', rel: 'noopener' },
      }),
    },
  });
}

export function readingMinutes(md: string): number {
  const words = md.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
