import type { Allergen } from "@/content/types";
import { ALLERGEN_LABEL } from "@/lib/facts";

type Props = {
  allergens: readonly Allergen[];
  /** Можно приготовить на растительном молоке: отдельная метка после аллергенов. */
  plantMilk?: boolean;
  /** `sm` — в строке меню, `md` — в шторке. */
  size?: "sm" | "md";
};

/** Аллергены короткими чипами и метка «можно на растительном». Нечего показывать — ничего не рисует. */
export function AllergenChips({ allergens, plantMilk, size = "sm" }: Props) {
  if (allergens.length === 0 && !plantMilk) return null;
  const text = size === "md" ? "text-[13px] px-2.5 py-0.5" : "text-[11px] px-2 py-px";
  return (
    <span className="flex flex-wrap items-center gap-1">
      {allergens.map((a) => (
        <span key={a} className={`pk-chip rounded-full leading-4 ${text}`}>
          {ALLERGEN_LABEL[a]}
        </span>
      ))}
      {plantMilk && (
        <span className={`pk-accent rounded-full leading-4 ring-1 ring-inset ring-current/35 ${text}`}>можно на растительном</span>
      )}
    </span>
  );
}
