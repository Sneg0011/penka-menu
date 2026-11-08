"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";

import { sections } from "@/content/sections";

type Props = {
  /** Текущий раздел: он помечен `aria-current`, на него попадает Tab. */
  active: number;
  /** Выбор раздела — тапом, свайпом, колесом или стрелками. */
  onPick: (index: number) => void;
  /**
   * Дробное положение колеса, по умолчанию `active`. Страница передаёт `index + t` из useSectionProgress —
   * колесо поворачивается вместе с прокруткой, а не перескакивает.
   */
  position?: number;
};

const N = sections.length;
/** Масштаб соседа (на шаг от центра) и дальше; центр — 1. */
const NEAR = 0.6;
/** Промежуток между видимыми подписями, px. */
const GAP = 22;
/** Сколько пикселей пальца — один шаг колеса. */
const STEP_PX = 92;
/** Постоянная сглаживания колеса, мс: колесо догоняет цель с лёгкой инерцией. */
const TAU = 90;
/** Кегль центральной подписи; ширины подписей меряются в нём. */
const FONT_PX = 20;

const scaleAt = (d: number) => {
  const a = Math.abs(d);
  return a <= 1 ? 1 - (1 - NEAR) * a : Math.max(0.5, NEAR - (a - 1) * 0.06);
};
// сосед на шаг от центра — 86 % непрозрачности: как pk-muted, текст читается (≥ 4,5 : 1) на фоне любого раздела
const opacityAt = (d: number) => {
  const a = Math.abs(d);
  return a <= 1 ? 1 - 0.14 * a : Math.max(0, 0.86 - (a - 1) * 0.55);
};
const clampIndex = (i: number) => Math.min(N - 1, Math.max(0, i));

/** Ширина подписи до замера: по числу знаков (широкий гротеск ≈ 0,74 кегля на знак). Одинакова на сервере и в браузере. */
const estimate = sections.map((s) => Math.round(s.title.length * FONT_PX * 0.74));

type Slot = { x: number; s: number; o: number };

/**
 * Колесо в положении `p`: центр подписи `i` — `x` от середины, масштаб `s`, прозрачность `o`.
 * Видимые промежутки между подписями одинаковы при любом масштабе.
 */
function layout(p: number, widths: number[]): Slot[] {
  const s = widths.map((_, i) => scaleAt(i - p));
  const xs = [0];
  for (let i = 1; i < N; i++) xs[i] = xs[i - 1] + (widths[i - 1] * s[i - 1] + widths[i] * s[i]) / 2 + GAP;
  const k = clampIndex(Math.floor(p));
  const frac = p - k;
  const camera = k + 1 < N ? xs[k] + (xs[k + 1] - xs[k]) * frac : xs[k] + (xs[k] - (xs[k - 1] ?? xs[k] - 100)) * frac;
  return xs.map((x, i) => ({ x: x - camera, s: s[i], o: opacityAt(i - p) }));
}

/** Кнопка уже подписи не бывает уже 44 px — палец попадает и в мелкого соседа. */
const buttonWidth = (w: number, s: number) => Math.max(44, w * s + 16);
const r2 = (n: number) => Math.round(n * 100) / 100;
const buttonTransform = (slot: Slot, w: number) => `translate3d(${r2(slot.x - buttonWidth(w, slot.s) / 2)}px,0,0)`;
const labelTransform = (slot: Slot) => `scale(${r2(slot.s)})`;

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
const reducedMotion = () => typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Drag = { id: number; x0: number; y0: number; p0: number; moved: boolean; lastX: number; lastT: number; v: number };

/**
 * Липкая карусель разделов-колесо: текущий раздел крупно по центру, соседи мельче уходят в стороны.
 * Свайп и колесо мыши/тачпада поворачивают её и выбирают раздел; тап — выбор; с клавиатуры Tab попадает
 * на текущий, ←/→, Home/End выбирают соседние. Положение рисуется трансформациями в кадре анимации,
 * без перерисовки React.
 */
export function SectionCarousel({ active, onPick, position = active }: Props) {
  const navRef = useRef<HTMLElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const labels = useRef<(HTMLSpanElement | null)[]>([]);
  const widths = useRef<number[]>(estimate);
  const shown = useRef(position);
  const goal = useRef(position);
  const raf = useRef(0);
  const drag = useRef<Drag | null>(null);
  const swallowClick = useRef(false);
  const wheel = useRef<{ timer: ReturnType<typeof setTimeout> | null }>({ timer: null });
  const onPickRef = useRef(onPick);

  useEffect(() => {
    onPickRef.current = onPick;
  });

  // Стили первого кадра (и на сервере) — по оценке ширины; дальше положение пишет apply() напрямую в DOM.
  // React их больше не трогает: значения в разметке не меняются от рендера к рендеру.
  const [initial] = useState(() => layout(position, estimate));

  const apply = (p: number) => {
    const slots = layout(p, widths.current);
    slots.forEach((slot, i) => {
      const button = buttons.current[i];
      const label = labels.current[i];
      if (!button || !label) return;
      const w = widths.current[i];
      button.style.width = `${r2(buttonWidth(w, slot.s))}px`;
      button.style.transform = buttonTransform(slot, w);
      button.style.opacity = String(r2(slot.o));
      // невидимые дальние кнопки не ловят тапы (но остаются для скринридера)
      button.style.pointerEvents = slot.o < 0.05 ? "none" : "";
      label.style.transform = labelTransform(slot);
    });
  };

  const animate = () => {
    cancelAnimationFrame(raf.current);
    if (reducedMotion()) {
      shown.current = goal.current;
      apply(shown.current);
      return;
    }
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const diff = goal.current - shown.current;
      shown.current = Math.abs(diff) < 0.002 ? goal.current : shown.current + diff * (1 - Math.exp(-dt / TAU));
      apply(shown.current);
      raf.current = shown.current === goal.current ? 0 : requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };

  // Замер настоящих ширин подписей (и заново, когда догрузился шрифт)
  useIsomorphicLayoutEffect(() => {
    const measure = () => {
      widths.current = labels.current.map((el, i) => el?.offsetWidth || estimate[i]);
      apply(shown.current);
    };
    measure();
    const ro = new ResizeObserver(measure);
    labels.current.forEach((el) => el && ro.observe(el));
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf.current);
    };
    // apply читает только refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Страница прокрутилась или выбран раздел — колесо догоняет новое положение
  useEffect(() => {
    goal.current = position;
    if (!drag.current?.moved) animate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position]);

  // Фокус клавиатуры следует за выбранным разделом
  useEffect(() => {
    const nav = navRef.current;
    if (nav && nav.contains(document.activeElement) && document.activeElement !== buttons.current[active]) {
      buttons.current[active]?.focus({ preventScroll: true });
    }
  }, [active]);

  const pick = (index: number) => {
    const i = clampIndex(index);
    goal.current = i;
    animate();
    onPickRef.current(i);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    drag.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, p0: shown.current, moved: false, lastX: e.clientX, lastT: e.timeStamp, v: 0 };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    if (!d.moved) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        drag.current = null; // вертикальный жест — это прокрутка страницы
        return;
      }
      if (Math.abs(dx) < 6) return;
      d.moved = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // без захвата жест тоже работает, пока палец над каруселью
      }
      cancelAnimationFrame(raf.current);
    }
    const dt = Math.max(1, e.timeStamp - d.lastT);
    d.v = 0.7 * ((e.clientX - d.lastX) / dt) + 0.3 * d.v;
    d.lastX = e.clientX;
    d.lastT = e.timeStamp;
    // за краями — с сопротивлением
    let p = d.p0 - dx / STEP_PX;
    if (p < 0) p = p / 3;
    if (p > N - 1) p = N - 1 + (p - (N - 1)) / 3;
    shown.current = p;
    apply(p);
  };

  const endDrag = (e: ReactPointerEvent<HTMLElement>, cancelled: boolean) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (!d.moved) return;
    swallowClick.current = true;
    setTimeout(() => (swallowClick.current = false), 350);
    if (cancelled) {
      goal.current = position;
      animate();
      return;
    }
    // бросок: куда колесо докатилось бы за ~140 мс по инерции
    pick(Math.round(shown.current - (d.v * 140) / STEP_PX));
  };

  const onWheel = (e: ReactWheelEvent<HTMLElement>) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    cancelAnimationFrame(raf.current);
    shown.current = Math.min(N - 0.6, Math.max(-0.4, shown.current + e.deltaX / (STEP_PX * 1.5)));
    apply(shown.current);
    if (wheel.current.timer) clearTimeout(wheel.current.timer);
    wheel.current.timer = setTimeout(() => {
      wheel.current.timer = null;
      pick(Math.round(shown.current));
    }, 160);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
    const to = { ArrowRight: active + 1, ArrowLeft: active - 1, Home: 0, End: N - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    pick(to);
  };

  return (
    <nav
      ref={navRef}
      aria-label="Разделы меню"
      className="pk-carousel relative h-[52px] touch-pan-y overflow-hidden select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => endDrag(e, false)}
      onPointerCancel={(e) => endDrag(e, true)}
      onWheel={onWheel}
      onKeyDown={onKeyDown}
      onClickCapture={(e) => {
        if (!swallowClick.current) return;
        swallowClick.current = false;
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {sections.map((s, i) => {
        const slot = initial[i];
        return (
          <button
            key={s.id}
            ref={(el) => {
              buttons.current[i] = el;
            }}
            type="button"
            tabIndex={i === active ? 0 : -1}
            aria-current={i === active ? "true" : undefined}
            onClick={() => pick(i)}
            className="absolute top-0 left-1/2 flex h-full items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-current/50 focus-visible:ring-inset"
            style={{
              width: `${r2(buttonWidth(estimate[i], slot.s))}px`,
              transform: buttonTransform(slot, estimate[i]),
              opacity: r2(slot.o),
              pointerEvents: slot.o < 0.05 ? "none" : undefined,
            }}
          >
            <span
              ref={(el) => {
                labels.current[i] = el;
              }}
              className="font-display block shrink-0 origin-center text-[20px] leading-none font-semibold tracking-[-0.02em] whitespace-nowrap"
              style={{ transform: labelTransform(slot) }}
            >
              {s.title}
            </span>
          </button>
        );
      })}
      <span aria-hidden="true" className="pk-accent-fill absolute bottom-[7px] left-1/2 size-[5px] -translate-x-1/2 rounded-full" />
    </nav>
  );
}
