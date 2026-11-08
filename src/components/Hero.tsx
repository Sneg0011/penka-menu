"use client";

import dynamic from "next/dynamic";
import { memo, useEffect, useRef, useState, type CSSProperties } from "react";

import { sections } from "@/content/sections";
import { canUseRichMotion } from "@/lib/capability";
import { CupFallback } from "@/motion/CupFallback";
import { CUP_START_DELAY_MS, CUP_VIEW, readPourVerdict, shouldLoadCup3D } from "@/motion/hero";

import { HabitPicker } from "./HabitPicker";
import { sectionStyle } from "./MenuSection";

// three.js и сам 3D-стаканчик — отдельным чанком: его не грузят ни слабые телефоны, ни первый экран
const Cup3D = dynamic(() => import("@/motion/Cup3D"), { ssr: false });

/**
 * Можно ли подменить рисунок на 3D: решается один раз — через CUP_START_DELAY_MS после `load` и в свободное время
 * (первый экран его не ждёт), по canUseRichMotion() и вердикту сторожа перелива на эту вкладку (`pk-pour`).
 */
function useCup3D(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      const rich = await canUseRichMotion();
      if (!cancelled && shouldLoadCup3D(rich, readPourVerdict(() => window.sessionStorage))) setOn(true);
    };
    let delayId = 0;
    let idleId = 0;
    const hasIdle = typeof window.requestIdleCallback === "function";
    const onLoad = () => {
      delayId = window.setTimeout(() => {
        idleId = hasIdle ? window.requestIdleCallback(() => void start(), { timeout: 1500 }) : window.setTimeout(() => void start(), 300);
      }, CUP_START_DELAY_MS);
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", onLoad);
      window.clearTimeout(delayId);
      if (hasIdle) window.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
    };
  }, []);
  return on;
}

/**
 * Рамка стаканчика: SVG-рисунок есть всегда (статическая разметка), 3D ложится холстом точно поверх него
 * и проявляется, когда нарисовало первый кадр (`data-cup-mode`: `svg` → `3d`, ставит Cup3D).
 * Для скринридера — картинка без смысла: всё сказано текстом рядом.
 */
function Cup() {
  const box = useRef<HTMLDivElement>(null);
  const rich = useCup3D();
  return (
    <div ref={box} className="pk-cup" data-cup-box="" data-cup-mode="svg" aria-hidden="true">
      <CupFallback />
      {rich && <Cup3D box={box} />}
    </div>
  );
}

/** Пропорции рамки стаканчика — из общего вида SVG и 3D (hero.ts): высота, донышко и низ для вёрстки на 1 px ширины. */
const CUP_ROW = {
  "--cup-h": CUP_VIEW.height / CUP_VIEW.width,
  "--cup-base": CUP_VIEW.baseY / CUP_VIEW.width,
  "--cup-layout": CUP_VIEW.layoutBottom / CUP_VIEW.width,
} as CSSProperties;

/**
 * Первый экран над разделами: название, вход «Что вы обычно пьёте?», под ним — картонный стаканчик «Пенки»
 * с подсказкой и адресом. Стаканчик стоит последним, прямо над меню: листаешь — он делает оборот,
 * потом наклоняется и «наливает» в раздел «Кофе» под ним. Всё, кроме 3D, есть в статической разметке.
 * Мемоизирован: перерисовывается только вместе с новым `onPickHabit` (выбранная привычка живёт в HabitPicker).
 */
export const Hero = memo(function Hero({ onPickHabit }: { onPickHabit: (habitId: string) => void }) {
  return (
    <div className="pk-intro px-5 pt-7" style={sectionStyle(sections[0]) as CSSProperties}>
      <h1 className="relative inline-block">
        <span className="pk-hero font-display block font-extrabold">Пенка</span>
        <span aria-hidden="true" className="pk-note font-script absolute right-[-0.1em] bottom-[-0.38em] text-[56px] leading-none">
          меню
        </span>
        <span className="sr-only"> — меню кофейни</span>
      </h1>
      <div className="mt-9">
        <HabitPicker onPick={onPickHabit} />
      </div>
      <div className="pk-cup-row" style={CUP_ROW}>
        <div className="pk-cup-caption">
          <p className="text-[15px] leading-[1.45]">Нажмите на позицию&nbsp;— покажем состав, вкус, крепость и что к ней обычно берут.</p>
          <p className="pk-muted mt-3 text-[13px] leading-[1.4]">Челябинск, проспект Ленина, 54, подъезд&nbsp;5</p>
        </div>
        <Cup />
      </div>
    </div>
  );
});
