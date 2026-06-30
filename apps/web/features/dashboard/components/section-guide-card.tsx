"use client";

import { type ReactNode, useState } from "react";
import { ChevronDown, HelpCircle, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  SECTION_GUIDES,
  type GuideItemConfig,
  type SectionGuideId,
} from "@/features/dashboard/lib/section-guides";
import { cn } from "@/lib/utils";

type SectionGuideCardProps = {
  section: SectionGuideId;
  className?: string;
};

function GuideItem({ icon: Icon, title, body, iconClassName }: GuideItemConfig) {
  return (
    <div className="flex gap-2.5 rounded-lg border border-border/50 bg-background/70 p-2.5 transition-colors hover:border-primary/20 hover:bg-background">
      <span className="mt-0.5 shrink-0">
        <Icon className={cn("size-3.5 text-muted-foreground", iconClassName)} />
      </span>
      <span className="text-xs leading-relaxed">
        <span className="font-medium text-foreground">{title}</span>
        <span className="text-muted-foreground"> — {body}</span>
      </span>
    </div>
  );
}

function GuideBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-foreground/80">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function SectionGuideCard({ section, className }: SectionGuideCardProps) {
  const guide = SECTION_GUIDES[section];
  const storageKey = `shipflow.guide.${section}`;
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(storageKey) !== "0";
  });

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      window.localStorage.setItem(storageKey, next ? "1" : "0");
      return next;
    });
  };

  return (
    <div className={cn("space-y-2", className)}>
      {open ? (
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.06] via-background to-status-progress/[0.04] shadow-sm">
          <CardHeader className="gap-1 pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-semibold">
              <span className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/10">
                  <Sparkles className="size-4 text-primary" />
                </span>
                {guide.title}
              </span>
              <button
                type="button"
                onClick={toggle}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-normal text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Hide
                <ChevronDown className="size-3.5" />
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs text-muted-foreground">
            <p className="leading-relaxed">{guide.intro}</p>
            {guide.blocks.map((block) => (
              <GuideBlock key={block.title} title={block.title}>
                <div className="grid gap-2 sm:grid-cols-2">
                  {block.items.map((item) => (
                    <GuideItem key={item.title} {...item} />
                  ))}
                </div>
              </GuideBlock>
            ))}
          </CardContent>
        </Card>
      ) : (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={toggle}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/[0.04] px-3 py-1.5 text-xs font-medium text-primary/80 shadow-sm transition-all hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
          >
            <HelpCircle className="size-3.5" />
            How does this work?
          </button>
        </div>
      )}
    </div>
  );
}
