import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { link, mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { isSharedArticleId, parseSharedArticle, type SharedArticle, type SharedArticleInput } from './shared-article.ts';

const directory = () => resolve(process.env.CATALOG_DATA_DIR || join(process.cwd(), '.catalog-data'));
const digest = (value: string) => createHash('sha256').update(value).digest();
const hasCode = (error: unknown, code: string) =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === code;

export function catalogWriteAccess(authorization: string | null) {
  const token = process.env.CATALOG_PUBLISH_TOKEN;
  if (!token || token.length < 32) return 'disabled';
  return authorization?.startsWith('Bearer ') && timingSafeEqual(digest(token), digest(authorization.slice(7)))
    ? 'allowed' : 'denied';
}

export async function readSharedArticle(id: string): Promise<SharedArticle | null> {
  if (!isSharedArticleId(id)) return null;
  try {
    const stored = JSON.parse(await readFile(join(directory(), `${id}.json`), 'utf8'));
    const article = parseSharedArticle(stored);
    return article?.id === id && Number.isSafeInteger(stored.publishedAt)
      ? { ...article, publishedAt: stored.publishedAt } : null;
  } catch (error) {
    if (hasCode(error, 'ENOENT')) return null;
    throw error;
  }
}

export async function listSharedArticles() {
  const files = await readdir(directory()).catch((error) => {
    if (hasCode(error, 'ENOENT')) return [];
    throw error;
  });
  const articles = await Promise.all(files.filter((name) => name.endsWith('.json')).map((name) => readSharedArticle(name.slice(0, -5))));
  return articles.filter((article): article is SharedArticle => article !== null).sort((a, b) => b.publishedAt - a.publishedAt);
}

export async function shareArticle(article: SharedArticleInput) {
  const folder = directory();
  await mkdir(folder, { recursive: true, mode: 0o700 });
  const stored = { ...article, publishedAt: Date.now() };
  const temporary = join(folder, `.${randomUUID()}.tmp`);
  await writeFile(temporary, JSON.stringify(stored), { flag: 'wx', mode: 0o600 });
  try {
    await link(temporary, join(folder, `${article.id}.json`));
    return { article: stored, created: true };
  } catch (error) {
    if (!hasCode(error, 'EEXIST')) throw error;
    const existing = await readSharedArticle(article.id);
    if (existing && Object.entries(article).every(([key, value]) => existing[key as keyof SharedArticleInput] === value)) {
      return { article: existing, created: false };
    }
    return null;
  } finally {
    await unlink(temporary).catch(() => {});
  }
}
