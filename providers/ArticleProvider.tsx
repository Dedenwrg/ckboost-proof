"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { GetPaymentResult } from "@fiber-pay/sdk/browser";
import { decryptResult } from "../lib/crypto";
import { createOffer, parseOffer } from "../lib/offer";
import { payForOffer, validateOffer } from "../lib/payment";
import {
  articleStorageKey,
  articleOfferExpiresAt,
  articlePriceShannons,
  isArticleOfferExpired,
  readArticleCatalog,
  type Article,
} from "../lib/articles";
import { blank, type Draft } from "../lib/article-draft";
import { articleLiquidityIssue, parseArticlePrice } from "../lib/payment-config";
import { useFiber } from "./FiberProvider";

type ArticleContextValue = {
  articles: Article[];
  draft: Draft;
  receipts: Record<string, GetPaymentResult>;
  unlocked: Record<string, string>;
  catalogLoaded: boolean;
  expiredArticleIds: ReadonlySet<string>;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
  publish: () => Promise<Article>;
  purchase: (article: Article, check?: boolean) => Promise<void>;
};

const ArticleContext = createContext<ArticleContextValue | null>(null);

export function ArticleProvider({ children }: { children: React.ReactNode }) {
  const fiber = useFiber();
  const [articles, setArticles] = useState<Article[]>([]);
  const articlesRef = useRef<Article[]>([]);
  const [draft, setDraft] = useState<Draft>({ ...blank });
  const [receipts, setReceipts] = useState<Record<string, GetPaymentResult>>(
    {},
  );
  const [unlocked, setUnlocked] = useState<Record<string, string>>({});
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [offerClock, setOfferClock] = useState(Date.now);
  const expiredArticleIds = useMemo(() => {
    const now = Math.max(offerClock, Date.now());
    return new Set(articles.filter((article) => isArticleOfferExpired(article, now)).map((article) => article.id));
  }, [articles, offerClock]);
  const nextExpiry = Math.min(...articles.filter((article) => !expiredArticleIds.has(article.id))
    .map(articleOfferExpiresAt));
  useEffect(() => {
    if (!Number.isFinite(nextExpiry)) return;
    const timer = window.setTimeout(() => setOfferClock(Date.now()), Math.max(0, nextExpiry - Date.now()) + 25);
    return () => window.clearTimeout(timer);
  }, [nextExpiry]);

  useEffect(() => {
    try {
      const key = articleStorageKey(localStorage);
      const saved = key ? readArticleCatalog(localStorage, key) : [];
      articlesRef.current = saved;
      setArticles(saved);
      setCatalogLoaded(true);
    } catch {
      setCatalogLoaded(true);
    }
  }, [fiber.profileVersion]);

  const persist = useCallback((next: Article[]) => {
    const key = articleStorageKey(localStorage);
    if (!key) throw new Error("Start both saved nodes first.");
    localStorage.setItem(key, JSON.stringify(next));
    articlesRef.current = next;
    setArticles(next);
  }, []);

  const publish = useCallback(async () => {
    const seller = fiber.getNode("seller");
    const sellerChannel = fiber.channels.seller;
    if (!seller || !sellerChannel || !fiber.routeReady)
      throw new Error("Complete network setup first.");
    const { title, author, category, preview, content } = draft;
    if (
      ![title, author, category, preview, content].every((value) =>
        value.trim(),
      )
    ) {
      throw new Error("Complete all article fields.");
    }
    const amount = parseArticlePrice(draft.price);
    if (amount === null) throw new Error("Enter a valid article price in CKB.");
    const replacesId = draft.replacesId;
    if (replacesId && !articlesRef.current.some((item) => item.id === replacesId && !item.supersededBy)) {
      throw new Error("This offer already has a replacement.");
    }
    const { raw, expiresAt } = await createOffer(seller, sellerChannel, content, amount);
    const article: Article = {
      id: crypto.randomUUID(),
      title: title.trim(),
      author: author.trim(),
      category: category.trim(),
      preview: preview.trim(),
      source: draft.source,
      markdown: draft.markdown,
      raw,
      priceShannons: amount.toString(),
      expiresAt,
      created: Date.now(),
      attempt: "",
    };
    const previous = articlesRef.current.map((item) =>
      item.id === replacesId ? { ...item, supersededBy: article.id } : item);
    persist([...previous, article]);
    setDraft({ ...blank });
    fiber.setStatus("Article published.");
    return article;
  }, [draft, fiber, persist]);

  const purchase = useCallback(
    async (article: Article, check = false) => {
      const current = articlesRef.current.find((item) => item.id === article.id);
      if (!current) throw new Error("This article is unavailable.");
      const buyer = fiber.getNode("buyer");
      if (!buyer) throw new Error("Start your buyer node in Network setup.");
      const offer = parseOffer(current.raw);
      const amount = articlePriceShannons(current);
      let result: GetPaymentResult;
      if (check) {
        if (!current.attempt) return;
        if (current.attempt.toLowerCase() !== offer.paymentHash.toLowerCase()) throw new Error("Restore the offer for the previous payment.");
        await validateOffer(buyer, offer, amount);
        result = await buyer.getPayment({ payment_hash: offer.paymentHash });
      } else {
        if (!fiber.routeReady) throw new Error("Complete network setup first.");
        if (current.supersededBy) throw new Error("This offer has been replaced. Open the latest offer.");
        const buyerChannel = fiber.channels.buyer;
        const sellerChannel = fiber.channels.seller;
        const issue = articleLiquidityIssue(amount, BigInt(buyerChannel?.local_balance ?? 0), BigInt(sellerChannel?.remote_balance ?? 0));
        if (issue) throw new Error(issue);
        result = await payForOffer(
          buyer,
          offer,
          current.attempt,
          (hash) => {
            persist(
              articlesRef.current.map((item) =>
                item.id === article.id ? { ...item, attempt: hash } : item,
              ),
            );
          },
          receipts[article.id]?.status === "Failed",
          amount,
        );
      }
      setReceipts((previous) => ({ ...previous, [article.id]: result }));
      if (result.status === "Failed") {
        fiber.setStatus("Payment not completed.");
        throw new Error(
          result.failed_error ?? "Payment failed. Check liquidity.",
        );
      }
      if (result.status === "Success") {
        if (!result.payment_preimage)
          throw new Error(
            "Payment settled; check payment status to recover the key.",
          );
        const text = await decryptResult(offer, result.payment_preimage);
        setUnlocked((previous) => ({ ...previous, [article.id]: text }));
        fiber.setStatus("Article unlocked and saved to My Library.");
      } else {
        fiber.setStatus("Payment is confirming.");
      }
      await Promise.all([fiber.refresh("buyer"), fiber.refresh("seller")]);
    },
    [fiber, persist, receipts],
  );

  const value = useMemo(
    () => ({
      articles,
      draft,
      receipts,
      unlocked,
      catalogLoaded,
      expiredArticleIds,
      setDraft,
      publish,
      purchase,
    }),
    [articles, draft, receipts, unlocked, catalogLoaded, expiredArticleIds, publish, purchase],
  );

  return (
    <ArticleContext.Provider value={value}>{children}</ArticleContext.Provider>
  );
}

export function useArticles() {
  const context = useContext(ArticleContext);
  if (!context)
    throw new Error("useArticles must be used inside ArticleProvider.");
  return context;
}
