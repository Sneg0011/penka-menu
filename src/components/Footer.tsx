"use client";

import type { CSSProperties } from "react";

import { sections } from "@/content/sections";
import { scrollToTop } from "@/motion/useSectionProgress";

import { sectionStyle } from "./MenuSection";

/** Постоянная пометка концепта — дословно из Global Constraints, менять только вместе с планом. */
export const CONCEPT_NOTE =
  "Концепт AVA AGENCY для кофейни „Пенка“. Не официальный сайт. Цены — по меню доставки на 4 октября 2026, в зале могут отличаться";

/** Финал меню: название крупно, адрес, пометка концепта и «Наверх». */
export function Footer() {
  return (
    // в цветах первого раздела (эспрессо): меню начинается и заканчивается одним тоном
    <footer style={sectionStyle(sections[0]) as CSSProperties} className="pk-footer px-5 pt-16 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <p className="font-script -ml-1 text-[104px] leading-[0.9]">Пенка</p>
      <p className="mt-5 max-w-[28ch] text-[16px] leading-6">Челябинск, проспект Ленина, 54, подъезд&nbsp;5</p>
      <p className="pk-muted mt-8 text-[13px] leading-5">{CONCEPT_NOTE}</p>
      <button
        type="button"
        onClick={() => void scrollToTop()}
        className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-full bg-current/10 px-5 text-[15px] font-medium outline-none hover:bg-current/15 active:bg-current/20 focus-visible:ring-2 focus-visible:ring-current/50"
      >
        <svg aria-hidden="true" viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 10.5V1.5M2 5.5l4-4 4 4" />
        </svg>
        Наверх
      </button>
    </footer>
  );
}
