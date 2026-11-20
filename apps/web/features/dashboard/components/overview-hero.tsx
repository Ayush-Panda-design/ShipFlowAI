import { HeroWorkflowIllustration } from "@/components/illustrations/hero-workflow";

const STAGES = ["Idea", "Requirements", "Tasks", "Code review", "Production"] as const;

function firstName(name?: string | null) {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0] ?? null;
}

/** Editorial hero: welcome, heading, supporting copy, and the idea → production workflow illustration. */
export function OverviewHero({ userName }: { userName?: string | null }) {
  const name = firstName(userName);

  return (
    <section className="sf-hero overflow-hidden rounded-[1.25rem] border border-border shadow-soft">
      <div className="grid items-center gap-2 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="relative z-10 flex flex-col gap-5 px-6 pb-2 pt-8 sm:px-9 lg:py-12">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card/80 py-1 pl-1.5 pr-3 text-xs font-medium text-foreground/80 shadow-soft backdrop-blur-sm">
            <span className="grid size-5 place-items-center rounded-full bg-brand-soft text-brand">
              <svg viewBox="0 0 16 16" className="size-3" fill="currentColor" aria-hidden>
                <path d="M8 1.5l1.6 4 4 1.6-4 1.6L8 12.7 6.4 8.7l-4-1.6 4-1.6z" />
              </svg>
            </span>
            {name ? `Welcome back, ${name}` : "Welcome back"}
          </span>

          <div className="space-y-3">
            <h1 className="font-display text-[2.6rem] leading-[1.02] text-foreground sm:text-5xl lg:text-[3.4rem]">
              Overview
            </h1>
            <p className="max-w-md text-[0.95rem] leading-relaxed text-muted-foreground sm:text-base">
              Your path from idea to production, all in one place.
            </p>
          </div>

          <ol
            className="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-xs font-medium text-muted-foreground"
            aria-label="ShipFlow workflow"
          >
            {STAGES.map((stage, index) => (
              <li key={stage} className="flex items-center gap-1.5">
                <span
                  className={
                    index === STAGES.length - 1
                      ? "rounded-full bg-brand px-2.5 py-1 text-primary-foreground"
                      : "rounded-full border border-border bg-card/80 px-2.5 py-1 text-foreground/75"
                  }
                >
                  {stage}
                </span>
                {index < STAGES.length - 1 ? (
                  <span aria-hidden className="text-text-subtle">
                    →
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </div>

        <div className="relative flex items-center justify-center px-3 pb-4 lg:min-h-[15rem] lg:pb-0 lg:pr-8">
          <HeroWorkflowIllustration className="h-auto w-full max-w-[30rem] lg:max-w-[34rem] lg:translate-x-2" />
        </div>
      </div>
    </section>
  );
}
