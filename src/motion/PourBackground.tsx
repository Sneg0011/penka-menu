"use client";

import { useEffect, useRef } from "react";

import { sections } from "@/content/sections";
import { canUseRichMotion } from "@/lib/capability";

import { edgeFrom, POUR_SESSION_KEY, pourGradient, pourSections, type PourEdge, type PourStack } from "./pour";
import type { PourFallback, PourRenderer } from "./pourShader";
import { CHROME_ATTR, getSectionProgress, scrollRoot, subscribeSectionProgress } from "./useSectionProgress";

/** Строка меню — кнопка с py-3.5 (ItemRow): текст кончается на 14 px выше её низа. */
const ROW_PAD = 14;
/** Буквы заголовка раздела (Unbounded, межстрочный 0,98) выступают над его рамкой на ~6 px. */
const TITLE_OVERHANG = 6;
/** Видеокарта не потянула перелив — до конца сессии вкладки только CSS-градиент (и после перезагрузки). */
const SLOW_KEY = POUR_SESSION_KEY;

function rememberedSlow(): boolean {
  try {
    return window.sessionStorage.getItem(SLOW_KEY) === "css";
  } catch {
    return false;
  }
}

function rememberSlow() {
  try {
    window.sessionStorage.setItem(SLOW_KEY, "css");
  } catch {
    // хранилище недоступно (приватный режим) — решение живёт до перезагрузки
  }
}

/** `?pour=slow` — проверка сторожа видеокарты: к каждому замеренному кадру прибавляется 30 мс. */
const slowProbe = () => new URLSearchParams(window.location.search).get("pour") === "slow";

type Marks = { el: HTMLElement; title: Element | null; lastRow: Element | null };

/** Разделы, их заголовки и последние строки — разметка не меняется, ищем один раз. */
function findMarks(): Marks[] | null {
  const marks: Marks[] = [];
  for (const s of sections) {
    const el = document.getElementById(s.id);
    if (!el) return null;
    marks.push({ el, title: el.querySelector("h2"), lastRow: el.querySelector("li:last-child") });
  }
  return marks;
}

/**
 * Что сейчас на слое: разделы вокруг текущего и их границы (CSS px от верха слоя — он стоит ровно на экране:
 * окне браузера на телефоне, экране рамки на компьютере). Вызывается из кадра useSectionProgress, когда
 * разметка уже посчитана, — чтение размеров ничего не пересчитывает.
 */
function measure(layer: HTMLElement, marks: Marks[]): PourStack {
  const ids = pourSections(getSectionProgress());
  const top = layer.getBoundingClientRect().top;
  const root = scrollRoot();
  const view = root ? root.clientHeight : window.innerHeight;
  const header = document.querySelector(`[${CHROME_ATTR}]`);
  // та же линия чтения, что у useSectionProgress
  const line = (header ? header.getBoundingClientRect().bottom - top : 0) + 2;
  const edges: PourEdge[] = [];
  for (let k = 1; k < ids.length; k++) {
    const upper = marks[ids[k - 1]];
    const lower = marks[ids[k]];
    const y = lower.el.getBoundingClientRect().top - top;
    const upperText = (upper.lastRow ?? upper.el).getBoundingClientRect().bottom - top - ROW_PAD;
    const lowerText = lower.title ? lower.title.getBoundingClientRect().top - top - TITLE_OVERHANG : y;
    edges.push(edgeFrom({ y, upperText, lowerText, line, view }));
  }
  return { ids, edges, line };
}

/**
 * Фон меню — слой под разделами (у самих разделов фон прозрачный, пока слой работает: `html[data-pour]`).
 * Перелив привязан к прокрутке: у границы двух разделов жидкость нижнего вливается в верхний, к тому моменту,
 * как граница дойдёт до шапки, перелив закончен. Жидкость не заходит туда, где есть текст, — у текста всегда
 * фон его раздела.
 *
 * Сразу (и на слабых устройствах, без WebGL, при «уменьшить движение») — CSS-градиент с мягкой полосой на
 * границе. После `load` и в свободное время, если canUseRichMotion(), отдельным чанком грузится шейдер
 * (pourShader) и рисует настоящую жидкость. Если видеокарта не тянет (сторож в pourShader), шейдер сначала
 * снижает разрешение, потом насовсем уступает CSS-градиенту — тем же путём, что при потере контекста.
 * React здесь только ставит слой: каждый кадр — напрямую, из подписки subscribeSectionProgress,
 * без перерисовки компонентов.
 * `html[data-pour]` — чем рисуется фон: `css` или `gl`.
 */
export function PourBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = ref.current;
    if (!layer) return;
    const html = document.documentElement;
    html.dataset.pour = "css";
    let marks = findMarks();
    let gl: PourRenderer | null = null;
    let painted = "";

    const paint = () => {
      marks ??= findMarks();
      if (!marks) return;
      const stack = measure(layer, marks);
      if (gl) {
        gl.render(stack);
        return;
      }
      const image = pourGradient(stack, layer.clientHeight);
      if (image === painted) return;
      painted = image;
      layer.style.backgroundImage = image;
      layer.style.backgroundColor = sections[getSectionProgress().index].bg[0];
    };

    const unsubscribe = subscribeSectionProgress(paint);
    const resize = new ResizeObserver(paint);
    resize.observe(layer);
    paint();
    // шрифты догрузились — строки и заголовки сдвинулись
    document.fonts?.ready.then(paint).catch(() => {});

    // Шейдер — только после загрузки страницы и в свободное время: первый экран его не ждёт
    let cancelled = false;
    const start = async () => {
      if (cancelled || rememberedSlow() || !(await canUseRichMotion())) return;
      const { createPour } = await import("./pourShader");
      if (cancelled) return;
      // холст уже убран — градиент рисуется в том же задании, пустого кадра нет
      const fallback = (reason: PourFallback) => {
        gl = null;
        painted = "";
        html.dataset.pour = "css";
        if (reason === "slow") rememberSlow();
        paint();
      };
      const renderer = await createPour(layer, fallback, slowProbe() ? { slowMs: 30 } : {});
      if (!renderer) return;
      if (cancelled) {
        renderer.destroy();
        return;
      }
      gl = renderer;
      html.dataset.pour = "gl";
      paint();
    };
    let idleId = 0;
    const hasIdle = typeof window.requestIdleCallback === "function";
    const onLoad = () => {
      idleId = hasIdle ? window.requestIdleCallback(() => void start(), { timeout: 1500 }) : window.setTimeout(() => void start(), 300);
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("load", onLoad);
      if (hasIdle) window.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
      unsubscribe();
      resize.disconnect();
      gl?.destroy();
      gl = null;
      delete html.dataset.pour;
      layer.style.backgroundImage = "";
      layer.style.backgroundColor = "";
    };
  }, []);

  return <div ref={ref} className="pk-pour" data-pour-layer="" aria-hidden="true" />;
}
