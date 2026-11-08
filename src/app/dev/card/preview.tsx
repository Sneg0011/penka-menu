"use client";

import { useState, type CSSProperties } from "react";

import { ArtDefs } from "@/art/ArtDefs";
import { ItemRow } from "@/components/ItemRow";
import { ItemSheet } from "@/components/ItemSheet";
import { menu } from "@/content/menu";
import type { SectionId } from "@/content/types";
import { sectionTheme } from "@/lib/theme";

// Блоки по 360 px: раздел, позиции (среди них самые длинные названия) и задаёт ли раздел --accent (--muted не задаём:
// так видно запасной приглушённый цвет, на который и рассчитывать странице). Последний блок — всё меню разом для проверки.
const BLOCKS: { id: string; section: SectionId; items: string[]; themed: boolean }[] = [
  { id: "coffee", section: "coffee", items: ["cappuccino", "espresso", "latte", "flat-white"], themed: true },
  { id: "raf", section: "raf", items: ["raf-pistachio", "latte-salted-caramel"], themed: true },
  { id: "cold", section: "cold", items: ["mors-cranberry", "fresh-orange"], themed: true },
  { id: "waffles", section: "waffles", items: ["waffle-spinach-trout", "waffle-viennese", "syrniki-berry"], themed: true },
  { id: "pasta", section: "pasta", items: ["penne-chicken-mushrooms", "carbonara"], themed: true },
  { id: "breakfast", section: "breakfast", items: ["millet-pumpkin", "breakfast-lord"], themed: true },
  // раздел не задал свои переменные: акцент и приглушённый цвет считаются от цвета текста
  { id: "fallback-dark", section: "coffee", items: ["latte", "tea-green"], themed: false },
  { id: "fallback-light", section: "desserts", items: ["croissant-napoleon", "macaron"], themed: false },
];

export function CardPreview() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <main style={{ background: "#d9d2c8", minHeight: "100dvh", padding: "16px 0 48px" }}>
      <ArtDefs />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center" }}>
        {BLOCKS.map((block) => {
          const theme = sectionTheme(block.section);
          const style: CSSProperties = {
            width: 360,
            background: `linear-gradient(160deg, ${theme.bg[0]}, ${theme.bg[1]})`,
            color: theme.ink,
          };
          if (block.themed) {
            Object.assign(style, { "--accent": theme.accent });
          }
          return (
            <section key={block.id} id={`block-${block.id}`} style={style} className="divide-y divide-current/10">
              {block.items.map((id) => (
                <ItemRow key={id} item={menu.find((i) => i.id === id)!} onOpen={setOpenId} />
              ))}
            </section>
          );
        })}
      </div>
      <section
        id="all-items"
        aria-label="Всё меню"
        style={{ width: 360, margin: "16px auto 0", background: "#f3eee6", color: "#2a1a10" }}
        className="divide-y divide-current/10"
      >
        {menu.map((item) => (
          <ItemRow key={item.id} item={item} onOpen={setOpenId} />
        ))}
      </section>
      <ItemSheet itemId={openId} onClose={() => setOpenId(null)} onOpenItem={setOpenId} />
    </main>
  );
}
