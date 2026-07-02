import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { getLegalPage } from "@/lib/legal";

const page = getLegalPage("privacy");

export const metadata: Metadata = {
  title: page.title,
  description: page.description,
};

export default function PrivacyPage() {
  const Content = page.body;

  return (
    <LegalPage
      description={page.description}
      effectiveDate={page.effectiveDate}
      sections={page.sections}
      title={page.title}
    >
      <Content />
    </LegalPage>
  );
}
