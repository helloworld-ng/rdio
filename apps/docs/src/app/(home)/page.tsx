import Image from "next/image";
import type { ReactNode } from "react";
import heroImage from "@/assets/hero.png";
import { SiteFooter } from "@/components/site-footer";
import { TerminalPanel } from "@/components/terminal/terminal-panel";

const githubUrl = "https://github.com/helloworld-ng/rdio";
const pageContainerClassName =
  "mx-auto w-full max-w-[1800px] px-[18px] sm:px-6 md:px-10";
const meshSectionClassName =
  "relative bg-transparent before:pointer-events-none before:absolute before:inset-0 before:z-0 before:[background-image:linear-gradient(var(--color-fd-border)_1px,transparent_1px),linear-gradient(90deg,var(--color-fd-border)_1px,transparent_1px)] before:[background-size:72px_72px] before:opacity-35 dark:before:opacity-30";
const primaryButtonClassName =
  "rdio-primary-button inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border px-6 py-2.5 font-semibold text-sm transition-transform duration-150";
const secondaryButtonClassName =
  "inline-flex w-fit items-center justify-center gap-2 whitespace-nowrap rounded-full border border-fd-border bg-fd-accent/40 px-6 py-2.5 font-semibold text-[0.85rem] text-fd-foreground transition-all duration-150 hover:border-rdio-primary/60 hover:bg-fd-accent";

const features = [
  {
    title: "Schedule your station",
    text: "Plan recording and live broadcast slots on a daily calendar with drag-and-drop, conflict detection, and automatic playout switching.",
  },
  {
    title: "Go live when needed",
    text: "Hand off to BUTT or another Icecast-compatible encoder. Presenters connect to harbor; listeners keep the same stream URL.",
  },
  {
    title: "Manage your library",
    text: "Upload media to R2, organize programs and hosts, and attach them to schedule slots from one control room.",
  },
  {
    title: "Monitor on air",
    text: "Listen through the built-in player, check live source status, and confirm playout before every show.",
  },
  {
    title: "Team access",
    text: "Create member accounts with admin and user roles. New members set their own password on first sign-in.",
  },
  {
    title: "Own the stack",
    text: "Run the admin app, API, Postgres, Liquidsoap, and Icecast yourself. rdio is the control plane, not a hosted platform.",
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
                  An all-in-one
                  <br />
                  control room for
                  <br />
                  internet radio
                </h1>
              </div>
              <div className="flex justify-start pb-0 lg:justify-end lg:pb-3">
                <p className="max-w-[440px] text-left text-[1.15rem] text-fd-muted-foreground leading-[1.7] lg:text-right">
                  Schedule programs, manage media, hand off to live broadcasts,
                  and keep a single station running from your own server.
                </p>
              </div>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <GitHubLink>Star on GitHub</GitHubLink>
              <a className={secondaryButtonClassName} href="/docs">
                Read the docs
              </a>
            </div>
          </div>
        </main>

        <section className="relative z-10 w-full pt-2.5 pb-20">
          <div className={pageContainerClassName}>
            <div className="mx-auto max-w-[1420px] overflow-hidden rounded-2xl border border-fd-border bg-fd-card">
              <Image
                alt="rdio schedule editor showing station blocks and the slot editing panel"
                className="block h-auto w-full"
                priority
                src={heroImage}
              />
            </div>
          </div>
        </section>
      </div>

      <section className={`${meshSectionClassName} w-full`}>
        <div className="relative z-10 mx-auto w-full max-w-[1800px]">
          <div className="grid gap-1 overflow-visible rounded-b-lg border-fd-background border-t-0 border-r-4 border-b-4 border-l-4 bg-fd-background md:grid-cols-2 lg:grid-cols-3">
            <div className="col-span-full flex flex-col gap-6 px-[18px] py-12 sm:px-6 md:px-10 lg:flex-row lg:items-end lg:justify-between lg:gap-10 lg:py-16">
              <h2 className="font-medium text-[2rem] leading-[1.1] md:text-[2.5rem] lg:text-[3rem]">
                Everything you need
                <br />
                to stay on air.
              </h2>
              <p className="max-w-[440px] text-left text-[1.1rem] text-fd-muted-foreground leading-[1.6] lg:text-right">
                rdio combines the station admin UI, schedule automation, live
                broadcast handoff, and stream delivery glued into one
                self-hosted stack.
              </p>
            </div>

            {features.map((feature) => (
              <div
                className="relative z-0 flex flex-col justify-between bg-fd-card px-6 py-9 md:min-h-[260px] md:px-8 md:py-12 last:md:col-span-2 last:lg:col-span-1"
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
              <h2 className="mb-6 font-medium text-[2rem] leading-[1.1] md:text-[2.5rem] lg:text-[3.5rem]">
                Bring your
                <br />
                own station.
              </h2>
              <p className="mb-8 max-w-[600px] text-[1.1rem] text-fd-muted-foreground leading-[1.6] lg:max-w-[460px]">
                rdio runs on boring, proven radio infrastructure: a TypeScript
                admin app, Fastify API, Postgres, Liquidsoap for playout, and
                Icecast for the public stream.
              </p>
              <GitHubLink>View on GitHub</GitHubLink>
            </div>

            <div>
              <TerminalPanel />
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
