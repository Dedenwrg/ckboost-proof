"use client";

import Link from "next/link";
import { ArticleCard } from "../../components/articles/ArticleCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { CardSkeleton } from "../../components/ui/Skeleton";
import { useArticles } from "../../providers/ArticleProvider";

export default function LibraryPage() {
  const { articles, receipts, unlocked, catalogLoaded } = useArticles();
  const purchased = articles
    .filter((article) => article.attempt || unlocked[article.id])
    .sort((left, right) => right.created - left.created);
  const readyCount = purchased.filter((article) => unlocked[article.id]).length;

  return (
    <section className="library-page">
      <header className="library-heading">
        <div>
          <p className="eyebrow">MY LIBRARY</p>
          <h1>Your stories, ready when you are.</h1>
          <p>
            Read unlocked articles again or safely recover a purchase already in
            progress.
          </p>
        </div>
        <div
          className="library-count"
          aria-label={`${readyCount} unlocked of ${purchased.length} saved articles`}
        >
          <strong>{readyCount}</strong>
          <span>ready to read</span>
          <small>{purchased.length} saved</small>
        </div>
      </header>

      {!catalogLoaded && (
        <div className="article-grid" aria-label="Loading library">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}
      {catalogLoaded && !purchased.length && (
        <EmptyState
          title="Your library is waiting."
          description="Stories appear here as soon as you start a purchase. Completed access can also be restored safely after a reload."
          action={
            <Link className="button-link" href="/explore">
              Explore articles
            </Link>
          }
        />
      )}
      {catalogLoaded && purchased.length > 0 && (
        <>
          <div className="library-toolbar">
            <h2>Saved articles</h2>
            <Link href="/explore">Find another story</Link>
          </div>
          <div className="article-grid">
            {purchased.map((article, index) => (
              <ArticleCard
                article={article}
                index={index}
                unlocked={Boolean(unlocked[article.id])}
                paymentStatus={receipts[article.id]?.status}
                key={article.id}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
