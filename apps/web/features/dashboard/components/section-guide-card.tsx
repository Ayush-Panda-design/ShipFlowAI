"use client";

import { type ReactNode, useSyncExternalStore } from "react";
import { ChevronDown, HelpCircle, Sparkles } from "lucide-react";

import {
  SECTION_GUIDES,
  type GuideItemConfig,
  type SectionGuideId,
} from "@/features/dashboard/lib/section-guides";
import { cn } from "@/lib/utils";

const GUIDE_EVENT = "shipflow:guide-toggle";

type SectionGuideCardProps = {
  section: SectionGuideId;
  className?: string;
};

function GuideItem({ icon: Icon, title, body }: GuideItemConfig) {
  return (
    <div className="flex h-full items-start gap-3.5 rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:-translate-y-px hover:border-brand/25 hover:shadow-soft">
      <span className="grid size-9 shrink-0 place-items-center rounded-[0.65rem] bg-brand-soft text-brand">
        <Icon className="size-[18px]" />
      </span>
      <div className="min-w-0 space-y-1">
        <h4 className="text-sm font-semibold leading-snug text-foreground">{title}</h4>
        <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

/** Pick columns so rows stay even: 4 items → 2×2, 3 → 3, 2 → 2, otherwise 3. */
function gridCols(count: number) {
  if (count === 4 || count === 2) return "lg:grid-cols-2";
  return "lg:grid-cols-3";
}

function GuideBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="sf-eyebrow">{title}</h3>
      {children}
    </div>
  );
}

export function SectionGuideCard({ section, className }: SectionGuideCardProps) {
  const guide = SECTION_GUIDES[section];
  const storageKey = `shipflow.guide.${section}`;
  // Server renders "open"; the saved preference is applied after hydration.
  const open = useSyncExternalStore(
    (notify) => {
      window.addEventListener("storage", notify);
      window.addEventListener(GUIDE_EVENT, notify);
      return () => {
        window.removeEventListener("storage", notify);
        window.removeEventListener(GUIDE_EVENT, notify);
      };
    },
    () => {
      try {
        return window.localStorage.getItem(storageKey) !== "0";
      } catch {
        return true;
      }
    },
    () => true,
  );

  const toggle = () => {
    try {
      window.localStorage.setItem(storageKey, open ? "0" : "1");
    } catch {
      // storage unavailable — preference is not persisted
    }
    window.dispatchEvent(new Event(GUIDE_EVENT));
  };

  return (
    <div className={cn("space-y-2", className)}>
      {open ? (
        <section className="sf-panel overflow-hidden" aria-label={guide.title}>
          <div className="h-1 bg-gradient-to-r from-brand via-amber to-transparent" />
          <div className="space-y-6 p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                  <Sparkles className="size-5" />
                </span>
                <div className="space-y-1.5">
                  <p className="sf-eyebrow">Guide</p>
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">
                    {guide.title}
                  </h2>
                  <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]">
                    {guide.intro}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggle}
                aria-expanded
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-brand/30 hover:text-brand"
              >
                Hide
                <ChevronDown className="size-3.5 rotate-180" />
              </button>
            </div>

            <div className="space-y-6">
              {guide.blocks.map((block) => (
                <GuideBlock key={block.title} title={block.title}>
                  <div className={cn("grid gap-3 sm:grid-cols-2", gridCols(block.items.length))}>
                    {block.items.map((item) => (
                      <GuideItem key={item.title} {...item} />
                    ))}
                  </div>
                </GuideBlock>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={toggle}
            aria-expanded={false}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-medium text-muted-foreground shadow-soft transition-all hover:border-brand/30 hover:text-brand active:translate-y-px"
          >
            <HelpCircle className="size-4" />
            How does this work?
          </button>
        </div>
      )}
    </div>
  );
}
