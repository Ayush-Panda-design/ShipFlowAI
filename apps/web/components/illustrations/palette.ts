/** Illustration palette — resolves to CSS variables so art adapts to light/dark. */
export const ill = {
  ink: "var(--ill-ink)",
  card: "var(--ill-card)",
  cream: "var(--ill-cream)",
  peach: "var(--ill-peach)",
  peachSoft: "var(--ill-peach-soft)",
  rose: "var(--ill-rose)",
  burgundy: "var(--ill-burgundy)",
  amber: "var(--ill-amber)",
  blue: "var(--ill-blue)",
  blueSoft: "var(--ill-blue-soft)",
  green: "var(--ill-green)",
  line: "var(--ill-line)",
} as const;

/** Shared stroke weight so every illustration reads as one family. */
export const STROKE = 1.75;
