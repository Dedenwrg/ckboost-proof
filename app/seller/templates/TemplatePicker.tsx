"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { hasDraftChanges, type Draft } from "../../../lib/article-draft";
import { useArticles } from "../../../providers/ArticleProvider";
import { useUI } from "../../../providers/UIProvider";

export function TemplatePicker({
  templates,
}: {
  templates: { id: string; draft: Draft }[];
}) {
  const router = useRouter();
  const { draft, setDraft } = useArticles();
  const { confirm } = useUI();
  async function chooseTemplate(template: Draft) {
    if (
      hasDraftChanges(draft) &&
      !(await confirm({
        title: "Replace your current draft?",
        description:
          "Using this template will replace everything in your editor.",
        confirmLabel: "Replace draft",
        heading: "YOUR DRAFT",
      }))
    )
      return;
    setDraft({ ...template });
    router.push("/seller/write");
  }
  return (
    <section className="studio">
      <Link className="article-back" href="/seller">
        Back to Seller Studio
      </Link>
      <div className="studio-intro">
        <p className="eyebrow">SELLER STUDIO</p>
        <h1>Article templates</h1>
        <p>
          Choose a starting point. Every field remains editable before
          publishing.
        </p>
      </div>
      <div className="studio-options">
        {templates.map(({ id, draft: template }) => (
          <article className="studio-panel" key={id}>
            <p className="eyebrow">{template.category}</p>
            <h2>{template.title}</h2>
            <p>{template.preview}</p>
            <button
              className="button-secondary"
              onClick={() => void chooseTemplate(template)}
            >
              Use this template
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
