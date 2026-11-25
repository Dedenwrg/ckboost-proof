"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArticleInvoice } from "../../../components/articles/ArticleInvoice";
import { usePaymentSetup } from "../../../components/layout/AppShell";
import { DemoMarkdown } from "../../../components/articles/DemoMarkdown";
import { articlePriceShannons, type Article } from "../../../lib/articles";
import { parseOffer } from "../../../lib/offer";
import { validateOffer } from "../../../lib/payment";
import { articleLiquidityIssue, formatArticlePrice, MAX_ROUTING_FEE_SHANNONS } from "../../../lib/payment-config";
import { encryptedInvoiceExpiresAt } from "../../../lib/payment-submission";
import { useArticles } from "../../../providers/ArticleProvider";
import { useFiber } from "../../../providers/FiberProvider";
import { useUI } from "../../../providers/UIProvider";

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "long",
  day: "numeric",
  year: "numeric",
});
const fee = formatArticlePrice(MAX_ROUTING_FEE_SHANNONS);

export default function ArticlePage() {
  const { id } = useParams<{ id: string }>();
  const { articles, catalogLoaded } = useArticles();
  const article = articles.find((item) => item.id === id);

  if (catalogLoaded && !article)
    return (
      <section className="article-missing">
        <p className="eyebrow">ARTICLE NOT FOUND</p>
        <h1>This story is no longer available.</h1>
        <p>It may have been removed or belongs to a different local profile.</p>
        <Link className="button-link" href="/explore">
          Explore articles
        </Link>
      </section>
    );
  if (!article) return <ArticleLoading />;
  return <ArticleReader key={article.id} article={article} />;
}

function ArticleLoading() {
  return (
    <div className="article-loading" role="status" aria-label="Loading article">
      <span />
      <span />
      <span />
    </div>
  );
}

function ArticleReader({ article }: { article: Article }) {
  const openPaymentSetup = usePaymentSetup();
  const { receipts, unlocked, purchase, expiredArticleIds } = useArticles();
  const fiber = useFiber();
  const ui = useUI();
  const recoveryStarted = useRef(false);
  const checkoutOpen = useRef(false);
  const [preparingInvoice, setPreparingInvoice] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [invoiceExpired, setInvoiceExpired] = useState(false);
  const receipt = receipts[article.id];
  const content = unlocked[article.id];
  const source = article.source ?? (article.id === "demo-fiber" ? "https://www.fiber.world/docs"
    : article.id === "demo-fiber-channels" ? "https://www.fiber.world/docs/how-it-works" : undefined);
  const failed = !submitting && receipt?.status === "Failed";
  const expired = invoiceExpired || expiredArticleIds.has(article.id);
  const replaced = Boolean(article.supersededBy);
  const closed = expired || replaced;
  const amount = articlePriceShannons(article);
  const price = formatArticlePrice(amount);
  const liquidityIssue = fiber.routeReady ? articleLiquidityIssue(
    amount,
    BigInt(fiber.channels.buyer?.local_balance ?? 0),
    BigInt(fiber.channels.seller?.remote_balance ?? 0),
  ) : null;
  const pending = !content && (submitting || (Boolean(article.attempt) && !failed));
  const words = (content || article.preview)
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const readingMinutes = Math.max(1, Math.ceil(words / 220));

  useEffect(() => {
    if (
      !article.attempt ||
      content ||
      receipt ||
      submitting ||
      fiber.busy ||
      !fiber.addresses.buyer ||
      recoveryStarted.current
    )
      return;
    recoveryStarted.current = true;
    void fiber.run(() => purchase(article, true));
  }, [article, content, fiber, purchase, receipt, submitting]);

  const submitPurchase = async () => {
    const buyer = fiber.getNode("buyer");
    if (!buyer || !fiber.routeReady || fiber.busy || checkoutOpen.current || closed || liquidityIssue) return;
    checkoutOpen.current = true;
    setCheckoutError("");
    setPreparingInvoice(true);
    try {
      const offer = parseOffer(article.raw);
      const invoice = await validateOffer(buyer, offer, amount);
      const invoiceAmount = BigInt(invoice.amount ?? 0);
      const invoicePrice = formatArticlePrice(invoiceAmount);
      const total = formatArticlePrice(invoiceAmount + MAX_ROUTING_FEE_SHANNONS);
      const expiresAt = encryptedInvoiceExpiresAt(invoice);
      if (expiresAt !== undefined && expiresAt <= BigInt(Date.now())) {
        setInvoiceExpired(true);
        return;
      }
      const expiry = expiresAt === undefined ? undefined : new Date(Number(expiresAt));
      setPreparingInvoice(false);
      const accepted = await ui.confirm({
        heading: "FIBER TESTNET INVOICE",
        title: article.title,
        description: article.attempt
          ? "The previous payment failed. Confirm to try again."
          : "The full story opens automatically once your payment is confirmed.",
        details: <ArticleInvoice invoice={offer.invoice} price={invoicePrice} fee={fee} total={total}
          expiresAt={expiry && Number.isFinite(expiry.getTime()) ? expiry.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" }) : undefined} />,
        cancelLabel: "Back to preview",
        confirmLabel: `Pay ${invoicePrice} CKB`,
      });
      if (accepted) {
        if (expiresAt !== undefined && expiresAt <= BigInt(Date.now())) {
          setInvoiceExpired(true);
          return;
        }
        recoveryStarted.current = true;
        setSubmitting(true);
        await fiber.run(() => purchase(article));
      }
    } catch {
      setCheckoutError("We couldn’t open this invoice. Try again or return to Explore.");
    } finally {
      setPreparingInvoice(false);
      setSubmitting(false);
      checkoutOpen.current = false;
    }
  };

  return (
    <article className="article-reader">
      <Link className="article-back" href="/explore">
        All articles
      </Link>

      <header className="article-header">
        <div className="article-heading">
          <p className="eyebrow">{article.category}</p>
          <h1>{article.title}</h1>
          <div className="article-byline">
            <span aria-hidden="true">
              {article.author.trim().charAt(0).toUpperCase() || "U"}
            </span>
            <div>
              <strong>{article.author}</strong>
              <small>
                {article.created ? dateFormatter.format(article.created) : 'Demo guide'} · {readingMinutes} min
                read
              </small>
            </div>
          </div>
        </div>
        <div className="article-hero-art" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </header>

      <div
        className="article-layout"
        data-unlocked={content ? "true" : undefined}
      >
        <div className="article-story">
          {source && <p className="muted">Source: <a href={source}>Fiber Network documentation</a>.{source.endsWith('/how-it-works') && ' Open the original page to use the interactive simulators.'}</p>}
          {!content && (
            <section
              className="article-preview"
              aria-labelledby="preview-title"
            >
              <p className="eyebrow" id="preview-title">
                FREE PREVIEW
              </p>
              <p>{article.preview}</p>
            </section>
          )}

          {content ? (
            <section className="article-content">
              <div className="article-prose">{article.markdown || source ? (
                <DemoMarkdown text={article.markdown || article.demoRevision ? `${article.preview}\n\n${content}` : content} />
              ) : content}</div>
            </section>
          ) : null}
        </div>

        {!content && (
          <aside
            className="access-card"
            data-state={
              failed && !closed
                ? "failed"
                : pending
                  ? "pending"
                  : closed
                    ? "expired"
                    : "available"
            }
          >
            {failed && !closed ? (
              <>
                <span className="access-icon" aria-hidden="true">
                  !
                </span>
                <p className="eyebrow">PAYMENT NOT COMPLETED</p>
                <h2>Your access is still safe.</h2>
                <p>
                  No article was unlocked. The previous attempt is confirmed as
                  failed, so you can retry safely.
                </p>
                <button
                  disabled={fiber.busy || preparingInvoice || !fiber.routeReady || Boolean(liquidityIssue)}
                  onClick={() => void submitPurchase()}
                >
                  {preparingInvoice ? "Opening invoice…" : "Retry payment"}
                </button>
                {!fiber.routeReady && (
                  <button
                    className="button-secondary"
                    disabled={fiber.busy}
                    onClick={openPaymentSetup}
                  >
                    Set up payments
                  </button>
                )}
              </>
            ) : pending ? (
              <>
                <span
                  className="access-icon access-spinner"
                  aria-hidden="true"
                />
                <p className="eyebrow">CHECKING YOUR ACCESS</p>
                <h2 role="status">{submitting || receipt ? "Confirming your payment…" : "Checking your existing payment…"}</h2>
                <p>
                  The full story stays encrypted while we verify your payment.
                </p>
                <button
                  className="button-secondary"
                  disabled={submitting || fiber.busy || !fiber.addresses.buyer}
                  onClick={() => void fiber.run(() => purchase(article, true))}
                >
                  {fiber.busy ? "Checking…" : "Check payment status"}
                </button>
              </>
            ) : closed ? (
              <>
                <span className="access-icon" aria-hidden="true">
                  ×
                </span>
                <p className="eyebrow">{replaced ? "OFFER REPLACED" : "OFFER EXPIRED"}</p>
                <h2>This checkout has closed.</h2>
                <p>{replaced ? "The writer published a new offer for this story." : "Ask the writer for a fresh offer or choose another story."}</p>
                <Link className="button-link button-secondary" href={article.supersededBy ? `/article/${article.supersededBy}` : "/explore"}>
                  {replaced ? "View replacement offer" : "Browse fresh articles"}
                </Link>
              </>
            ) : (
              <>
                <p className="eyebrow">ENCRYPTED UNTIL PAID</p>
                <h2>The full story is encrypted</h2>
                <p>Enjoy the free preview, or unlock the rest with a one-time payment.</p>
                <button
                  disabled={fiber.busy || preparingInvoice || !fiber.routeReady || Boolean(liquidityIssue)}
                  onClick={() => void submitPurchase()}
                >
                  {preparingInvoice ? "Opening invoice…" : `Unlock for ${price} CKB`}
                </button>
                {!fiber.routeReady && (
                  <>
                    <p className="access-note">
                      Payments are temporarily offline. Your preview remains
                      available.
                    </p>
                    <button
                      className="button-secondary"
                      disabled={fiber.busy}
                      onClick={openPaymentSetup}
                    >
                      Set up payments
                    </button>
                  </>
                )}
              </>
            )}
            {liquidityIssue && !closed && !pending && <p className="access-note">{liquidityIssue} <Link href="/setup">View payment capacity</Link></p>}
            {checkoutError && <p className="access-note" role="alert">{checkoutError}</p>}
          </aside>
        )}
      </div>
    </article>
  );
}
