import { readSharedArticle } from "../../../../lib/shared-catalog-server.ts";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const headers = { "Cache-Control": "no-store" };
  const { id } = await params;
  try {
    const article = await readSharedArticle(id);
    return article
      ? Response.json(article, { headers })
      : Response.json(
          { error: "Article not found." },
          { status: 404, headers },
        );
  } catch {
    return Response.json(
      { error: "The shared catalog is unavailable." },
      { status: 503, headers },
    );
  }
}
