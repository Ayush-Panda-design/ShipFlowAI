import { cn } from "@/lib/utils";

type ShipFlowLogoProps = {
  className?: string;
  iconClassName?: string;
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg";
};

const sizeMap = {
  sm: { icon: "size-7", text: "text-base" },
  md: { icon: "size-9", text: "text-lg" },
  lg: { icon: "size-11", text: "text-xl" },
} as const;

export function ShipFlowLogo({
  className,
  iconClassName,
  showWordmark = true,
  size = "md",
}: ShipFlowLogoProps) {
  const sizes = sizeMap[size];

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <ShipFlowMark className={cn(sizes.icon, iconClassName)} />
      {showWordmark ? (
        <span className={cn("font-semibold tracking-tight", sizes.text)}>
          Ship<span className="text-amber-600 dark:text-amber-400">Flow</span>
          <span className="font-normal text-stone-500 dark:text-stone-400"> AI</span>
        </span>
      ) : null}
    </span>
  );
}

export function ShipFlowMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect width="40" height="40" rx="11" className="fill-amber-500/15" />
      <path
        d="M8 26c4-2 8-2 12 0s8 2 12 0"
        className="stroke-amber-600 dark:stroke-amber-400"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M10 29c3-1.5 6-1.5 10 0s7 1.5 10 0"
        className="stroke-emerald-600/70 dark:stroke-emerald-400/70"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M14 22l6-8 6 8H14z"
        className="fill-amber-600 dark:fill-amber-400"
      />
      <path
        d="M20 14v-3M17 11h6"
        className="stroke-emerald-600 dark:stroke-emerald-400"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="28" cy="12" r="3" className="fill-emerald-600 dark:fill-emerald-400" />
      <path
        d="M27 12l1.5 1.5L30 11"
        className="stroke-white"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Dashboard brand tile: a folded paper rocket on burgundy. */
export function ShipFlowGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden>
      <rect width="40" height="40" rx="11" fill="var(--brand)" />
      <rect width="40" height="40" rx="11" fill="url(#sf-glyph-sheen)" />
      <defs>
        <linearGradient id="sf-glyph-sheen" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" stopOpacity="0.22" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M13.5 28.5c-1.2-.2-2.2-1.2-2.4-2.4 1-.2 2.4-.1 3.4.9s1.1 2.4.9 3.4c-.6-.9-1.1-1.6-1.9-1.9z" fill="#E7A66C" />
      <path
        d="M28.8 11.2c-5 .2-9.5 2.6-12.2 6.2l-3.8.6 1.9 3.2 2.2 2.2 3.2 1.9.6-3.8c3.6-2.7 6-7.2 6.2-12.2z"
        fill="#fffaf8"
      />
      <path d="M28.8 11.2L18.6 21.4" stroke="var(--brand)" strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
      <circle cx="24.4" cy="15.6" r="1.7" fill="var(--brand)" />
    </svg>
  );
}
