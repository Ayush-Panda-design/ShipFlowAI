"use client";

import { useState } from "react";
import { Check, Copy, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

type CodeSuggestionProps = {
  code: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  className?: string;
};

export function CodeSuggestion({
  code,
  filePath,
  lineStart,
  lineEnd,
  className,
}: CodeSuggestionProps) {
  const [copied, setCopied] = useState(false);

  const location = filePath
    ? `${filePath}${
        lineStart != null
          ? `:${lineStart}${
              lineEnd != null && lineEnd !== lineStart ? `-${lineEnd}` : ""
            }`
          : ""
      }`
    : null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable; ignore.
    }
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-status-success/30 bg-status-success/[0.03]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-status-success/20 bg-status-success/[0.06] px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-status-success">
          <Sparkles className="size-3.5 shrink-0" />
          <span className="shrink-0">Suggested fix</span>
          {location ? (
            <span className="truncate font-mono text-[11px] text-muted-foreground">
              {location}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={copy}
          className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-status-success/10 hover:text-status-success"
        >
          {copied ? (
            <>
              <Check className="size-3" /> Copied
            </>
          ) : (
            <>
              <Copy className="size-3" /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto px-3 py-2.5 text-xs leading-relaxed">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
}
