import { type LucideIcon, Monitor, Radio } from "lucide-react";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";

const githubUrl = "https://github.com/helloworld-ng/rdio";
const pageContainerClassName =
  "mx-auto w-full max-w-[1800px] px-[18px] sm:px-6 md:px-10";
const meshSectionClassName =
  "relative bg-transparent before:pointer-events-none before:absolute before:inset-0 before:z-0 before:[background-image:linear-gradient(var(--color-fd-border)_1px,transparent_1px),linear-gradient(90deg,var(--color-fd-border)_1px,transparent_1px)] before:[background-size:56px_56px] before:opacity-70 dark:before:opacity-60";
const primaryButtonClassName =
  "rdio-primary-button inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border px-6 py-2.5 font-semibold text-sm transition-transform duration-150 hover:-translate-y-px";
const secondaryButtonClassName =
  "inline-flex w-fit items-center justify-center gap-2 whitespace-nowrap rounded-full border border-fd-border bg-fd-accent/40 px-6 py-2.5 font-semibold text-[0.85rem] text-fd-foreground transition-all duration-150 hover:-translate-y-px hover:border-rdio-primary/60 hover:bg-fd-accent";

const features = [
  {
    title: "Lossless Streaming",
    text: "We ensure your signal remains uninterrupted across 5G, Wi-Fi, and low-bandwidth environments.",
  },
  {
    title: "Live Participation",
    text: "Integrated chat and request modules allow listeners to engage directly with the host in real-time.",
  },
  {
    title: "Intelligent Discovery and more...",
    text: "Our algorithm maps listener preferences to discover niche channels that resonate with their specific taste profile.",
  },
] as const;

function GitHubLink({
  children,
  className = "",
  iconSize = 18,
}: {
  children: ReactNode;
  className?: string;
  iconSize?: number;
}) {
  return (
    <a
      className={`${primaryButtonClassName} ${className}`}
      href={githubUrl}
      rel="noopener noreferrer"
      target="_blank"
    >
      <GitHubIcon size={iconSize} />
      {children}
    </a>
  );
}

function GitHubIcon({ size }: { size: number }) {
  return (
    <svg
      aria-hidden="true"
      className="block shrink-0"
      fill="currentColor"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.79-.26.79-.58v-2.23c-3.34.73-4.03-1.42-4.03-1.42-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.21.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49 1 .11-.78.42-1.31.76-1.6-2.66-.31-5.47-1.34-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23.96-.27 1.98-.4 3-.4s2.05.14 3.01.4c2.29-1.55 3.3-1.23 3.3-1.23.65 1.65.24 2.87.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.48 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.19.69.8.58C20.57 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function PlaceholderPanel({
  className,
  icon: Icon,
  label,
}: {
  className: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 rounded-2xl border border-fd-border bg-fd-card text-fd-muted-foreground shadow-[0_30px_70px_rgba(0,0,0,0.14),0_0_100px_rgba(42,161,182,0.03)] transition-all duration-300 dark:shadow-[0_30px_70px_rgba(0,0,0,0.55),0_0_100px_rgba(42,161,182,0.03)] ${className}`}
    >
      <Icon
        aria-hidden="true"
        className="rdio-float-slow size-[52px] opacity-50"
      />
      <p className="font-medium text-[1.1rem]">{label}</p>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="rdio-homepage relative min-h-screen overflow-x-hidden bg-fd-background text-fd-foreground">
      <div className="pointer-events-none absolute top-[-200px] left-[20%] z-0 size-[600px] rounded-full bg-[radial-gradient(circle,var(--color-rdio-primary)_0%,transparent_70%)] opacity-10 mix-blend-screen blur-[120px] dark:opacity-15" />
      <div className="pointer-events-none absolute right-[10%] bottom-[10%] z-0 size-[600px] rounded-full bg-[radial-gradient(circle,var(--color-rdio-secondary)_0%,transparent_70%)] opacity-10 mix-blend-screen blur-[120px] dark:opacity-15" />

      <header className="sticky top-0 z-50 flex h-[70px] w-full items-center justify-center border-fd-border border-b bg-fd-background/85 backdrop-blur-xl md:h-20">
        <div
          className={`${pageContainerClassName} flex items-center justify-between`}
        >
          <a
            className="inline-flex items-center font-extrabold text-[1.6rem]"
            href="/"
          >
            rdio<span className="text-rdio-primary">.</span>
          </a>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              className={`${secondaryButtonClassName} px-4 py-2 text-sm md:px-6 md:py-2.5`}
              href="/docs"
            >
              Docs
            </a>
            <GitHubLink className="px-4 py-2 md:px-6 md:py-2.5">
              GitHub
            </GitHubLink>
          </div>
        </div>
      </header>

      <div className={meshSectionClassName}>
        <main
          className="relative z-10 py-[72px] pb-10 md:pt-[90px] md:pb-[50px]"
          id="discover"
        >
          <div className={pageContainerClassName}>
            <div className="grid items-start gap-5 lg:grid-cols-[1.3fr_1fr] lg:items-end lg:gap-[60px]">
              <div className="flex flex-col">
                <h1 className="font-medium text-[2.4rem] leading-[1.1] md:text-[2.8rem] lg:text-[3.8rem]">
                  Radio as it
                  <br />
                  should be
                </h1>
              </div>
              <div className="flex justify-start pb-0 lg:justify-end lg:pb-3">
                <p className="max-w-[440px] text-left text-[1.15rem] text-fd-muted-foreground leading-[1.7] lg:text-right">
                  rdio connects you to thousands of independent broadcasters
                  sharing music, stories, and global perspectives in real-time.
                </p>
              </div>
            </div>
          </div>
        </main>

        <section className="relative z-10 w-full pt-2.5 pb-20">
          <div className={pageContainerClassName}>
            <PlaceholderPanel
              className="h-[360px] md:h-[480px]"
              icon={Radio}
              label="Dashboard Area"
            />
          </div>
        </section>
      </div>

      <section className={`${meshSectionClassName} w-full`}>
        <div className="relative z-10 mx-auto w-full max-w-[1800px]">
          <div className="grid gap-1 overflow-visible rounded-b-lg border-fd-background border-t-0 border-r-4 border-b-4 border-l-4 bg-fd-background md:grid-cols-2 lg:grid-cols-3">
            <div className="col-span-full flex flex-col gap-6 px-[18px] py-12 sm:px-6 md:px-10 lg:flex-row lg:items-end lg:justify-between lg:gap-10 lg:py-16">
              <h2 className="font-medium text-[2.4rem] leading-[1.1] md:text-[2.8rem] lg:text-[3.8rem]">
                Pure signal.
                <br />
                Infinite reach.
              </h2>
              <p className="max-w-[440px] text-left text-[1.1rem] text-fd-muted-foreground leading-[1.6] lg:text-right">
                rdio connects you to thousands of independent broadcasters
                sharing music, stories, and global perspectives in real-time.
              </p>
            </div>

            {features.map((feature) => (
              <div
                className="relative z-0 flex flex-col justify-between bg-fd-card px-6 py-9 transition-all duration-300 hover:z-10 hover:shadow-[0_16px_40px_rgba(0,0,0,0.14)] md:min-h-[320px] md:px-8 md:py-12 last:md:col-span-2 last:lg:col-span-1 dark:hover:shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
                key={feature.title}
              >
                <div className="flex flex-col">
                  <span className="mb-6 font-semibold text-[0.75rem] text-fd-muted-foreground uppercase">
                    {feature.title}
                  </span>
                  <p className="font-medium text-[1.25rem] leading-[1.5]">
                    {feature.text}
                  </p>
                </div>
                <a
                  className={`${secondaryButtonClassName} mt-8`}
                  href={githubUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <GitHubIcon size={16} />
                  GitHub
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className={`${meshSectionClassName} w-full py-24`}
        id="developers"
      >
        <div className={`${pageContainerClassName} relative z-10`}>
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-[60px]">
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
              <span className="mb-3 font-medium text-[0.8rem] text-fd-muted-foreground uppercase">
                For Developers
              </span>
              <h2 className="mb-6 font-medium text-[2rem] leading-[1.1] md:text-[2.5rem] lg:text-[3.5rem]">
                Schedule, mix, monitor
                <br className="hidden lg:block" />
                and configure
              </h2>
              <p className="mb-8 max-w-[600px] text-[1.1rem] text-fd-muted-foreground leading-[1.6] lg:max-w-[460px]">
                Enjoy webhooks, customizable players, automated scheduling, and
                other features all designed to empower developers.
              </p>
              <GitHubLink>Star on GitHub</GitHubLink>
            </div>

            <div>
              <PlaceholderPanel
                className="h-[380px] rounded-xl"
                icon={Monitor}
                label="Developer Console"
              />
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
