import { encryptedBuyerProfile, encryptedSellerProfile, savedNodeIdentifier } from './progress';
import { ARTICLE_PRICE_SHANNONS } from './payment-config';

export type Article = {
  id: string;
  title: string;
  author: string;
  category: string;
  preview: string;
  raw: string;
  created: number;
  attempt: string;
  source?: string;
  markdown?: boolean;
  demoRevision?: string;
  expiresAt?: number;
  priceShannons?: string;
  supersededBy?: string;
};

export function articlePriceShannons(article: Pick<Article, 'priceShannons'>) {
  return article.priceShannons === undefined ? ARTICLE_PRICE_SHANNONS : BigInt(article.priceShannons);
}

export const articleOfferLifetime = 3_600_000;

export function articleOfferExpiresAt(article: Pick<Article, 'created' | 'expiresAt'>) {
  return article.expiresAt !== undefined && Number.isSafeInteger(article.expiresAt)
    ? article.expiresAt : article.created + articleOfferLifetime;
}

export function isArticleOfferExpired(article: Pick<Article, 'created' | 'expiresAt'>, now = Date.now()) {
  return now >= articleOfferExpiresAt(article);
}

type StorageReader = Pick<Storage, 'getItem'>;

export function articleStorageKey(storage: StorageReader) {
  const buyer = savedNodeIdentifier(storage, encryptedBuyerProfile);
  const seller = savedNodeIdentifier(storage, encryptedSellerProfile);
  return buyer && seller ? `unseal:v1:${buyer}:${seller}` : null;
}

export function isArticle(value: unknown): value is Article {
  if (!value || typeof value !== 'object') return false;
  const article = value as Record<string, unknown>;
  return typeof article.id === 'string' && article.id.length > 0
    && typeof article.title === 'string' && article.title.length > 0
    && typeof article.author === 'string' && article.author.length > 0
    && typeof article.category === 'string'
    && typeof article.preview === 'string'
    && typeof article.raw === 'string' && article.raw.length > 0
    && typeof article.created === 'number' && Number.isFinite(article.created)
    && (article.priceShannons === undefined || (typeof article.priceShannons === 'string' && /^[1-9]\d{0,38}$/.test(article.priceShannons)))
    && (article.source === undefined || (typeof article.source === 'string' && /^https?:\/\/\S+$/i.test(article.source)))
    && typeof article.attempt === 'string';
}

export function readArticleCatalog(storage: StorageReader, key: string): Article[] {
  const parsed: unknown = JSON.parse(storage.getItem(key) ?? '[]');
  if (!Array.isArray(parsed)) throw new Error('Saved catalog has an invalid format.');
  return parsed.filter(isArticle);
}
