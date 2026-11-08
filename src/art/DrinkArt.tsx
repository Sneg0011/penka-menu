import type { ReactNode } from "react";

import type { Art, Layer, Vessel } from "@/content/types";
import { mixColor } from "@/lib/theme";

import { Use, between, f, f2, rand, svgProps, useArtIds } from "./shared";

export type DrinkArtData = Extract<Art, { type: "drink" }>;

type Props = {
  art: DrinkArtData;
  /** Сторона квадрата в px. */
  size: number;
  /** Объём порции в мл: маленькая порция — посуда меньше и налита не доверху. */
  volume?: number;
  className?: string;
};

// Вид сбоку, свет сверху-слева. Посуда задаётся профилем: полуширина по высоте (t = 0 — верх, 1 — низ).
// Сама посуда (стекло, блюдце, ручка, крышка) неизменна и лежит спрайтами в <ArtDefs />;
// здесь рисуется только то, что зависит от рецепта: слои, переходы, поверхность, лёд, трубочка.

type Profile = { top: number; bottom: number; hw: (t: number) => number; curved?: boolean };

type Spec = {
  cx: number;
  /** Точка опоры: вокруг неё посуда уменьшается под малый объём. */
  base: number;
  nominal: number;
  maxFill: number;
  inner: Profile;
  outer: Profile;
  shadow: { cy: number; rx: number; ry: number };
};

const round = (k: number, w0: number, w1: number) => (t: number) => w1 + (w0 - w1) * Math.pow(1 - Math.pow(t, k), 1 / k);
const linear = (w0: number, w1: number) => (t: number) => w0 + (w1 - w0) * t;
const oval = (w: number) => (t: number) => w * Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2));

const VESSELS: Record<Vessel, Spec> = {
  cup: {
    cx: 45, base: 84, nominal: 250, maxFill: 0.9,
    inner: { top: 36, bottom: 77.6, hw: round(2.4, 23.2, 8), curved: true },
    outer: { top: 36, bottom: 80.4, hw: round(2.4, 24.8, 9.6), curved: true },
    shadow: { cy: 87, rx: 39, ry: 4.6 },
  },
  glass: {
    cx: 50, base: 87, nominal: 300, maxFill: 0.9,
    inner: { top: 20, bottom: 79.5, hw: linear(17.4, 13.6) },
    outer: { top: 20, bottom: 86, hw: linear(19, 14.4) },
    shadow: { cy: 87.4, rx: 22, ry: 3.2 },
  },
  tall: {
    cx: 50, base: 88, nominal: 400, maxFill: 0.86,
    inner: { top: 10, bottom: 81.5, hw: linear(13.6, 11.8) },
    outer: { top: 10, bottom: 87.5, hw: linear(15.2, 12.6) },
    shadow: { cy: 88.4, rx: 18, ry: 2.8 },
  },
  teapot: {
    cx: 47, base: 85, nominal: 400, maxFill: 0.7,
    inner: { top: 41, bottom: 82, hw: oval(24), curved: true },
    outer: { top: 39.4, bottom: 83.6, hw: oval(25.8), curved: true },
    shadow: { cy: 85.4, rx: 30, ry: 3.6 },
  },
  paper: {
    cx: 50, base: 88, nominal: 300, maxFill: 0.9,
    inner: { top: 22, bottom: 85.5, hw: linear(18.6, 14.2) },
    outer: { top: 22, bottom: 87.5, hw: linear(20, 14.8) },
    shadow: { cy: 88.6, rx: 22, ry: 3 },
  },
};

const VESSEL_NAMES = Object.keys(VESSELS) as Vessel[];

const at = (p: Profile, y: number) => p.hw(Math.min(1, Math.max(0, (y - p.top) / (p.bottom - p.top))));

/** Точки бока: у прямых стаканов хватает концов, у кривых — 14 отрезков. */
function sample(cx: number, p: Profile) {
  const n = p.curved ? 14 : 1;
  const right: string[] = [];
  const left: string[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const y = f(p.top + (p.bottom - p.top) * t);
    const w = p.hw(t);
    right.push(`${f(cx + w)},${y}`);
    left.unshift(`${f(cx - w)},${y}`);
  }
  return { right, left };
}

/** Замкнутый силуэт по профилю. */
function shape(cx: number, p: Profile) {
  const { right, left } = sample(cx, p);
  return `M${[...right, ...left].join("L")}Z`;
}

/** Бока и дно без верхней кромки: кромку рисует эллипс. */
function outline(cx: number, p: Profile) {
  const { right, left } = sample(cx, p);
  return `M${[...[...left].reverse(), ...[...right].reverse()].join("L")}`;
}

/** Полоса вдоль стенки: блик стекла. */
function streak(cx: number, p: Profile, k: number, t0: number, t1: number) {
  const pts: string[] = [];
  for (let i = 0; i <= 6; i++) {
    const t = t0 + ((t1 - t0) * i) / 6;
    pts.push(`${f(cx + p.hw(t) * k)},${f(p.top + (p.bottom - p.top) * t)}`);
  }
  return `M${pts.join("L")}`;
}

// ── Цвета слоёв ──

const DARK = "#2a170d";
const WHITE = "#ffffff";

type Paint = { top: string; bottom: string; surface: string; opacity?: number };

function paint(layer: Layer, hasEspresso: boolean): Paint {
  const c = layer.color;
  switch (layer.kind) {
    case "espresso":
      return { top: "#5b3520", bottom: "#2b170c", surface: "#c4884a" };
    case "water":
      return hasEspresso
        ? { top: "#8e5631", bottom: "#6b3c20", surface: "#b0743f", opacity: 0.96 }
        : { top: "#e9f1f0", bottom: "#d5e3e2", surface: "#f4f8f7", opacity: 0.35 };
    case "milk":
      return { top: "#f5e9d5", bottom: "#ead6b8", surface: "#fbf4e8" };
    case "foam":
      return { top: "#ffffff", bottom: "#fbf5ea", surface: "#fffcf7" };
    case "cream": {
      const base = c ?? "#efdbb9";
      return { top: mixColor(base, WHITE, 0.22), bottom: mixColor(base, DARK, 0.08), surface: mixColor(base, WHITE, 0.4) };
    }
    case "syrup": {
      const base = c ?? "#c98a3c";
      return { top: mixColor(base, WHITE, 0.1), bottom: mixColor(base, DARK, 0.28), surface: mixColor(base, WHITE, 0.3) };
    }
    case "tea": {
      const base = c ?? "#9a5420";
      return { top: mixColor(base, WHITE, 0.16), bottom: mixColor(base, DARK, 0.22), surface: mixColor(base, WHITE, 0.32), opacity: 0.92 };
    }
    case "juice": {
      const base = c ?? "#f0a030";
      return { top: mixColor(base, WHITE, 0.16), bottom: mixColor(base, DARK, 0.14), surface: mixColor(base, WHITE, 0.34), opacity: 0.97 };
    }
    case "ice":
      return { top: "#eef5f6", bottom: "#dde9eb", surface: "#f6fafb", opacity: 0.4 };
  }
}

/** Мягкий переход: эспрессо расходится в молоке, сироп — в сливках. */
function isSoft(below: Layer["kind"], above: Layer["kind"]) {
  if (below === "espresso") return above === "milk" || above === "cream" || above === "water";
  if (above === "espresso") return below === "milk" || below === "cream";
  if (below === "syrup") return above === "milk" || above === "cream";
  return below === "tea" && above === "juice";
}

type Band = { layer: Layer; y: number; h: number; paint: Paint; key: string };

const vertical = { x1: "0", y1: "0", x2: "0", y2: "1" } as const;
const LIQUID_X = -32;
const LIQUID_W = 64;

export function DrinkArt({ art, size, volume, className }: Props) {
  const id = useArtIds();
  const v = VESSELS[art.vessel];
  const { cx, inner } = v;

  const ml = volume ?? v.nominal;
  const scale = Math.min(1, Math.max(0.7, Math.cbrt(ml / v.nominal)));
  const fill = Math.min(1, Math.max(0.45, ml / (v.nominal * scale ** 3))) * v.maxFill;

  const liquidBottom = inner.bottom;
  const liquidTop = inner.bottom - fill * (inner.bottom - inner.top);
  const height = liquidBottom - liquidTop;

  const layers = art.layers.length ? art.layers : [{ kind: "water", part: 1 } as Layer];
  const total = layers.reduce((s, l) => s + l.part, 0) || 1;
  const hasEspresso = layers.some((l) => l.kind === "espresso");

  // Слои снизу вверх; лёд берёт цвет ближайшей жидкости — кубики рисуются поверх.
  const liquid = (i: number) => {
    for (let j = i + 1; j < layers.length; j++) if (layers[j].kind !== "ice") return layers[j];
    for (let j = i - 1; j >= 0; j--) if (layers[j].kind !== "ice") return layers[j];
    return layers[i];
  };
  const bands: Band[] = [];
  let y = liquidBottom;
  layers.forEach((layer, i) => {
    const h = (height * layer.part) / total;
    y -= h;
    let look = paint(layer, hasEspresso);
    if (layer.kind === "ice" && liquid(i) !== layer) {
      // Ровный цвет той жидкости, в которой плавает лёд, — без ступеньки на стыке.
      const source = liquid(i);
      const near = paint(source, hasEspresso);
      const edge = layers.indexOf(source) > i ? near.bottom : near.top;
      look = { ...near, top: edge, bottom: edge };
    }
    bands.push({ layer, y, h, paint: look, key: `${layer.kind}${i}` });
  });

  const top = bands[bands.length - 1];
  const surfaceColor = top.layer.kind === "water" && hasEspresso ? "#b37742" : top.paint.surface;
  const crema = top.layer.kind === "espresso" || (top.layer.kind === "water" && hasEspresso);

  const surfaceRx = at(inner, liquidTop) - 0.3;
  const ry = (w: number) => w * 0.15;

  // Только данные этого рисунка: градиенты слоёв и мягких переходов.
  const defs: ReactNode[] = [];
  const bandFill = (b: Band) => {
    if (b.paint.top === b.paint.bottom) return b.paint.top;
    defs.push(
      <linearGradient key={b.key} id={id(b.key)} {...vertical}>
        <stop offset="0" stopColor={b.paint.top} />
        <stop offset="1" stopColor={b.paint.bottom} />
      </linearGradient>,
    );
    return `url(#${id(b.key)})`;
  };
  const rects = bands.map((b) => (
    <rect
      key={b.key}
      data-layer={b.layer.kind}
      x={cx + LIQUID_X}
      y={f(b.y)}
      width={LIQUID_W}
      height={f(b.h)}
      fill={bandFill(b)}
      fillOpacity={b.paint.opacity}
    />
  ));

  // Переходы между слоями: мягкие — градиентом, чёткие — дугой (граница видна чуть сверху).
  const seams: ReactNode[] = [];
  for (let i = 1; i < bands.length; i++) {
    const below = bands[i - 1];
    const above = bands[i];
    if (below.layer.kind === "ice" || above.layer.kind === "ice") continue;
    const yb = above.y + above.h;
    const w = at(inner, yb);
    if (isSoft(below.layer.kind, above.layer.kind)) {
      const b = Math.min(7, 0.7 * Math.min(below.h, above.h));
      defs.push(
        <linearGradient key={`s${i}`} id={id(`s${i}`)} {...vertical}>
          <stop offset="0" stopColor={above.paint.bottom} />
          <stop offset="1" stopColor={below.paint.top} />
        </linearGradient>,
      );
      seams.push(<rect key={`s${i}`} x={cx + LIQUID_X} y={f(yb - b / 2)} width={LIQUID_W} height={f(b)} fill={`url(#${id(`s${i}`)})`} />);
    } else {
      const arc = `M${f(cx - w)},${f(yb)}A${f(w)},${f(ry(w))} 0 0 0 ${f(cx + w)},${f(yb)}`;
      seams.push(<path key={`s${i}`} d={`${arc}Z`} fill={above.paint.bottom} fillOpacity={above.paint.opacity} />);
      if (above.layer.kind === "foam") {
        seams.push(<path key={`f${i}`} d={arc} fill="none" stroke="#7a5236" strokeOpacity={0.14} strokeWidth={1.4} />);
      }
    }
  }

  const r = rand(`${art.vessel}:${layers.map((l) => l.kind + l.part).join(",")}`);
  const iceShare = layers.filter((l) => l.kind === "ice").reduce((s, l) => s + l.part, 0) / total;
  const cubes: ReactNode[] = [];
  if (iceShare > 0) {
    const count = Math.min(4, Math.max(2, Math.round(iceShare * 9)));
    const s = Math.min(10, surfaceRx * 0.62);
    for (let k = 0; k < count; k++) {
      const side = k % 2 === 0 ? -1 : 1;
      const x = cx + side * surfaceRx * between(r, 0.18, 0.34);
      cubes.push(<Use key={k} id="cube" x={x} y={liquidTop + s * (0.2 + 0.9 * k)} rot={between(r, -22, 22)} s={s / 10} />);
    }
  }

  const isGlass = art.vessel !== "paper";
  const foamTop = top.layer.kind === "foam";
  const dome = foamTop ? Math.min(7, top.h * 0.5 + 1.5) : 0;
  const clip = `url(#pk-clip-${art.vessel})`;
  const sx = f(surfaceRx);
  const sy = f(ry(surfaceRx));

  const drawing = (
    <>
      <use href={`#pk-${art.vessel}-back`} />
      <g clipPath={clip}>
        {rects}
        {seams}
        {crema && <rect x={cx + LIQUID_X} y={f(liquidTop)} width={LIQUID_W} height={f(Math.min(3.2, top.h * 0.45))} fill="url(#pk-crema)" />}
        {isGlass && <rect x={cx + LIQUID_X} y={f(liquidTop)} width={LIQUID_W} height={f(height)} fill="url(#pk-glass)" opacity={0.5} />}
      </g>
      {isGlass && <ellipse cx={cx} cy={f(liquidTop)} rx={sx} ry={sy} fill={surfaceColor} fillOpacity={(top.paint.opacity ?? 1) < 0.9 ? 0.9 : undefined} />}
      {isGlass && crema && <ellipse cx={cx - 2} cy={f(liquidTop - 0.3)} rx={f(surfaceRx * 0.55)} ry={f(ry(surfaceRx) * 0.5)} fill="#dcaa6c" fillOpacity={0.7} />}
      {isGlass && foamTop && (
        <path
          d={`M${f(cx - surfaceRx)},${f(liquidTop)}C${f(cx - surfaceRx * 0.9)},${f(liquidTop - dome * 1.25)} ${f(cx + surfaceRx * 0.9)},${f(liquidTop - dome * 1.25)} ${f(cx + surfaceRx)},${f(liquidTop)}A${sx},${sy} 0 0 1 ${f(cx - surfaceRx)},${f(liquidTop)}Z`}
          fill="url(#pk-dome)"
        />
      )}
      {cubes.length > 0 && <g clipPath={clip}>{cubes}</g>}
      {art.vessel === "tall" && <Straw cx={cx} liquidTop={liquidTop} bottom={inner.bottom} />}
      <use href={`#pk-${art.vessel}-front`} />
    </>
  );

  return (
    <svg {...svgProps(size, className)}>
      {defs.length > 0 && <defs>{defs}</defs>}
      <g filter="url(#pk-grain)">
        {scale === 1 ? drawing : <g transform={`translate(${cx},${v.base})scale(${f2(scale)})translate(${-cx},${-v.base})`}>{drawing}</g>}
      </g>
    </svg>
  );
}

function Straw({ cx, liquidTop, bottom }: { cx: number; liquidTop: number; bottom: number }) {
  const x0 = cx + 3;
  const y0 = bottom - 4;
  const x1 = cx + 17;
  const y1 = 1.5;
  const k = (liquidTop - y1) / (y0 - y1);
  const xs = x1 + (x0 - x1) * k;
  return (
    <g strokeLinecap="round" fill="none">
      <path d={`M${f(xs + 1.4)},${f(liquidTop)}L${f(x0 + 1.4)},${f(y0)}`} stroke="#d9b98c" strokeOpacity={0.45} strokeWidth={3} />
      <path d={`M${x1},${y1}L${f(xs)},${f(liquidTop)}`} stroke="#dcbd90" strokeWidth={3} />
      <path d={`M${x1 - 0.7},${y1 + 0.4}L${f(xs - 0.7)},${f(liquidTop + 0.2)}`} stroke="#f3e2c4" strokeWidth={0.9} />
    </g>
  );
}

// ── Неизменная посуда: один раз на страницу, в <ArtDefs /> ──

function Saucer({ cx }: { cx: number }) {
  return (
    <g>
      <ellipse cx={cx + 1} cy={83.6} rx={36} ry={6.2} fill="#c9b9a3" />
      <ellipse cx={cx + 1} cy={82.2} rx={36} ry={6} fill="url(#pk-ceramic)" />
      <ellipse cx={cx + 1} cy={81.6} rx={19} ry={2.8} fill="#e3d7c5" />
      <path d={`M${cx - 33},80.4A36,6 0 0 1 ${cx + 20},76.6`} fill="none" stroke="#ffffff" strokeOpacity={0.8} strokeWidth={0.9} />
    </g>
  );
}

function Handle({ d }: { d: string }) {
  return (
    <g fill="none" strokeLinecap="round">
      <path d={d} stroke="#3a2214" strokeOpacity={0.28} strokeWidth={5.2} />
      <path d={d} stroke="#f7f1e7" strokeOpacity={0.85} strokeWidth={3.6} />
      <path d={d} stroke="#ffffff" strokeOpacity={0.9} strokeWidth={1.1} transform="translate(-0.5,-0.6)" />
    </g>
  );
}

function TeapotBack({ cx }: { cx: number }) {
  const spout = `M${cx - 21},71 C${cx - 30},70 ${cx - 33},58 ${cx - 39},47`;
  return (
    <g fill="none" strokeLinecap="round">
      <path d={spout} stroke="#3a2214" strokeOpacity={0.3} strokeWidth={6.4} />
      <path d={spout} stroke="#ffffff" strokeOpacity={0.3} strokeWidth={5} />
      <path d={spout} stroke="#ffffff" strokeOpacity={0.7} strokeWidth={1} transform="translate(-0.8,-0.4)" />
      <Handle d={`M${cx + 20},48 C${cx + 36},46 ${cx + 38},72 ${cx + 19},76`} />
    </g>
  );
}

function TeapotFront({ cx }: { cx: number }) {
  return (
    <g>
      <ellipse cx={cx} cy={83.4} rx={12} ry={1.6} fill="#ffffff" fillOpacity={0.35} />
      <rect x={cx - 10} y={33.5} width={20} height={7} rx={2} fill="#ffffff" fillOpacity={0.16} stroke="#3a2214" strokeOpacity={0.25} strokeWidth={1} />
      <ellipse cx={cx} cy={34} rx={13} ry={2.6} fill="#9a6a43" />
      <ellipse cx={cx} cy={33.4} rx={12.4} ry={2.1} fill="#b5824f" />
      <circle cx={cx} cy={29.6} r={3.4} fill="#7b4e2e" />
      <circle cx={cx - 1} cy={28.6} r={1.2} fill="#ffffff" fillOpacity={0.4} />
    </g>
  );
}

/** Стаканчик навынос непрозрачный: слои под бумагой, сверху крышка цвета эспрессо. */
function PaperFront({ cx, outer }: { cx: number; outer: Profile }) {
  const sleeve: Profile = { top: 46, bottom: 70, hw: (t) => at(outer, 46 + 24 * t) + 0.4 };
  const w = outer.hw(0);
  const y = outer.top;
  return (
    <g>
      <path d={shape(cx, outer)} fill="url(#pk-paper)" />
      <path d={shape(cx, sleeve)} fill="url(#pk-kraft)" />
      <rect x={f(cx - w + 2)} y={y - 1} width={f((w - 2) * 2)} height={1.6} fill="#2a170d" opacity={0.18} />
      <path d={`M${f(cx - w + 2.4)},${y - 3.4}L${f(cx - w + 5)},${y - 8.4}Q${cx},${y - 10} ${f(cx + w - 5)},${y - 8.4}L${f(cx + w - 2.4)},${y - 3.4}Z`} fill="#4a2c1b" />
      <rect x={f(cx - w - 1.6)} y={y - 4} width={f((w + 1.6) * 2)} height={4.6} rx={2} fill="#3a2114" />
      <rect x={f(cx - w - 0.6)} y={y - 3.4} width={f(w * 1.1)} height={1.1} rx={0.55} fill="#ffffff" opacity={0.18} />
      <ellipse cx={cx + 7} cy={y - 8.4} rx={2.6} ry={0.9} fill="#1b0f08" />
      <path d={`M${f(cx - w + 6)},${y - 7.6}Q${cx - 4},${y - 9.2} ${cx + 2},${y - 9.2}`} fill="none" stroke="#ffffff" strokeOpacity={0.22} strokeWidth={1} strokeLinecap="round" />
    </g>
  );
}

function GlassFront({ vessel }: { vessel: Vessel }) {
  const { cx, inner, outer } = VESSELS[vessel];
  const rimRx = outer.hw(0);
  const rimRy = f(rimRx * 0.15);
  const edge = vessel === "teapot" ? null : outline(cx, outer);
  return (
    <g fill="none">
      {edge ? (
        <>
          <path d={edge} stroke="#3a2214" strokeOpacity={0.3} strokeWidth={1.3} strokeLinejoin="round" />
          <path d={edge} stroke="#ffffff" strokeOpacity={0.55} strokeWidth={0.6} strokeLinejoin="round" />
        </>
      ) : (
        <>
          <ellipse cx={cx} cy={61.5} rx={25.8} ry={22.1} stroke="#3a2214" strokeOpacity={0.3} strokeWidth={1.3} />
          <ellipse cx={cx} cy={61.5} rx={25.8} ry={22.1} stroke="#ffffff" strokeOpacity={0.55} strokeWidth={0.6} />
        </>
      )}
      <path d={streak(cx, outer, -0.74, 0.1, 0.78)} stroke="#ffffff" strokeOpacity={0.5} strokeWidth={2.2} strokeLinecap="round" />
      <path d={streak(cx, outer, 0.8, 0.18, 0.42)} stroke="#ffffff" strokeOpacity={0.3} strokeWidth={1.2} strokeLinecap="round" />
      {vessel !== "teapot" && (
        <>
          <ellipse cx={cx} cy={outer.top} rx={rimRx} ry={rimRy} fill="#ffffff" fillOpacity={0.08} stroke="#3a2214" strokeOpacity={0.28} strokeWidth={1.3} />
          <ellipse cx={cx} cy={outer.top} rx={rimRx} ry={rimRy} stroke="#ffffff" strokeOpacity={0.75} strokeWidth={0.7} />
        </>
      )}
      {(vessel === "glass" || vessel === "tall") && (
        <ellipse cx={cx} cy={f(inner.bottom + 2.6)} rx={f(at(outer, inner.bottom) * 0.8)} ry={1.5} fill="#ffffff" fillOpacity={0.35} />
      )}
      {vessel === "teapot" && <TeapotFront cx={cx} />}
    </g>
  );
}

/** Градиенты, обрезка жидкости и посуда напитков — для <ArtDefs />. */
export function DrinkDefs() {
  return (
    <>
      <radialGradient id="pk-shadow">
        <stop offset="0" stopColor="#24130a" stopOpacity={0.34} />
        <stop offset="0.55" stopColor="#24130a" stopOpacity={0.19} />
        <stop offset="1" stopColor="#24130a" stopOpacity={0} />
      </radialGradient>
      <linearGradient id="pk-glass" x1="0" x2="1">
        <stop offset="0" stopColor="#ffffff" stopOpacity={0.24} />
        <stop offset="0.45" stopColor="#ffffff" stopOpacity={0.07} />
        <stop offset="1" stopColor="#ffffff" stopOpacity={0.16} />
      </linearGradient>
      <linearGradient id="pk-ceramic" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fbf7f0" />
        <stop offset="1" stopColor="#e2d6c4" />
      </linearGradient>
      <linearGradient id="pk-kraft" x1="0" x2="1">
        <stop offset="0" stopColor="#c99a63" />
        <stop offset="1" stopColor="#a57444" />
      </linearGradient>
      <linearGradient id="pk-paper" x1="0" x2="1">
        <stop offset="0" stopColor="#fbf8f2" />
        <stop offset="1" stopColor="#e3dacd" />
      </linearGradient>
      <linearGradient id="pk-dome" {...vertical}>
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.6" stopColor="#fcf7ef" />
        <stop offset="1" stopColor="#eadcc6" />
      </linearGradient>
      <linearGradient id="pk-crema" {...vertical}>
        <stop offset="0" stopColor="#d49a5a" />
        <stop offset="1" stopColor="#d49a5a" stopOpacity={0} />
      </linearGradient>

      {VESSEL_NAMES.map((name) => {
        const { cx, inner } = VESSELS[name];
        return (
          <clipPath key={name} id={`pk-clip-${name}`}>
            {name === "teapot" ? <ellipse cx={cx} cy={61.5} rx={24} ry={20.5} /> : <path d={shape(cx, inner)} />}
          </clipPath>
        );
      })}

      {VESSEL_NAMES.map((name) => {
        const { cx, outer, shadow } = VESSELS[name];
        return (
          <g key={name} id={`pk-${name}-back`}>
            <ellipse cx={cx + 1} cy={shadow.cy} rx={shadow.rx} ry={shadow.ry} fill="url(#pk-shadow)" />
            {name === "cup" && <Saucer cx={cx} />}
            {name === "cup" && <Handle d={`M${cx + 22},43 C${cx + 37},40 ${cx + 38},63 ${cx + 15},70`} />}
            {name === "teapot" && <TeapotBack cx={cx} />}
            {name === "teapot" && <ellipse cx={cx} cy={61.5} rx={25.8} ry={22.1} fill="url(#pk-glass)" />}
            {name !== "teapot" && name !== "paper" && <path d={shape(cx, outer)} fill="url(#pk-glass)" />}
          </g>
        );
      })}

      {VESSEL_NAMES.map((name) => (
        <g key={name} id={`pk-${name}-front`}>
          {name === "paper" ? <PaperFront cx={VESSELS.paper.cx} outer={VESSELS.paper.outer} /> : <GlassFront vessel={name} />}
        </g>
      ))}

      <g id="pk-cube">
        <rect x={-4.5} y={-4.2} width={10} height={10} rx={2.2} fill="#3a2a20" fillOpacity={0.14} />
        <rect x={-5} y={-5} width={10} height={10} rx={2.2} fill="#ffffff" fillOpacity={0.32} stroke="#ffffff" strokeOpacity={0.8} strokeWidth={0.8} />
        <rect x={-3.8} y={-3.8} width={4.2} height={3} rx={1.2} fill="#ffffff" fillOpacity={0.6} />
      </g>
    </>
  );
}
