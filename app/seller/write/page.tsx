'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { blank } from '../../../lib/article-draft';
import { articleOfferExpiresAt, articlePriceShannons, type Article } from '../../../lib/articles';
import { formatArticlePrice, parseArticlePrice } from '../../../lib/payment-config';
import { DemoMarkdown } from '../../../components/articles/DemoMarkdown';
import { ShareArticle } from '../../../components/articles/ShareArticle';
import { usePaymentSetup } from '../../../components/layout/AppShell';
import { useArticles } from '../../../providers/ArticleProvider';
import { useFiber } from '../../../providers/FiberProvider';
import { useUI } from '../../../providers/UIProvider';

const fields = ['title', 'author', 'category', 'preview', 'content'] as const;
const offerDate = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' });

export default function WritePage() {
  const openPaymentSetup = usePaymentSetup();
  const { draft, setDraft, publish, expiredArticleIds } = useArticles();
  const fiber = useFiber();
  const { confirm } = useUI();
  const [reviewing, setReviewing] = useState(false);
  const [publishedOffer, setPublishedOffer] = useState<Pick<Article, 'id' | 'title' | 'author' | 'category' | 'preview' | 'created' | 'expiresAt' | 'priceShannons'> | null>(null);
  const offerHeading = useRef<HTMLHeadingElement>(null);
  const amount = parseArticlePrice(draft.price);
  const articlePrice = amount === null ? draft.price : formatArticlePrice(amount);
  const complete = amount !== null && fields.every((field) => draft[field].trim());
  useEffect(() => {
    if (publishedOffer) offerHeading.current?.focus();
  }, [publishedOffer]);

  async function clearDraft() {
    if (await confirm({
      heading: 'YOUR DRAFT',
      title: 'Clear this draft?',
      description: 'This removes the text currently in your editor.',
      confirmLabel: 'Clear draft',
    })) setDraft({ ...blank });
  }

  if (publishedOffer) {
    const expired = expiredArticleIds.has(publishedOffer.id);
    return <section className="studio studio-editor">
      <Link className="article-back" href="/seller">Back to Seller Studio</Link>
      <div className="studio-intro">
        <p className="eyebrow">SELLER STUDIO</p>
        <h1 ref={offerHeading} tabIndex={-1}>Encrypted offer published</h1>
        <p>The free preview is visible to readers. A confirmed payment unlocks the encrypted story.</p>
      </div>
      <section className="studio-panel" aria-labelledby="published-offer-title">
        <h2 id="published-offer-title">{publishedOffer.title}</h2>
        <dl className="payment-details published-offer-details">
          <dt>Offer status</dt><dd>{expired ? 'Expired' : 'Published'}</dd>
          <dt>Premium content</dt><dd>Encrypted</dd>
          <dt>Payment network</dt><dd>Fiber Testnet</dd>
          <dt>Article price</dt><dd>{formatArticlePrice(articlePriceShannons(publishedOffer))} CKB</dd>
          <dt>Invoice expires</dt><dd>{offerDate.format(articleOfferExpiresAt(publishedOffer))}</dd>
        </dl>
        <Link className="button-link" href={`/article/${publishedOffer.id}`}>View as reader</Link>
        <ShareArticle article={{
          id: publishedOffer.id,
          title: publishedOffer.title,
          author: publishedOffer.author,
          category: publishedOffer.category,
          preview: publishedOffer.preview,
          price: formatArticlePrice(articlePriceShannons(publishedOffer)),
        }} />
      </section>
    </section>;
  }

  return <section className="studio studio-editor">
    <Link className="article-back" href="/seller">Back to Seller Studio</Link>
    <div className="studio-intro"><p className="eyebrow">SELLER STUDIO</p><h1>{reviewing ? 'Review your article' : 'Write an article'}</h1>
    <p>Your draft stays in this tab. Reloading or closing it clears unpublished text.</p></div>
    {reviewing ? <div className="studio-panel">
      <p className="eyebrow">{draft.category}</p>
      <h2>{draft.title}</h2><p>By {draft.author}</p>
      <h3>Free preview</h3><p className="prose">{draft.preview}</p>
      <h3>Paid story</h3>
      {draft.markdown ? <div className="prose"><DemoMarkdown text={draft.content} /></div> : <p className="prose">{draft.content}</p>}
      <p>Readers pay <strong>{articlePrice} CKB</strong>. New purchases are available for one hour after publishing.</p>
      {draft.replacesId && <p>Publishing creates a new offer. Existing purchases remain in My Library.</p>}
      {!fiber.routeReady && <p>Set up payments to publish. Your draft is still here.</p>}
      <div className="studio-actions">
        <button type="button" className="button-secondary" disabled={fiber.busy} onClick={() => setReviewing(false)}>Back to editor</button>
        {!fiber.routeReady && <button type="button" disabled={fiber.busy} onClick={openPaymentSetup}>Set up payments</button>}
        <button type="button" disabled={fiber.busy || !fiber.routeReady || !complete} onClick={() => void fiber.run(async () => {
          const article = await publish();
          const { id, title, author, category, preview, created, expiresAt, priceShannons } = article;
          setPublishedOffer({ id, title, author, category, preview, created, expiresAt, priceShannons });
        })}>{fiber.busy ? 'Publishing…' : 'Publish article'}</button>
      </div>
    </div> : <>
    <div className="studio-actions"><Link className="button-link button-secondary" href="/seller/templates">Choose a template</Link><button type="button" className="link" onClick={() => void clearDraft()}>Clear draft</button></div>
    <form className="studio-panel" onSubmit={(event) => { event.preventDefault(); if (complete) setReviewing(true); }}>
      {draft.replacesId && <p>To publish a replacement offer, enter the premium story if the editor hasn’t recovered it in this session.</p>}
      <label>Price (CKB)
        <input required inputMode="decimal" value={draft.price} aria-invalid={amount === null}
          aria-describedby="article-price-hint" onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))} />
        <small id="article-price-hint">Enter a price above zero with up to 8 decimal places. Use a dot for decimals.</small>
      </label>
      {fields.map((field) => <label key={field}>{({ title: 'Title', author: 'Author', category: 'Category', preview: 'Free preview', content: 'Premium content (encrypted)' })[field]}
        {field === 'preview' || field === 'content'
          ? <textarea required rows={field === 'content' ? 10 : 4} value={draft[field]} onChange={(event) => setDraft((current) => ({ ...current, [field]: event.target.value }))} />
          : <input required value={draft[field]} onChange={(event) => setDraft((current) => ({ ...current, [field]: event.target.value }))} />}
        {field === 'preview' && <small>Visible to everyone before purchase.</small>}
        {field === 'content' && <small>Encrypted when published and opened after payment.</small>}
      </label>)}
      <button disabled={!complete}>Review article</button>
    </form>
    </>}
  </section>;
}
