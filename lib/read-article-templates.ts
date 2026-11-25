import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { blank, type Draft } from './article-draft';

export function readArticleTemplates() {
  const directory = join(process.cwd(), 'content', 'templates');
  return readdirSync(directory).filter((file) => file.endsWith('.md')).sort().map((file) => {
    const markdown = readFileSync(join(directory, file), 'utf8').replace(/\r\n/g, '\n');
    const [intro, body, extra] = markdown.split('<!-- paywall -->');
    const match = /^# (.+)\n\nAuthor: (.+)\nCategory: (.+)\n(?:Source: (https?:\/\/\S+)\n)?\n([\s\S]+)$/.exec(intro.trim());
    if (!match || !body?.trim() || extra !== undefined) throw new Error(`Invalid article template: ${file}`);
    const [, title, author, category, source, preview] = match;
    const draft: Draft = { ...blank, title, author, category, source, preview: preview.trim(), content: body.trim(), markdown: true };
    return { id: file, draft };
  });
}
