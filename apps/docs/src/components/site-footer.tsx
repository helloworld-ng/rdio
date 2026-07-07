import { FooterThemeSwitch } from "@/components/footer-theme-switch";

const footerLinkClassName =
  "font-medium text-[0.9rem] text-fd-muted-foreground transition-colors hover:text-fd-foreground";

export function SiteFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`relative z-10 bg-fd-background py-12 ${className}`}>
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-6 px-[18px] sm:px-6 md:px-10">
        <div className="flex justify-end">
          <FooterThemeSwitch />
        </div>
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <p className="text-[0.85rem] text-fd-muted-foreground">
            &copy; 2026 Moonlight.
          </p>
          <nav
            aria-label="Footer"
            className="flex flex-wrap items-center gap-x-7 gap-y-2"
          >
            <a className={footerLinkClassName} href="/terms">
              Terms
            </a>
            <a className={footerLinkClassName} href="/privacy">
              Privacy
            </a>
            <a
              className={footerLinkClassName}
              href="https://moonlight.ng"
              rel="noopener noreferrer"
              target="_blank"
            >
              Moonlight
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
