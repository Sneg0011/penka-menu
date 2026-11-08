"use client";

import { useSyncExternalStore } from "react";

import { sections } from "@/content/sections";

/**
 * Где читатель в меню: `index` — текущий раздел, `next` — следующий (на последнем разделе равен `index`),
 * `t` — доля перехода от `index` к `next`, 0…1. `index + t` непрерывно растёт с прокруткой — по нему
 * крутится карусель и (Task 7) течёт перелив фона.
 */
export type SectionProgress = { index: number; next: number; t: number };

const LAST = sections.length - 1;
const INITIAL: SectionProgress = { index: 0, next: Math.min(1, LAST), t: 0 };

/**
 * Когда есть рамка телефона: окно не уже 768 px И не ниже 600 px (телефон в альбомной ориентации — 844 × 390 —
 * остаётся обычной страницей, иначе вышел бы «телефон в телефоне»). То же условие стоит в globals.css
 * (`@media (min-width: 768px) and (min-height: 600px)`) — менять вместе.
 */
export const FRAME_QUERY = "(min-width: 768px) and (min-height: 600px)";

/** Атрибут окна прокрутки: в рамке телефона прокручивается он, на телефоне — сама страница. */
export const SCROLL_ROOT_ATTR = "data-scroll-root";
/** Атрибут липкой шапки: её низ — линия чтения. */
export const CHROME_ATTR = "data-chrome";

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/**
 * Чистый расчёт прогресса.
 * `tops` — верх каждого раздела относительно верха окна прокрутки (в px, по порядку разделов),
 * `line` — линия чтения (низ липкой шапки), `viewport` — высота окна.
 *
 * Текущий — последний раздел, верх которого дошёл до линии чтения (до первого раздела — первый).
 * Переход к следующему идёт, пока верх следующего поднимается от низа окна к линии чтения; у короткого
 * раздела зона перехода — его собственная высота. Поэтому в момент смены раздела `t` нового равен 0,
 * и `index + t` не прыгает.
 */
export function progressFrom(tops: number[], line: number, viewport: number): SectionProgress {
  const last = tops.length - 1;
  if (last < 0) return { index: 0, next: 0, t: 0 };
  let index = 0;
  for (let i = 0; i <= last; i++) if (tops[i] <= line) index = i;
  if (index === last) return { index, next: index, t: 0 };
  const next = index + 1;
  const zone = Math.max(1, Math.min(viewport - line, tops[next] - tops[index]));
  const t = clamp01((line + zone - tops[next]) / zone);
  return { index, next, t: Math.round(t * 1000) / 1000 };
}

/** Окно прокрутки: элемент `[data-scroll-root]`, если он сам прокручивается (рамка телефона), иначе `null` — страница. */
export function scrollRoot(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const el = document.querySelector<HTMLElement>(`[${SCROLL_ROOT_ATTR}]`);
  if (!el) return null;
  const overflow = getComputedStyle(el).overflowY;
  return overflow === "auto" || overflow === "scroll" ? el : null;
}

function measure(): SectionProgress {
  const root = scrollRoot();
  const top = root ? root.getBoundingClientRect().top : 0;
  const viewport = root ? root.clientHeight : window.innerHeight;
  const chrome = document.querySelector(`[${CHROME_ATTR}]`);
  // +2 px: после прокрутки «к разделу» его верх стоит ровно на линии, дробные пиксели не должны его отпускать
  const line = (chrome ? chrome.getBoundingClientRect().bottom - top : 0) + 2;
  const tops: number[] = [];
  for (const s of sections) {
    const el = document.getElementById(s.id);
    if (!el) return INITIAL;
    tops.push(el.getBoundingClientRect().top - top);
  }
  return progressFrom(tops, line, viewport);
}

// ── Общее хранилище: один набор слушателей на всех подписчиков ──

let snapshot = INITIAL;
const listeners = new Set<() => void>();
let detach: (() => void) | null = null;
let frame = 0;

function update() {
  frame = 0;
  const p = measure();
  if (p.index === snapshot.index && p.next === snapshot.next && p.t === snapshot.t) return;
  snapshot = p;
  listeners.forEach((fn) => fn());
}

function schedule() {
  if (frame) return;
  frame = typeof requestAnimationFrame === "function" ? requestAnimationFrame(update) : (setTimeout(update, 16) as unknown as number);
}

function attach() {
  let root = scrollRoot();
  const target: HTMLElement | Window = root ?? window;
  target.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  // выход за границы рамки (ширина 768 px, высота 600 px) переключает окно прокрутки (рамка телефона ↔ страница)
  const wide = window.matchMedia(FRAME_QUERY);
  const onWide = () => {
    if (scrollRoot() === root) return;
    detachAll();
    root = scrollRoot();
    detach = attach();
    schedule();
  };
  wide.addEventListener?.("change", onWide);
  // высота разделов меняется (шрифты догрузились) — пересчитать без прокрутки
  const ro = new ResizeObserver(schedule);
  sections.forEach((s) => {
    const el = document.getElementById(s.id);
    if (el) ro.observe(el);
  });
  document.fonts?.ready.then(schedule).catch(() => {});
  schedule();
  return () => {
    target.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    wide.removeEventListener?.("change", onWide);
    ro.disconnect();
  };
}

function detachAll() {
  detach?.();
  detach = null;
}

/** Подписка без React (рендер-цикл фона в Task 7): колбэк зовётся при каждом изменении прогресса. */
export function subscribeSectionProgress(fn: () => void): () => void {
  listeners.add(fn);
  if (!detach && typeof window !== "undefined") detach = attach();
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0) detachAll();
  };
}

/** Текущий прогресс без подписки. */
export function getSectionProgress(): SectionProgress {
  return snapshot;
}

const serverSnapshot = () => INITIAL;

/**
 * Прогресс прокрутки по разделам. На сервере и при гидратации — первый раздел, `t = 0`; дальше считается
 * по прокрутке (раз в кадр). Работает и в рамке телефона, и на странице.
 */
export function useSectionProgress(): SectionProgress {
  return useSyncExternalStore(subscribeSectionProgress, getSectionProgress, serverSnapshot);
}

const prefersReducedMotion = () => typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Ждёт конца прокрутки окна: 140 мс без событий `scroll` (или `scrollend`), не дольше `limit`. */
function scrollSettled(target: HTMLElement | Window, limit = 3000): Promise<void> {
  return new Promise((resolve) => {
    let quiet: ReturnType<typeof setTimeout>;
    const done = () => {
      clearTimeout(quiet);
      clearTimeout(cap);
      target.removeEventListener("scroll", onScroll);
      target.removeEventListener("scrollend", done);
      resolve();
    };
    const onScroll = () => {
      clearTimeout(quiet);
      quiet = setTimeout(done, 140);
    };
    const cap = setTimeout(done, limit);
    target.addEventListener("scroll", onScroll, { passive: true });
    target.addEventListener("scrollend", done);
    onScroll();
  });
}

/**
 * Прокрутка к разделу по id: плавно, а при `prefers-reduced-motion` — сразу. Отступ под липкую шапку —
 * `scroll-margin-top` у раздела. Обещание выполняется, когда прокрутка остановилась.
 */
export function scrollToSection(id: string): Promise<void> {
  const el = typeof document === "undefined" ? null : document.getElementById(id);
  if (!el) return Promise.resolve();
  const settled = scrollSettled(scrollRoot() ?? window);
  el.scrollIntoView?.({ behavior: prefersReducedMotion() ? "instant" : "smooth", block: "start" });
  return settled;
}

/** Прокрутка в самое начало меню (кнопка «Наверх» в футере). */
export function scrollToTop(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const root = scrollRoot();
  const settled = scrollSettled(root ?? window);
  const behavior: ScrollBehavior = prefersReducedMotion() ? "instant" : "smooth";
  if (root) root.scrollTo?.({ top: 0, behavior });
  else window.scrollTo?.({ top: 0, behavior });
  return settled;
}
