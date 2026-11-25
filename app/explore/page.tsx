'use client';

import Link from 'next/link';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { ArticleCard } from '../../components/articles/ArticleCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { CardSkeleton } from '../../components/ui/Skeleton';
import { useArticles } from '../../providers/ArticleProvider';
import type { SharedArticle } from '../../lib/shared-article';

export default function ExplorePage() {
  const { articles: catalog, expiredArticleIds, receipts, unlocked, catalogLoaded } = useArticles();
  const [shared, setShared] = useState<SharedArticle[] | null>(null);
  const [sharedError, setSharedError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    async function loadShared() {
      try {
        const response = await fetch('/api/articles', { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('Catalog unavailable');
        const { articles } = await response.json() as { articles: SharedArticle[] };
        setShared(articles);
      } catch {
        if (!controller.signal.aborted) { setSharedError(true); setShared([]); }
      }
    }
    void loadShared();
    return () => controller.abort();
  }, []);
  const articles = useMemo(() => {
    const local = catalog.filter((article) => !article.supersededBy && !expiredArticleIds.has(article.id));
    const localIds = new Set(local.map((article) => article.id));
    return [...local, ...(shared ?? []).filter((article) => !localIds.has(article.id))];
  }, [catalog, expiredArticleIds, shared]);
  const loaded = catalogLoaded && shared !== null;
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const categories = useMemo(() => ['All', ...Array.from(new Set(articles.map((article) => article.category))).sort()], [articles]);
  const activeCategory = categories.includes(category) ? category : 'All';
  const filtered = useMemo(() => articles
    .filter((article) => activeCategory === 'All' || article.category === activeCategory)
    .filter((article) => `${article.title} ${article.author} ${article.category}`.toLowerCase().includes(deferredSearch))
    .sort((left, right) => ('created' in right ? right.created : right.publishedAt)
      - ('created' in left ? left.created : left.publishedAt)), [articles, activeCategory, deferredSearch]);
  const hasFilters = Boolean(search.trim()) || activeCategory !== 'All';
  const clearFilters = () => { setSearch(''); setCategory('All'); };

  return <div className="explore-page">
    <section className="discover-section" id="discover">
      <div className="discover-heading">
        <div><h1>Explore articles</h1><p>Find a story and read the free preview.</p></div>
        <p className="article-count" aria-live="polite"><strong>{filtered.length}</strong><span>{filtered.length === 1 ? 'article' : 'articles'}</span></p>
      </div>

      <div className="discover-controls">
        <div className="search-field" role="search">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
          <label className="sr-only" htmlFor="article-search">Search articles</label>
          <input id="article-search" type="search" placeholder="Search title, writer, or topic" value={search} onChange={(event) => setSearch(event.target.value)} />
          {search && <button className="search-clear" type="button" onClick={() => setSearch('')} aria-label="Clear article search">Clear</button>}
        </div>
        <div className="category-filters" aria-label="Filter articles by category">
          {categories.map((item) => <button type="button" key={item} aria-pressed={activeCategory === item} onClick={() => setCategory(item)}>{item}</button>)}
        </div>
      </div>

      {sharedError && <p role="status">The shared catalog is unavailable. Local articles are still shown.</p>}
      {hasFilters && loaded && <div className="filter-summary"><span>Showing {filtered.length} of {articles.length}</span><button type="button" className="text-button" onClick={clearFilters}>Clear filters</button></div>}

      {!loaded && !articles.length && <div className="article-grid" aria-label="Loading articles"><CardSkeleton /><CardSkeleton /></div>}
      {loaded && !articles.length && <EmptyState title="No articles to show." description="Published articles and shared previews will appear here." action={<Link className="button-link" href="/seller">Open Seller Studio</Link>} />}
      {loaded && articles.length > 0 && !filtered.length && <div className="search-empty">
        <div className="search-empty-mark" aria-hidden="true" /><div><p className="eyebrow">NO MATCHES</p><h3>Try a broader search.</h3><p>Change the keyword or choose a different category.</p><button type="button" onClick={clearFilters}>Clear filters</button></div>
      </div>}
      {filtered.length > 0 && <div className="article-grid">{filtered.map((article, index) => 'created' in article
        ? <ArticleCard article={article} index={index} unlocked={Boolean(unlocked[article.id])} paymentStatus={receipts[article.id]?.status} key={article.id} />
        : <article className="studio-panel" key={article.id}>
          <p className="eyebrow">{article.category} · Shared preview</p>
          <h3><Link href={`/explore/${article.id}`}>{article.title}</Link></h3>
          <p className="article-excerpt">{article.preview}</p>
          <p className="muted">By {article.author} · Listed at {article.price} CKB</p>
          <Link href={`/explore/${article.id}`}>Read preview</Link>
        </article>)}</div>}
    </section>
  </div>;
}
