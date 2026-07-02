import type { ReactNode } from "react";

interface LegalSection {
  id: string;
  title: string;
}

export function LegalPage({
  children,
  description,
  effectiveDate,
  sections,
  title,
}: {
  children: ReactNode;
  description: string;
  effectiveDate: string;
  sections: LegalSection[];
  title: string;
}) {
  return (
    <div className="min-h-screen bg-fd-background text-fd-foreground">
      <main className="mx-auto w-full max-w-5xl px-[18px] py-12 sm:px-6 md:px-10 md:py-20">
        <a
          className="mb-10 inline-flex items-center font-extrabold text-[1.6rem]"
          href="/"
        >
          rdio<span className="rdio-brand-dot">.</span>
        </a>
        <h1 className="font-semibold text-5xl tracking-normal md:text-6xl">
          {title}
        </h1>
        <p className="mt-6 text-fd-muted-foreground text-lg">
          Last updated {effectiveDate}
        </p>

        <p className="mt-8 max-w-3xl text-fd-muted-foreground text-lg leading-8">
          {description}
        </p>

        <nav
          aria-label={`${title} sections`}
          className="mt-12 border-fd-border border-l pl-6 md:pl-8"
        >
          <ol className="grid gap-x-16 gap-y-2 text-fd-muted-foreground text-lg md:grid-cols-2">
            {sections.map((section, index) => (
              <li key={section.id}>
                <a
                  className="transition-colors hover:text-fd-foreground"
                  href={`#${section.id}`}
                >
                  {index + 1}. {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="prose md:prose-lg prose-li:my-1 prose-p:my-4 mt-14 prose-h2:mt-10 prose-h2:mb-3 max-w-4xl prose-headings:scroll-m-10 prose-a:text-fd-foreground prose-h2:text-2xl prose-headings:text-fd-foreground prose-strong:text-fd-foreground text-fd-muted-foreground prose-p:leading-8 prose-a:underline-offset-4">
          {children}
        </div>
      </main>
    </div>
  );
}
