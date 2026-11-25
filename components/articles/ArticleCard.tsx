import Link from "next/link";
import {
  articlePriceShannons,
  isArticleOfferExpired,
  type Article,
} from "../../lib/articles";
import { formatArticlePrice } from "../../lib/payment-config";

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function ArticleCard({
  article,
  index,
  unlocked,
  paymentStatus,
}: {
  article: Article;
  index: number;
  unlocked: boolean;
  paymentStatus?: string;
}) {
  const unavailable =
    Boolean(article.supersededBy) || isArticleOfferExpired(article);
  const failed = Boolean(article.attempt) && paymentStatus === "Failed";
  const pending = Boolean(article.attempt) && !unlocked && !failed;
  const stateLabel = unlocked
    ? "In library"
    : pending
      ? "Access pending"
      : unavailable
        ? "Offer closed"
        : failed
          ? "Retry available"
          : `${formatArticlePrice(articlePriceShannons(article))} CKB`;
  const actionLabel = unlocked
    ? "Read again"
    : failed
      ? "Review payment"
      : pending
        ? "Check access"
        : "Read preview";
  const authorInitial = article.author.trim().charAt(0).toUpperCase() || "U";

  return (
    <article className="article-card">
      <div
        className={`article-cover article-cover-${index % 4}`}
        aria-hidden="true"
      >
        <span />
        <span />
        <span />
      </div>
      <div className="article-card-body">
        <div className="article-card-topline">
          <span className="category-pill">{article.category}</span>
          <span
            className="article-state"
            data-state={
              unlocked
                ? "unlocked"
                : failed
                  ? "failed"
                  : pending
                    ? "pending"
                    : "available"
            }
          >
            {stateLabel}
          </span>
        </div>
        <h3>
          <Link href={`/article/${article.id}`}>{article.title}</Link>
        </h3>
        <p className="article-excerpt">{article.preview}</p>
        <div className="article-card-footer">
          <div className="article-author">
            <span aria-hidden="true">{authorInitial}</span>
            <div>
              <strong>{article.author}</strong>
              <small>
                {article.created
                  ? dateFormatter.format(article.created)
                  : "Demo guide"}
              </small>
            </div>
          </div>
          <Link className="article-action" href={`/article/${article.id}`}>
            {actionLabel}
          </Link>
        </div>
      </div>
    </article>
  );
}
