"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { SharedArticleInput } from "../../lib/shared-article";

export function ShareArticle({ article }: { article: SharedArticleInput }) {
  const [token, setToken] = useState("");
  const [pending, setPending] = useState(false);
  const [shared, setShared] = useState(false);
  const [error, setError] = useState("");

  async function share(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !token.trim()) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/articles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.trim()}`,
        },
        body: JSON.stringify(article),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        setError(result?.error ?? "Could not share the preview.");
        return;
      }
      setShared(true);
      setToken("");
    } catch {
      setError("Could not reach the shared catalog.");
    } finally {
      setPending(false);
    }
  }

  return (
    <details>
      <summary>Share preview in Explore</summary>
      {shared ? (
        <p role="status">
          Preview shared.{" "}
          <Link href={`/explore/${article.id}`}>Open public preview</Link>
        </p>
      ) : (
        <form onSubmit={(event) => void share(event)}>
          <p>
            Share the title, free preview, and listed price with other browsers.
            Public checkout is planned separately.
          </p>
          <label>
            Catalog publishing token
            <input
              type="password"
              value={token}
              autoComplete="off"
              required
              onChange={(event) => setToken(event.target.value)}
            />
          </label>
          <button disabled={pending || !token.trim()}>
            {pending ? "Sharing…" : "Share preview"}
          </button>
          {error && <p role="alert">{error}</p>}
        </form>
      )}
    </details>
  );
}
