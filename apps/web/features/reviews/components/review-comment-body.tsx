"use client";

import { CodeSuggestion } from "@/features/reviews/components/code-suggestion";
import { cn } from "@/lib/utils";

type ReviewCommentBodyProps = {
  markdown: string;
  className?: string;
};

/** Lightweight renderer for ShipFlow review markdown (GitHub comment format). */
export function ReviewCommentBody({ markdown, className }: ReviewCommentBodyProps) {
  const blocks = parseReviewMarkdown(markdown);

  return (
    <article className={cn("space-y-3 text-sm leading-relaxed", className)}>
      {blocks.map((block, index) => (
        <MarkdownBlock key={index} block={block} />
      ))}
    </article>
  );
}

type Block =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "blockquote"; lines: string[] }
  | { type: "code"; text: string }
  | { type: "hr" };

function parseReviewMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";

    if (line.trim() === "---") {
      blocks.push({ type: "hr" });
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index]?.startsWith("```")) {
        codeLines.push(lines[index] ?? "");
        index += 1;
      }
      index += 1;
      blocks.push({ type: "code", text: codeLines.join("\n") });
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push({ type: "h2", text: line.slice(3).trim() });
      index += 1;
      continue;
    }

    if (line.startsWith("### ")) {
      blocks.push({ type: "h3", text: line.slice(4).trim() });
      index += 1;
      continue;
    }

    if (line.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index]?.startsWith("> ")) {
        quoteLines.push((lines[index] ?? "").slice(2));
        index += 1;
      }
      blocks.push({ type: "blockquote", lines: quoteLines });
      continue;
    }

    if (line.trim() === "") {
      index += 1;
      continue;
    }

    const paragraphLines: string[] = [line];
    index += 1;
    while (
      index < lines.length &&
      (lines[index]?.trim() ?? "") !== "" &&
      !lines[index]?.startsWith("#") &&
      !lines[index]?.startsWith("> ") &&
      !lines[index]?.startsWith("```") &&
      lines[index]?.trim() !== "---"
    ) {
      paragraphLines.push(lines[index] ?? "");
      index += 1;
    }

    blocks.push({ type: "paragraph", text: paragraphLines.join("\n") });
  }

  return blocks;
}

function MarkdownBlock({ block }: { block: Block }) {
  switch (block.type) {
    case "h2":
      return (
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          {inlineMarkdown(block.text)}
        </h2>
      );
    case "h3":
      return (
        <h3 className="mt-2 text-sm font-semibold text-foreground">
          {inlineMarkdown(block.text)}
        </h3>
      );
    case "blockquote":
      return (
        <blockquote className="border-l-2 border-amber-500/50 bg-amber-500/5 py-2 pl-3 text-xs text-muted-foreground">
          {block.lines.map((line, i) => (
            <p key={i}>{inlineMarkdown(line)}</p>
          ))}
        </blockquote>
      );
    case "code":
      return <CodeSuggestion code={block.text} />;
    case "hr":
      return <hr className="border-border" />;
    case "paragraph":
      return (
        <p className="whitespace-pre-wrap text-muted-foreground">
          {inlineMarkdown(block.text)}
        </p>
      );
  }
}

function inlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-medium text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("_") && part.endsWith("_")) {
      return (
        <em key={index} className="text-muted-foreground">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
