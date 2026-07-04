export function TerminalPanel() {
  return (
    <div className="overflow-hidden rounded-xl border border-fd-border bg-white text-[0.82rem] text-zinc-700 dark:bg-[#08090a] dark:text-zinc-300">
      <div className="flex h-11 items-center justify-between border-fd-border border-b bg-zinc-50 px-4 dark:bg-white/[0.03]">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          <span className="size-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          <span className="size-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </div>
        <span className="font-mono text-[0.7rem] text-zinc-500 dark:text-zinc-500">
          ~/rdio
        </span>
        <span className="rounded-full border border-rdio-primary/35 bg-rdio-primary/5 px-2 py-0.5 font-mono text-[0.65rem] text-rdio-primary uppercase dark:bg-transparent">
          ready
        </span>
      </div>

      <div className="min-h-[336px] px-5 py-6 font-mono leading-7 md:px-7 md:py-8">
        <p>
          <span className="text-rdio-primary">$</span>{" "}
          <span className="text-zinc-950 dark:text-zinc-100">pnpm install</span>
        </p>
        <p className="text-zinc-500 dark:text-zinc-500">packages resolved</p>

        <p className="mt-4">
          <span className="text-rdio-primary">$</span>{" "}
          <span className="text-zinc-950 dark:text-zinc-100">
            docker compose up
          </span>
        </p>
        <p>
          <span className="text-emerald-600 dark:text-emerald-400">ready</span>{" "}
          <span className="text-zinc-500 dark:text-zinc-500">postgres</span>
        </p>
        <p>
          <span className="text-emerald-600 dark:text-emerald-400">ready</span>{" "}
          <span className="text-zinc-500 dark:text-zinc-500">icecast</span>
        </p>
        <p>
          <span className="text-emerald-600 dark:text-emerald-400">ready</span>{" "}
          <span className="text-zinc-500 dark:text-zinc-500">liquidsoap</span>
        </p>

        <p className="mt-4">
          <span className="text-rdio-primary">$</span>{" "}
          <span className="text-zinc-950 dark:text-zinc-100">
            pnpm db:migrate
          </span>
        </p>
        <p className="text-zinc-500 dark:text-zinc-500">database migrated</p>

        <p className="mt-4">
          <span className="text-rdio-primary">$</span>{" "}
          <span className="text-zinc-950 dark:text-zinc-100">pnpm dev</span>
        </p>
        <p>
          <span className="text-zinc-500 dark:text-zinc-500">admin</span>{" "}
          <span className="text-sky-600 dark:text-sky-300">
            http://localhost:5173
          </span>
        </p>
        <p>
          <span className="text-zinc-500 dark:text-zinc-500">stream</span>{" "}
          <span className="text-sky-600 dark:text-sky-300">
            http://localhost:3001/live.mp3
          </span>
        </p>
        <p>
          <span className="text-rdio-primary">$</span>{" "}
          <span className="rdio-terminal-caret inline-block h-5 w-2 translate-y-1 bg-rdio-primary" />
        </p>
      </div>
    </div>
  );
}
