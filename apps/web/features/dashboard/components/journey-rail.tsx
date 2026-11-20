import { ArrowRight, Check, PartyPopper } from "lucide-react";
import Link from "next/link";

import type { GettingStartedJourney } from "@/features/dashboard/lib/getting-started-journey";
import { cn } from "@/lib/utils";

/**
 * Guided journey: shows the whole idea → production path, where the user is on it,
 * and exactly one primary next action.
 */
export function JourneyRail({ journey }: { journey: GettingStartedJourney }) {
  const { stages, next, doneCount, isComplete } = journey;
  const progress = (doneCount / stages.length) * 100;

  return (
    <section
      id="get-started"
      aria-labelledby="journey-heading"
      className="sf-panel sf-rise overflow-hidden"
    >
      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-10">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="sf-eyebrow">{isComplete ? "All set" : "Your journey"}</p>
              <h2 id="journey-heading" className="mt-1 text-lg font-semibold tracking-tight">
                {isComplete ? "You have shipped through the whole loop" : "From idea to production"}
              </h2>
            </div>
            <span className="rounded-full border border-border bg-surface-sunken/70 px-3 py-1 text-xs font-medium tabular-nums text-muted-foreground">
              {doneCount} of {stages.length} complete
            </span>
          </div>

          <ol className="relative mt-7 grid grid-cols-3 gap-y-6 sm:grid-cols-6" aria-label="Journey steps">
            {/* track (desktop) */}
            <span aria-hidden className="absolute left-[8.33%] right-[8.33%] top-5 hidden h-0.5 rounded-full bg-border sm:block" />
            <span
              aria-hidden
              className="sf-grow absolute left-[8.33%] top-5 hidden h-0.5 rounded-full bg-brand sm:block"
              style={{ width: `${Math.max(0, (Math.min(doneCount, stages.length - 1) / (stages.length - 1)) * 83.34)}%` }}
            />
            {stages.map((stage, index) => {
              const Icon = stage.icon;
              const done = stage.state === "done";
              const current = stage.state === "current";
              return (
                <li key={stage.key} className="relative flex flex-col items-center gap-2.5 text-center">
                  <Link
                    href={stage.href}
                    aria-current={current ? "step" : undefined}
                    className="group flex flex-col items-center gap-2.5 outline-none"
                  >
                    <span
                      className={cn(
                        "relative grid size-10 place-items-center rounded-full border-2 bg-card transition-all duration-200 group-hover:scale-105 group-focus-visible:ring-4 group-focus-visible:ring-ring/30",
                        done && "border-success bg-success text-white",
                        current && "border-brand text-brand shadow-[0_0_0_5px_var(--brand-soft)]",
                        !done && !current && "border-border text-text-subtle",
                      )}
                      style={{ animationDelay: `${index * 60}ms` }}
                    >
                      {current ? (
                        <span className="absolute inset-0 rounded-full border-2 border-brand opacity-40 motion-safe:animate-ping" aria-hidden />
                      ) : null}
                      {done ? <Check className="size-[18px] sf-pop" strokeWidth={3} /> : <Icon className="size-[18px]" />}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "block text-[0.8125rem] font-semibold leading-tight",
                          current ? "text-foreground" : done ? "text-foreground/85" : "text-muted-foreground",
                        )}
                      >
                        {stage.label}
                      </span>
                      <span className="mt-0.5 hidden text-[11px] leading-tight text-text-subtle sm:block">
                        {stage.description}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>

          <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-muted sm:hidden" aria-hidden>
            <div className="sf-grow h-full rounded-full bg-brand" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="flex flex-col justify-center rounded-2xl border border-brand/15 bg-brand-soft/60 p-5 dark:bg-brand-soft">
          {isComplete || !next ? (
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-card text-brand shadow-soft">
                <PartyPopper className="size-5" />
              </span>
              <div>
                <p className="font-semibold">Everything is connected</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Keep the loop going: log the next idea and let ShipFlow carry it to production.
                </p>
                <Link
                  href="/dashboard/feature-requests"
                  className="group mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-strong"
                >
                  New feature request
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          ) : (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand">
                Next step · {doneCount + 1} of {stages.length}
              </p>
              <h3 className="mt-1.5 text-base font-semibold leading-snug tracking-tight">{next.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{next.hint}</p>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                <Link
                  href={next.href}
                  className="group inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_8px_20px_-8px_var(--brand)] transition-all hover:-translate-y-px hover:bg-brand-strong active:translate-y-0"
                >
                  {next.label}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                {next.secondary ? (
                  <Link href={next.secondary.href} className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                    {next.secondary.label}
                  </Link>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
