import { legal } from "collections/server";
import { notFound } from "next/navigation";

interface LegalMeta {
  description: string;
  effectiveDate: string;
  sections: {
    id: string;
    title: string;
  }[];
  title: string;
}

type LegalDocument = (typeof legal)[number] & LegalMeta;

export function getLegalPage(slug: "privacy" | "terms") {
  const pages = legal as unknown as (LegalDocument & {
    info: { path: string };
  })[];
  const page = pages.find((item) => item.info.path === `${slug}.mdx`);
  if (!page) {
    notFound();
  }

  return page as LegalDocument;
}
