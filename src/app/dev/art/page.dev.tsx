import type { Metadata } from "next";

import { ArtDefs } from "@/art/ArtDefs";
import { DrinkArt } from "@/art/DrinkArt";
import { FoodArt } from "@/art/FoodArt";
import { ItemArt } from "@/art/ItemArt";
import { menu } from "@/content/menu";
import { sectionTheme } from "@/lib/theme";

// Служебная галерея: все позиции на фоне своего раздела, в двух размерах. Из меню сюда ссылок нет.

export const metadata: Metadata = {
  title: "Иллюстрации позиций — служебная страница",
  robots: { index: false, follow: false },
};

const SIZES = [96, 220];

export default function ArtGallery() {
  return (
    <main style={{ background: "#f3eee6", color: "#2a1a10", padding: "24px 16px 48px", minHeight: "100dvh" }}>
      <ArtDefs />
      <h1 style={{ margin: "0 0 4px", fontSize: 22 }}>Иллюстрации позиций</h1>
      <p style={{ margin: "0 0 24px", fontSize: 14, opacity: 0.75 }}>
        {menu.length} позиций на фоне своего раздела, {SIZES.join(" и ")} px. Рисунки собираются из данных меню.
      </p>
      {SIZES.map((size) => (
        <section key={size} id={`grid-${size}`} style={{ marginBottom: 32 }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 16 }}>{size} px</h2>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${size + 28}px, 1fr))`, gap: 8 }}>
            {menu.map((item) => {
              const theme = sectionTheme(item.section);
              return (
                <figure
                  key={item.id}
                  data-item={item.id}
                  style={{
                    margin: 0,
                    padding: "12px 8px 10px",
                    borderRadius: 12,
                    background: `linear-gradient(160deg, ${theme.bg[0]}, ${theme.bg[1]})`,
                    color: theme.ink,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <ItemArt item={item} size={size} />
                  <figcaption style={{ fontSize: 12, lineHeight: 1.25, textAlign: "center" }}>{item.name}</figcaption>
                </figure>
              );
            })}
          </div>
        </section>
      ))}
      <section id="extra">
        <h2 style={{ margin: "0 0 12px", fontSize: 16 }}>Вне меню: стаканчик навынос и неизвестный ингредиент</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {SIZES.map((size) => (
            <figure key={`paper-${size}`} style={{ ...extraTile, background: "#ecd9b8" }}>
              <DrinkArt art={{ type: "drink", vessel: "paper", layers: [{ kind: "espresso", part: 1 }, { kind: "milk", part: 2 }, { kind: "foam", part: 1 }] }} size={size} />
              <figcaption style={{ fontSize: 12 }}>paper, {size} px</figcaption>
            </figure>
          ))}
          {SIZES.map((size) => (
            <figure key={`crumb-${size}`} style={{ ...extraTile, background: "#f3ebdc" }}>
              <FoodArt art={{ type: "food", dish: "plate", ingredients: ["xyz"] }} size={size} />
              <figcaption style={{ fontSize: 12 }}>«xyz» на тарелке, {size} px</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </main>
  );
}

const extraTile = {
  margin: 0,
  padding: "12px 8px 10px",
  borderRadius: 12,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
} as const;
