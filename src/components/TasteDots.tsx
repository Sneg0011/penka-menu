import type { Scale } from "@/content/types";

const MAX = 3;
const STEPS = [1, 2, 3] as const;

type Key = "sweet" | "bitter" | "sour";

/** Порядок и подписи шкал вкуса (шторка позиции). В строке меню вкус словами — tasteWords в lib/facts. */
export const TASTE_SCALES: readonly { key: Key; label: string }[] = [
  { key: "sweet", label: "сладость" },
  { key: "bitter", label: "горечь" },
  { key: "sour", label: "кислинка" },
];

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
