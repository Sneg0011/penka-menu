"use client";

import { useId } from "react";

import { ItemArt } from "@/art/ItemArt";
import { habits, reviews } from "@/content/habits";
import { menu } from "@/content/menu";
import type { Item } from "@/content/types";
import { habitLead, isPriceApprox, sizeKind, sizeText } from "@/lib/facts";
import { pairsFor } from "@/lib/pairs";
import { formatPrice } from "@/lib/price";
import { sectionTheme } from "@/lib/theme";

import { AllergenChips } from "./AllergenChips";
import { Sheet } from "./Sheet";
import { Dots, StrengthBars, TASTE_SCALES } from "./TasteDots";

type Props = {
  /** Что показать; `null` — шторка закрыта и ничего не рисует. */
  itemId: string | null;
  onClose: () => void;
  /** Тап по позиции в «Часто берут вместе»: родитель показывает ту позицию. */
  onOpenItem: (id: string) => void;
};

/** Пометка у демо-данных: отзывы и «берут вместе» придуманы для концепта. */
function ExampleTag() {
  return <span className="pk-accent ml-2 rounded-full px-2 py-px align-middle text-[11px] font-medium leading-4 ring-1 ring-inset ring-current/35">пример</span>;
}

/** Рисунок на фоне своего раздела: рисунки подобраны под эти цвета. */
const tileStyle = (item: Item) => {
  const { bg, ink } = sectionTheme(item.section);
  return { background: `linear-gradient(160deg, ${bg[0]}, ${bg[1]})`, color: ink };
};

/** Шторка с полной карточкой: рисунок, цена, состав, вкус и аллергены с подписями, отзывы по привычкам, пары. */
export function ItemSheet({ itemId, onClose, onOpenItem }: Props) {
  const titleId = useId();
  const item = itemId === null ? undefined : menu.find((i) => i.id === itemId);
  return (
    <Sheet open={item !== undefined} onClose={onClose} labelledBy={titleId} resetKey={item?.id ?? null}>
      {item && <Body item={item} titleId={titleId} onOpenItem={onOpenItem} />}
    </Sheet>
  );
}

function Body({ item, titleId, onOpenItem }: { item: Item; titleId: string; onOpenItem: (id: string) => void }) {
  const uid = useId();
  const factsId = `${uid}-facts`;
  const reviewsId = `${uid}-reviews`;
  const pairsId = `${uid}-pairs`;

  // отзывы по привычкам в порядке привычек; у позиции без отзывов блока нет
  const groups = habits
    .map((habit) => ({ habit, nuances: reviews.filter((r) => r.item === item.id && r.habit === habit.id).map((r) => r.nuance) }))
    .filter((g) => g.nuances.length > 0);
  const picks = pairsFor(item.id);

  return (
    <div className="flex flex-col gap-6 pt-1">
      <div className="grid place-items-center rounded-[20px] py-5" style={tileStyle(item)}>
        <ItemArt item={item} size={220} className="block" />
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id={titleId} className="text-[20px] leading-tight font-semibold [overflow-wrap:anywhere]">
            {item.name}
          </h2>
          <p className="pk-muted mt-1 text-[14px]">{`${sizeKind(item)} ${sizeText(item)}`}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end text-right">
          <p className="text-[20px] leading-tight font-semibold whitespace-nowrap tabular-nums">{formatPrice(item)}</p>
          {isPriceApprox(item) && <p className="pk-muted text-[12px] leading-4">примерно</p>}
        </div>
      </div>

      <p className="text-[15px] leading-relaxed">{item.text}</p>

      <section aria-labelledby={factsId}>
        <h3 id={factsId} className="pk-muted mb-3 text-[12px] font-semibold tracking-wide uppercase">
          Вкус, калории и аллергены — примерно
        </h3>
        <dl className="grid grid-cols-[6.5rem_1fr] items-center gap-x-4 gap-y-2.5 text-[14px]">
          {item.taste &&
            TASTE_SCALES.map(({ key, label }) => (
              <Row key={key} term={label[0].toUpperCase() + label.slice(1)}>
                <Dots value={item.taste![key]} label={label} size="md" />
              </Row>
            ))}
          {item.strength !== undefined && (
            <Row term="Крепость">
              <StrengthBars value={item.strength} size="md" />
            </Row>
          )}
          <Row term="Калории">{`${item.kcal} ккал`}</Row>
          <Row term="Аллергены">
            {item.allergens.length > 0 || item.plantMilk ? (
              <AllergenChips allergens={item.allergens} plantMilk={item.plantMilk} size="md" />
            ) : (
              <span className="pk-muted">основных нет</span>
            )}
          </Row>
        </dl>
      </section>

      {groups.length > 0 && (
        <section aria-labelledby={reviewsId}>
          <h3 id={reviewsId} className="mb-3 text-[17px] font-semibold">
            Отзывы
            <ExampleTag />
          </h3>
          <div className="flex flex-col gap-4">
            {groups.map(({ habit, nuances }) => (
              <div key={habit.id}>
                <p className="mb-1.5 text-[14px] font-semibold">{`${habitLead(habit)}:`}</p>
                <ul className="flex flex-col gap-2">
                  {nuances.map((nuance) => (
                    <li key={nuance} className="border-l-2 border-current/15 pl-3 text-[14px] leading-snug">
                      {nuance}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {picks.length > 0 && (
        <section aria-labelledby={pairsId}>
          <h3 id={pairsId} className="mb-2 text-[17px] font-semibold">
            Часто берут вместе
            <ExampleTag />
          </h3>
          <ul className="-mx-2 flex flex-col">
            {picks.map(({ item: other, share }) => (
              <li key={other.id}>
                <button
                  type="button"
                  onClick={() => onOpenItem(other.id)}
                  className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-2 py-1.5 text-left outline-none hover:bg-current/[0.05] active:bg-current/[0.08] focus-visible:ring-2 focus-visible:ring-current/45"
                >
                  <span className="grid shrink-0 place-items-center rounded-xl" style={tileStyle(other)}>
                    <ItemArt item={other} size={52} className="block" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] leading-snug font-semibold">{other.name}</span>
                    <span className="pk-muted block text-[12px] leading-4">{`${formatPrice(other)} · в ${Math.round(share * 100)}% чеков`}</span>
                  </span>
                  <svg aria-hidden="true" viewBox="0 0 8 14" width="8" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="pk-muted shrink-0">
                    <path d="M1 1l6 6-6 6" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="pk-muted">{term}</dt>
      <dd className="m-0">{children}</dd>
    </>
  );
}
