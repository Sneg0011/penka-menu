"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onClose: () => void;
  /** id заголовка внутри `children`: по нему шторка получает имя для скринридера. */
  labelledBy?: string;
  /** Имя шторки, если заголовка внутри нет. */
  label?: string;
  /**
   * Меняется, пока шторка открыта (в ней показали другую позицию): прокрутка уходит
   * наверх, а фокус возвращается на шторку — кнопка, по которой нажали, исчезла из разметки.
   */
  resetKey?: string | number | null;
  children: ReactNode;
};

/** Палитра шторки по умолчанию (бумажный фон): её контраст проверяет tests/item.test.tsx. */
export const SHEET_PALETTE = { bg: "#fbf6ee", ink: "#2a1a10", muted: "#7a6552", accent: "#8a4a1c" } as const;

/** Сколько пикселей надо протянуть вниз, чтобы шторка закрылась. */
const SWIPE_CLOSE_PX = 80;

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Шторок может быть две сразу (подборка по привычке и поверх неё карточка), поэтому состояние общее:
// стопка открытых — Escape слушается только верхняя; счётчик блокировок — прокрутка
// возвращается к исходному значению, когда закрылась последняя, в каком бы порядке их ни закрыли.
const openStack: object[] = [];
let scrollLocks = 0;
let overflowBeforeLock = "";

function lockScroll() {
  if (scrollLocks++ === 0) {
    overflowBeforeLock = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
}

function unlockScroll() {
  if (--scrollLocks === 0) document.body.style.overflow = overflowBeforeLock;
}

const noSubscription = () => () => {};

/**
 * Шторка снизу: диалог поверх страницы. Закрывается по Escape, тапу по подложке, кнопке «Закрыть»
 * и свайпу вниз за верхнюю полоску. Пока открыта, страница не прокручивается; фокус уходит внутрь и
 * при закрытии возвращается туда, откуда пришёл, Tab не выходит за её пределы. Рисуется в `document.body`
 * и только на клиенте. Цвета — `--sheet-bg`, `--sheet-ink`, `--muted`, `--accent`; при `prefers-reduced-motion` без анимации.
 */
export function Sheet({ open, onClose, labelledBy, label, resetKey, children }: Props) {
  // На сервере и при гидратации — false: портал в document.body появляется только на клиенте.
  const isClient = useSyncExternalStore(noSubscription, () => true, () => false);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const startY = useRef<number | null>(null);
  const previousKey = useRef(resetKey);
  // null — не тянут; число — на сколько пикселей шторку утянули вниз
  const [dragY, setDragY] = useState<number | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open || !isClient) return;
    const token = {};
    openStack.push(token);
    lockScroll();
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus({ preventScroll: true });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && openStack[openStack.length - 1] === token) onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      openStack.splice(openStack.indexOf(token), 1);
      unlockScroll();
      if (opener && opener !== document.body && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, [open, isClient]);

  useEffect(() => {
    const changed = previousKey.current !== resetKey;
    previousKey.current = resetKey;
    if (!open || !changed) return;
    if (scrollerRef.current) scrollerRef.current.scrollTop = 0;
    panelRef.current?.focus({ preventScroll: true });
  }, [resetKey, open]);

  if (!open || !isClient) return null;

  const onGrabberDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    startY.current = e.clientY;
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // жест без захвата указателя тоже работает, пока палец над полоской
    }
    setDragY(0);
  };

  const onGrabberMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (startY.current === null) return;
    setDragY(Math.max(0, e.clientY - startY.current));
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const from = startY.current;
    startY.current = null;
    setDragY(null);
    if (!cancelled && from !== null && e.clientY - from >= SWIPE_CLOSE_PX) onClose();
  };

  // Tab ходит по кругу внутри шторки
  const onPanelKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (items.length === 0) {
      e.preventDefault();
      panel.focus();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === panel)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const panelStyle = {
    backgroundColor: `var(--sheet-bg, ${SHEET_PALETTE.bg})`,
    color: `var(--sheet-ink, ${SHEET_PALETTE.ink})`,
    "--muted": SHEET_PALETTE.muted,
    "--accent": SHEET_PALETTE.accent,
    transform: dragY ? `translateY(${dragY}px)` : undefined,
  } as CSSProperties;

  // data-sheet="root": с компьютера globals.css сажает шторку поверх экрана телефона (PhoneFrame)
  return createPortal(
    <div data-sheet="root" className="fixed inset-0 z-50">
      <div
        data-sheet="backdrop"
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-[rgb(24_12_5/0.55)] motion-safe:animate-[pk-fade-in_0.2s_ease-out]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : (label ?? "Подробности")}
        tabIndex={-1}
        onKeyDown={onPanelKeyDown}
        data-dragging={dragY === null ? undefined : ""}
        style={panelStyle}
        className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[88vh] w-full max-w-[480px] flex-col rounded-t-[22px] shadow-[0_-14px_44px_-10px_rgb(40_20_8/0.4)] outline-none supports-[height:1dvh]:max-h-[88dvh] motion-safe:animate-[pk-sheet-in_0.3s_cubic-bezier(0.2,0.8,0.2,1)] motion-safe:transition-transform motion-safe:duration-200 motion-safe:data-[dragging]:transition-none"
      >
        <div className="relative h-11 shrink-0">
          <div
            data-sheet="grabber"
            onPointerDown={onGrabberDown}
            onPointerMove={onGrabberMove}
            onPointerUp={(e) => endDrag(e, false)}
            onPointerCancel={(e) => endDrag(e, true)}
            className="absolute inset-0 flex cursor-grab touch-none items-center justify-center select-none active:cursor-grabbing"
          >
            <span aria-hidden="true" className="h-1 w-10 rounded-full bg-current/20" />
          </div>
          <button
            type="button"
            aria-label="Закрыть"
            onClick={onClose}
            className="pk-muted absolute top-0 right-1 z-10 grid size-11 place-items-center rounded-full outline-none hover:bg-current/10 focus-visible:ring-2 focus-visible:ring-current/45"
          >
            <svg aria-hidden="true" viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M2 2l10 10M12 2 2 12" />
            </svg>
          </button>
        </div>
        <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
