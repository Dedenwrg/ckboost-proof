import { parseArticlePrice, formatArticlePrice } from './payment-config.ts';

export type SharedArticleInput = {
  id: string;
  title: string;
  author: string;
  category: string;
  preview: string;
  price: string;
};

export type SharedArticle = SharedArticleInput & { publishedAt: number };

export function isSharedArticleId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value);
}

export function parseSharedArticle(value: unknown): SharedArticleInput | null {
  if (typeof value !== 'object' || value === null) return null;
  const input = value as Record<string, unknown>;
  function field(key: string, max: number) {
    const value = input[key];
    return typeof value === 'string' && value.trim() && value.length <= max ? value.trim() : null;
  }
  const { id } = input;
  const title = field('title', 160);
  const author = field('author', 100);
  const category = field('category', 60);
  const preview = field('preview', 5000);
  const price = field('price', 40);
  const amount = price === null ? null : parseArticlePrice(price);
  if (!isSharedArticleId(id) || !title || !author || !category || !preview || amount === null) return null;
  return { id, title, author, category, preview, price: formatArticlePrice(amount) };
}
