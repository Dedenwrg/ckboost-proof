export type Draft = {
  title: string;
  author: string;
  category: string;
  preview: string;
  content: string;
  price: string;
  replacesId?: string;
  source?: string;
  markdown?: boolean;
};

export const blank: Draft = {
  title: "",
  author: "",
  category: "Technology",
  preview: "",
  content: "",
  price: "1",
};

export function hasDraftChanges(draft: Draft) {
  return (
    draft.title !== blank.title ||
    draft.author !== blank.author ||
    draft.category !== blank.category ||
    draft.preview !== blank.preview ||
    draft.content !== blank.content ||
    draft.price !== blank.price ||
    Boolean(draft.replacesId)
  );
}
