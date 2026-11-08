import type { CSSProperties, ReactNode } from "react";

import type { Section } from "@/content/types";
import { mutedInk } from "@/lib/theme";

type Props = {
  /** Тема текущего раздела: фон шапки — его первый цвет, текст — его `ink`. */
  theme: Section;
  /** Ниже строки с названием — обычно карусель разделов. */
  children?: ReactNode;
};

/**
 * Липкая шапка меню: рукописное «Пенка», чип «концепт AVA» и (детьми) карусель разделов.
 * Перекрашивается под текущий раздел: на тёмных разделах светлый текст, на светлых — тёмный
 * (цвета плавно перетекают, при `prefers-reduced-motion` — сразу).
 */
export function Header({ theme, children }: Props) {
  const style = {
    backgroundColor: theme.bg[0],
    color: theme.ink,
    "--ink": theme.ink,
    "--accent": theme.accent,
    "--muted": mutedInk(theme),
  } as CSSProperties;

  return (
    // data-chrome — низ шапки служит линией чтения для useSectionProgress
    <header data-chrome="" data-tone={theme.tone} style={style} className="pk-chrome sticky top-0 z-30">
      <div className="flex h-12 items-center justify-between gap-3 px-4">
        <p className="font-script translate-y-0.5 text-[30px] leading-none">Пенка</p>
        <p className="pk-chip rounded-full px-2.5 py-1 text-[12px] leading-4 font-medium">концепт AVA</p>
      </div>
      {children}
    </header>
  );
}
