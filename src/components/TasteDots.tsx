import type { Item, Scale } from "@/content/types";

const MAX = 3;
const STEPS = [1, 2, 3] as const;

type Key = "sweet" | "bitter" | "sour";

/** Порядок и подписи шкал вкуса. Подпись нужна скринридеру и шторке; в строке различают значки. */
export const TASTE_SCALES: readonly { key: Key; label: string }[] = [
  { key: "sweet", label: "сладость" },
  { key: "bitter", label: "горечь" },
  { key: "sour", label: "кислинка" },
];

/** Рисунок-ориентир для шкалы: кубик сахара, зерно, долька лимона. 10×10, линия цвета текста. */
const GLYPH: Record<Key, string> = {
  sweet: "M5 1 8.6 3v4L5 9 1.4 7V3ZM1.4 3 5 5 8.6 3M5 5v4",
  bitter: "M5 1.2c2.3 0 3.6 1.7 3.6 3.8S7.3 8.8 5 8.8 1.4 7.1 1.4 5 2.7 1.2 5 1.2ZM5.2 1.6C3.8 3 6.2 4.6 4.8 8.4",
  sour: "M5 1.2a3.8 3.8 0 1 1 0 7.6 3.8 3.8 0 0 1 0-7.6ZM5 1.6v6.8M1.8 3.2l6.4 3.6M8.2 3.2 1.8 6.8",
};

function Glyph({ kind }: { kind: Key }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 10 10" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round" strokeLinecap="round" className="shrink-0">
      <path d={GLYPH[kind]} />
    </svg>
  );
}

/** Три точки: закрашено `value` из трёх. Подпись для скринридера: «сладость 2 из 3». */
export function Dots({ value, label, size = "sm" }: { value: Scale; label: string; size?: "sm" | "md" }) {
  const dot = size === "md" ? "size-2" : "size-[5px]";
  return (
    <span role="img" aria-label={`${label} ${value} из ${MAX}`} className="inline-flex items-center gap-[3px]">
      {STEPS.map((n) => (
        <span key={n} aria-hidden="true" className={`${dot} rounded-full ${n <= value ? "pk-accent-fill" : "bg-current/20"}`} />
      ))}
    </span>
  );
}

/** Крепость: три столбика растущей высоты, закрашено `value` из трёх. */
export function StrengthBars({ value, size = "sm" }: { value: Scale; size?: "sm" | "md" }) {
  const heights = size === "md" ? ["h-2", "h-3", "h-4"] : ["h-1", "h-[7px]", "h-[10px]"];
  const width = size === "md" ? "w-1" : "w-[3px]";
  return (
    <span role="img" aria-label={`крепость ${value} из ${MAX}`} className="inline-flex items-end gap-[2px]">
      {STEPS.map((n) => (
        <span key={n} aria-hidden="true" className={`${width} ${heights[n - 1]} rounded-[1px] ${n <= value ? "pk-accent-fill" : "bg-current/20"}`} />
      ))}
    </span>
  );
}

/** Вкус одной строкой: значок шкалы и три точки; для сладости, горечи и кислинки. */
export function TasteDots({ taste }: { taste: NonNullable<Item["taste"]> }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      {TASTE_SCALES.map(({ key, label }) => (
        <span key={key} className="inline-flex items-center gap-1">
          <Glyph kind={key} />
          <Dots value={taste[key]} label={label} />
        </span>
      ))}
    </span>
  );
}
