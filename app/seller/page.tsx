'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { hasDraftChanges } from '../../lib/article-draft';
import { articlePriceShannons, type Article } from '../../lib/articles';
import { formatArticlePrice } from '../../lib/payment-config';
import { useArticles } from '../../providers/ArticleProvider';
import { useUI } from '../../providers/UIProvider';

export default function SellerPage() {
  const { articles, draft, setDraft, unlocked, expiredArticleIds, catalogLoaded } = useArticles();
  const router = useRouter();
  const { confirm } = useUI();
  const published = [...articles].sort((a, b) => b.created - a.created);
  const hasDraft = hasDraftChanges(draft);
  async function republish(article: Article) {
    if (hasDraft && !await confirm({
      heading: 'YOUR DRAFT',
      title: 'Replace your current draft?',
      description: 'The selected article will fill the editor.',
      confirmLabel: 'Replace draft',
    })) return;
    setDraft({
      title: article.title,
      author: article.author,
      category: article.category,
      preview: article.preview,
      content: unlocked[article.id] ?? '',
      price: formatArticlePrice(articlePriceShannons(article)),
      replacesId: article.id,
      source: article.source,
      markdown: article.markdown,
    });
    router.push('/seller/write');
  }
  return <section className="studio">
    <div className="studio-intro"><p className="eyebrow">SELLER STUDIO</p><h1>Your writing</h1><p>Create an article and choose what readers can preview for free.</p></div>
    <div className="studio-options">
      <section className="studio-panel">
        <h2>{hasDraft ? 'Pick up where you left off' : 'Start from scratch'}</h2>
        <p>{hasDraft ? draft.title || 'Untitled draft' : 'Open a blank editor for your own story.'}</p>
        <Link className="button-link" href="/seller/write">{hasDraft ? 'Continue draft' : 'Start writing'}</Link>
      </section>
      <section className="studio-panel">
        <h2>Start with a template</h2><p>Choose a Fiber guide or another writing example to edit.</p>
        <Link className="button-link button-secondary" href="/seller/templates">Browse templates</Link>
      </section>
    </div>
    <h2>Published articles</h2>
    {!catalogLoaded ? <p role="status">Loading published articles…</p> : !published.length ? <p className="muted">Your published articles will appear here.</p> :
      <ul className="studio-list">{published.map((article) => {
        const expired = expiredArticleIds.has(article.id);
        return <li key={article.id}>
          <div><p className="eyebrow">{article.category}{article.supersededBy ? ' · Replaced' : expired ? ' · Expired' : ''}</p>
            <strong>{article.title}</strong><p className="muted">{formatArticlePrice(articlePriceShannons(article))} CKB</p>
          </div>
          <div className="studio-actions">
            <Link href={`/article/${article.id}`}>View article</Link>
            {!article.supersededBy && <button type="button" className="button-secondary" onClick={() => void republish(article)}>{expired ? 'Republish' : 'Change price'}</button>}
          </div>
        </li>;
      })}</ul>}
  </section>;
}
