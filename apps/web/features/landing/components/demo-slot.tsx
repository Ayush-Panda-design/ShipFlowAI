"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

/** Drop `demo.gif` in `public/` or set NEXT_PUBLIC_DEMO_GIF_URL. */
const DEMO_GIF_SRC = (() => {
  const fromEnv = process.env.NEXT_PUBLIC_DEMO_GIF_URL?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : "/demo.gif";
})();

type DemoSlotProps = {
  className?: string;
  compact?: boolean;
};

export function DemoSlot({ className, compact }: DemoSlotProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");

  return (
    <motion.div
      id="demo"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.12 }}
      className={cn("w-full", className)}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-amber-800/15 bg-[var(--landing-card)] shadow-sm dark:border-amber-500/20",
          compact ? "rounded-lg" : "rounded-2xl sm:rounded-2xl",
        )}
      >
        <div className="flex items-center justify-between border-b border-amber-900/8 px-3 py-2 dark:border-amber-500/10 sm:px-4">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-rose-400/90" />
            <span className="size-2 rounded-full bg-amber-400/90" />
            <span className="size-2 rounded-full bg-emerald-400/90" />
          </div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400 sm:text-xs">
            90s product walkthrough
          </p>
        </div>

        <div
          className={cn(
            "relative w-full bg-gradient-to-br from-amber-500/8 via-transparent to-emerald-500/10",
            compact ? "aspect-[16/10] max-h-[11.5rem]" : "aspect-video",
          )}
        >
          {(status === "loading" || status === "ready") && (
            // eslint-disable-next-line @next/next/no-img-element -- GIF slot; next/image skips animation
            <img
              src={DEMO_GIF_SRC}
              alt="ShipFlow AI demo walkthrough"
              className={cn(
                "absolute inset-0 size-full object-cover object-top transition-opacity duration-300",
                status === "ready" ? "opacity-100" : "opacity-0",
              )}
              onLoad={() => setStatus("ready")}
              onError={() => setStatus("missing")}
            />
          )}

          {(status === "loading" || status === "missing") && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-amber-600/15 ring-2 ring-amber-600/30 sm:size-12">
                <Play className="ml-0.5 size-5 fill-amber-700 text-amber-700 dark:fill-amber-400 dark:text-amber-400" />
              </span>
              <p className="text-sm font-medium text-stone-700 dark:text-stone-200">
                {status === "loading" ? "Loading preview…" : "Demo preview coming soon"}
              </p>
              <p className="max-w-[220px] text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                {status === "missing"
                  ? "A short screen recording of the full idea-to-ship loop will appear here."
                  : "Hang tight — checking for your walkthrough file."}
              </p>
              {status === "missing" ? (
                <div className="mt-1 flex flex-wrap justify-center gap-1.5">
                  {["Request", "Review", "Ship"].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-amber-700/15 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-900 dark:text-amber-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
