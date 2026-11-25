import { parseSharedArticle } from "../../../lib/shared-article.ts";
import {
  catalogWriteAccess,
  listSharedArticles,
  shareArticle,
} from "../../../lib/shared-catalog-server.ts";

const headers = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    return Response.json({ articles: await listSharedArticles() }, { headers });
  } catch {
    return Response.json(
      { error: "The shared catalog is unavailable." },
      { status: 503, headers },
    );
  }
}

async function readBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder();
  let size = 0;
  let body = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 32_768) {
      await reader.cancel();
      return null;
    }
    body += decoder.decode(value, { stream: true });
  }
  return JSON.parse(body + decoder.decode());
}

export async function POST(request: Request) {
  const access = catalogWriteAccess(request.headers.get("authorization"));
  if (access !== "allowed")
    return Response.json(
      {
        error:
          access === "disabled"
            ? "Sharing is not enabled on this server."
            : "The catalog publishing token is invalid.",
      },
      { status: access === "disabled" ? 503 : 401, headers },
    );
  const article = parseSharedArticle(await readBody(request).catch(() => null));
  if (!article)
    return Response.json(
      {
        error:
          "Enter valid article details. The preview can be up to 5,000 characters.",
      },
      { status: 400, headers },
    );
  try {
    const result = await shareArticle(article);
    return result
      ? Response.json(result.article, {
          status: result.created ? 201 : 200,
          headers,
        })
      : Response.json(
          { error: "This article ID is already used by another listing." },
          { status: 409, headers },
        );
  } catch {
    return Response.json(
      { error: "Could not save the shared listing. Try again." },
      { status: 503, headers },
    );
  }
}
