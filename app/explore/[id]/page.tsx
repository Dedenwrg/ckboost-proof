import Link from 'next/link';
import { notFound } from 'next/navigation';
import { readSharedArticle } from '../../../lib/shared-catalog-server';

export const dynamic = 'force-dynamic';

export default async function SharedArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await readSharedArticle(id);
  if (!article) notFound();

  return <article className="studio studio-editor">
    <Link className="article-back" href="/explore">All articles</Link>
    <div className="studio-intro">
      <p className="eyebrow">{article.category}</p>
      <h1>{article.title}</h1>
      <p>By {article.author}</p>
    </div>
    <section className="studio-panel">
      <h2>Free preview</h2>
      <p className="prose">{article.preview}</p>
    </section>
    <p><strong>Listed price: {article.price} CKB.</strong> This listing offers a public preview. Checkout from another browser is not available yet.</p>
  </article>;
}
