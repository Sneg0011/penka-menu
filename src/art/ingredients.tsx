import type { ReactNode } from "react";

import type { Dish } from "@/content/types";

import { type Rand, Use, between, blob, f, rand, smoothClosed } from "./shared";

// Ингредиенты еды — вид сверху, свет сверху-слева. Каждая «порция» рисуется вокруг (0, 0)
// в радиусе ~12 единиц; раскладку, масштаб и поворот задаёт FoodArt.
// Сами рисунки неизменны и лежат один раз на страницу спрайтами `#pk-…` в <ArtDefs />;
// позиция ссылается на них через <use>, поэтому 67 рисунков не повторяют одни и те же пути.
//
// Чистота: генератор «случая» (`Rand`) создаётся из строки (имя спрайта, id позиции) и расходуется
// синхронно в той же функции — поэтому всё, что принимает `r`, здесь обычные функции, а не компоненты.
// Компонент, получивший `r` пропом, при повторном рендере (StrictMode, гидратация) вытянул бы следующие
// числа, и разметка клиента разошлась бы с серверной. Это проверяет tests/art.test.tsx.

export type Role = "hero" | "side" | "solo" | "garnish";

export type DrawCtx = {
  r: Rand;
  role: Role;
  dish: Dish;
  /** Все ингредиенты блюда: шпинат красит вафлю, сметана в супе — завиток. */
  all: string[];
};

export type IngredientDef = {
  draw: (c: DrawCtx) => ReactNode;
  /** Заливка миски или сковороды (спрайт радиуса BED_R), когда ингредиент — основа блюда. */
  bed?: { dishes: Dish[]; sprite: string };
  /** Цвет слоя в разрезе торта. */
  layer?: string;
  /** Украшение поверх торта или эклера. */
  topping?: (c: DrawCtx) => ReactNode;
  /** Ложится поверх главного (зелень, сыр, соус), а не на своё место по кругу. */
  garnish?: (dish: Dish) => boolean;
};

// ── Мелкие помощники ──

const Shine = ({ x, y, rx, ry, o = 0.45, rot = 0 }: { x: number; y: number; rx: number; ry: number; o?: number; rot?: number }) => (
  <ellipse cx={f(x)} cy={f(y)} rx={f(rx)} ry={f(ry)} fill="#ffffff" opacity={o} transform={rot ? `rotate(${f(rot)} ${f(x)} ${f(y)})` : undefined} />
);

/** Точки внутри круга радиуса R без сильных наложений. */
function spots(r: Rand, count: number, R: number, gap: number): [number, number][] {
  const out: [number, number][] = [];
  for (let tries = 0; out.length < count && tries < count * 30; tries++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * R;
    const p: [number, number] = [Math.cos(a) * d, Math.sin(a) * d];
    if (out.every(([x, y]) => (x - p[0]) ** 2 + (y - p[1]) ** 2 >= gap * gap)) out.push(p);
  }
  return out;
}

/** Мелкая фактура: зёрна, хлопья, крупинки. Один path на цвет — десятки зёрен без десятков элементов. */
function speckle(r: Rand, count: number, R: number, colors: string[], rx: number, ry: number, opacity = 1): ReactNode {
  const t = (n: number) => Math.round(n * 10) / 10;
  const paths = colors.map(() => "");
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * R;
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d;
    const ex = rx * between(r, 0.7, 1.2);
    const ey = ry * between(r, 0.7, 1.2);
    const rot = Math.round(r() * 180);
    // эллипс двумя дугами между концами большой оси
    const dx = 2 * ex * Math.cos((rot * Math.PI) / 180);
    const dy = 2 * ex * Math.sin((rot * Math.PI) / 180);
    const arc = `${t(ex)},${t(ey)} ${rot} 1 0`;
    paths[i % colors.length] += `M${t(x - dx / 2)},${t(y - dy / 2)}a${arc} ${t(dx)},${t(dy)}a${arc} ${t(-dx)},${t(-dy)}`;
  }
  return colors.map((color, i) => <path key={i} d={paths[i]} fill={color} opacity={opacity < 1 ? opacity : undefined} />);
}

/** Заострённый лист длиной len вдоль оси x. */
const leafPath = (len: number, w: number) =>
  `M0,0C${f(len * 0.25)},${f(-w)} ${f(len * 0.7)},${f(-w * 0.9)} ${f(len)},0C${f(len * 0.7)},${f(w * 0.9)} ${f(len * 0.25)},${f(w)} 0,0Z`;

function Leaf({ x, y, rot, len, w, fill, vein, shade }: { x: number; y: number; rot: number; len: number; w: number; fill: string; vein?: string; shade?: boolean }) {
  return (
    <g transform={`translate(${f(x)},${f(y)}) rotate(${f(rot)})`}>
      {shade && <path d={leafPath(len, w)} fill="#26401a" opacity={0.35} transform="translate(0.5,0.9)" />}
      <path d={leafPath(len, w)} fill={fill} />
      {vein && <path d={`M${f(len * 0.08)},0L${f(len * 0.8)},0`} stroke={vein} strokeWidth={0.8} strokeLinecap="round" opacity={0.8} />}
    </g>
  );
}

/** Волнистая полоска: бекон, рыба. */
function wavy(len: number, w: number, amp: number, phase: number) {
  const top: string[] = [];
  const bottom: string[] = [];
  for (let i = 0; i <= 10; i++) {
    const x = -len / 2 + (len * i) / 10;
    const s = Math.sin(i * 0.9 + phase) * amp;
    top.push(`${f(x)},${f(-w / 2 + s)}`);
    bottom.unshift(`${f(x)},${f(w / 2 + s * 0.8)}`);
  }
  return `M${top.join("L")}L${bottom.join("L")}Z`;
}

// ── Отдельные кусочки ──

function friedEgg(r: Rand, x = 0, y = 0, s = 1) {
  const d = blob(r, 0, 0, 11, 9.6, 9, 0.16);
  const yx = between(r, -1.6, 1.6);
  const yy = between(r, -1.6, 1.2);
  return (
    <g transform={`translate(${f(x)},${f(y)}) scale(${s})`}>
      <path d={d} fill="#e6d7bd" transform="translate(0.7,1.1)" />
      <path d={d} fill="#fdf9f1" />
      <circle cx={f(yx + 0.5)} cy={f(yy + 0.7)} r={4.8} fill="#d8811a" />
      <circle cx={f(yx)} cy={f(yy)} r={4.5} fill="#f4a823" />
      <Shine x={yx - 1.4} y={yy - 1.6} rx={1.7} ry={1.1} o={0.6} rot={-30} />
    </g>
  );
}

function omelet(r: Rand) {
  const top = "M-15,2C-15,-11 15,-11 15,2C8,6.5 -8,6.5 -15,2Z";
  return (
    <g>
      <path d={top} fill="#d99a35" transform="translate(0.8,1.4)" />
      <path d={top} fill="#f3c95b" />
      <path d={blob(r, -5, -3, 5, 3, 7, 0.3)} fill="#e2a23b" opacity={0.5} />
      <path d={blob(r, 6, -1.5, 4, 2.4, 7, 0.3)} fill="#e2a23b" opacity={0.45} />
      <path d="M-11,-2.5C-8,-7.5 2,-9 8,-7" fill="none" stroke="#ffffff" strokeOpacity={0.5} strokeWidth={1.6} strokeLinecap="round" />
      {[[-6, 1, 30], [1, -4, -20], [7, 2, 60], [-1, 3, 10]].map(([x, y, a], i) => (
        <rect key={i} x={x - 1.4} y={y - 0.5} width={2.8} height={1} rx={0.5} fill="#4f7f2d" transform={`rotate(${a} ${x} ${y})`} />
      ))}
    </g>
  );
}

function Sausage({ x, y, rot }: { x: number; y: number; rot: number }) {
  return (
    <g transform={`translate(${f(x)},${f(y)}) rotate(${f(rot)})`}>
      <rect x={-11} y={-3.1} width={22} height={6.6} rx={3.3} fill="#7f3b20" transform="translate(0.4,0.7)" />
      <rect x={-11} y={-3.3} width={22} height={6.6} rx={3.3} fill="#a5532d" />
      <rect x={-8.5} y={-2.4} width={15} height={1.6} rx={0.8} fill="#d38658" opacity={0.7} />
      {[-4, 1, 6].map((gx) => (
        <rect key={gx} x={gx - 0.6} y={-3.2} width={1.3} height={6.4} rx={0.6} fill="#5e2a14" opacity={0.35} transform={`rotate(14 ${gx} 0)`} />
      ))}
    </g>
  );
}

function bacon(r: Rand, x = 0, y = 0, rot = 0) {
  const phase = r() * 3;
  return (
    <g transform={`translate(${f(x)},${f(y)}) rotate(${f(rot)})`}>
      <path d={wavy(24, 6.2, 1.2, phase)} fill="#9c3d2e" transform="translate(0.4,0.8)" />
      <path d={wavy(24, 6.2, 1.2, phase)} fill="#c2594a" />
      <path d={wavy(21, 1.5, 1.1, phase)} fill="#f2cfb5" transform="translate(0,-1.2)" />
      <path d={wavy(18, 1, 1, phase)} fill="#efc0a2" transform="translate(0.5,1.7)" />
    </g>
  );
}

function TomatoHalf({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${f(x)},${f(y)}) scale(${s})`}>
      <circle cx={0.4} cy={0.7} r={6} fill="#9e2a1a" />
      <circle r={6} fill="#cf3b26" />
      <circle r={5} fill="#e4583e" />
      {[0, 120, 240].map((a) => (
        <ellipse key={a} cx={2.4} cy={0} rx={1.9} ry={1.3} fill="#f39a74" transform={`rotate(${a})`} />
      ))}
      <circle r={1.2} fill="#f1b08c" />
      <Shine x={-2.4} y={-2.6} rx={1.8} ry={1} o={0.5} rot={-40} />
    </g>
  );
}

function Mushroom({ x, y, rot, s = 1 }: { x: number; y: number; rot: number; s?: number }) {
  const d = "M-6.4,0.6C-6.6,-4.4 -3.2,-6.6 0,-6.6C3.2,-6.6 6.6,-4.4 6.4,0.6C4.6,1.2 3.4,1 2.2,1.2L2.4,5.8C1.4,6.6 -1.4,6.6 -2.4,5.8L-2.2,1.2C-3.4,1 -4.6,1.2 -6.4,0.6Z";
  return (
    <g transform={`translate(${f(x)},${f(y)}) rotate(${f(rot)}) scale(${s})`}>
      <path d={d} fill="#8f6744" transform="scale(1.12) translate(0.2,0.3)" />
      <path d={d} fill="#efe1c7" />
      <path d="M-4.6,-0.4C-4.4,-3.6 -2,-5 0,-5" fill="none" stroke="#ffffff" strokeOpacity={0.55} strokeWidth={1} strokeLinecap="round" />
    </g>
  );
}

function Strip({ x, y, rot, len, w, fill, under, mark }: { x: number; y: number; rot: number; len: number; w: number; fill: string; under: string; mark?: string }) {
  return (
    <g transform={`translate(${f(x)},${f(y)}) rotate(${f(rot)})`}>
      <rect x={-len / 2 + 0.4} y={-w / 2 + 0.7} width={len} height={w} rx={w * 0.45} fill={under} />
      <rect x={-len / 2} y={-w / 2} width={len} height={w} rx={w * 0.45} fill={fill} />
      {mark &&
        [-len * 0.22, len * 0.12].map((mx) => (
          <rect key={mx} x={f(mx)} y={-w / 2 + 0.6} width={1.4} height={w - 1.2} rx={0.6} fill={mark} opacity={0.75} transform={`rotate(25 ${f(mx)} 0)`} />
        ))}
      <rect x={-len / 2 + 1.5} y={-w / 2 + 0.7} width={len * 0.45} height={1} rx={0.5} fill="#ffffff" opacity={0.35} />
    </g>
  );
}

function CucumberSlice({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${f(x)},${f(y)}) scale(${s})`}>
      <circle cx={0.3} cy={0.6} r={4.8} fill="#2f5a1f" />
      <circle r={4.8} fill="#3f6f2a" />
      <circle r={4.1} fill="#a7c86c" />
      <circle r={3.5} fill="#e0ecbb" />
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx={1.5} cy={0} rx={0.8} ry={0.45} fill="#b6cb80" transform={`rotate(${a})`} />
      ))}
    </g>
  );
}

function LemonSlice({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${f(x)},${f(y)}) scale(${s})`}>
      <circle cx={0.4} cy={0.7} r={6.6} fill="#c9971a" />
      <circle r={6.6} fill="#ecbd23" />
      <circle r={5.7} fill="#fbf1c4" />
      {Array.from({ length: 8 }, (_, i) => (
        <path key={i} d="M0.6,-0.5L4.9,-2.2A5.3,5.3 0 0 1 4.9,2.2L0.6,0.5Z" fill="#f6d54a" transform={`rotate(${i * 45})`} />
      ))}
      <Shine x={-2.6} y={-3} rx={1.8} ry={0.9} o={0.5} rot={-40} />
    </g>
  );
}

function Raspberry({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${f(x)},${f(y)}) scale(${s})`}>
      <circle cx={0.3} cy={0.6} r={3.5} fill="#7e1a2e" />
      <circle r={3.5} fill="#c42f4b" />
      {[[-1.4, -1.2], [1.2, -1.4], [1.6, 0.9], [-1, 1.5], [0, 0]].map(([dx, dy], i) => (
        <circle key={i} cx={dx} cy={dy} r={0.9} fill="#e0566e" />
      ))}
      <Shine x={-1.3} y={-1.6} rx={1} ry={0.6} o={0.5} />
    </g>
  );
}

function Blueberry({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${f(x)},${f(y)}) scale(${s})`}>
      <circle cx={0.3} cy={0.5} r={2.8} fill="#22213f" />
      <circle r={2.8} fill="#43416f" />
      <circle cx={-0.6} cy={-0.7} r={1.6} fill="#6d6c9b" opacity={0.6} />
      <circle cx={0.5} cy={0.4} r={0.7} fill="#1e1d35" />
    </g>
  );
}

function Syrnik({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${f(x)},${f(y)}) scale(${s})`}>
      <circle cx={0.5} cy={0.9} r={7} fill="#9b5e26" />
      <circle r={7} fill="#c9893f" />
      <circle cx={-0.4} cy={-0.4} r={5.6} fill="#e0a85e" />
      <circle cx={-1} cy={-1} r={3.4} fill="#efc887" />
      <Shine x={-2.6} y={-2.8} rx={1.8} ry={1} o={0.4} rot={-40} />
    </g>
  );
}

function Crouton({ x, y, rot }: { x: number; y: number; rot: number }) {
  return (
    <g transform={`translate(${f(x)},${f(y)}) rotate(${f(rot)})`}>
      <rect x={-2.4} y={-2.1} width={5} height={5} rx={1.1} fill="#a86c2a" />
      <rect x={-2.6} y={-2.6} width={5} height={5} rx={1.1} fill="#d9a04f" />
      <rect x={-1.9} y={-1.9} width={2.4} height={2} rx={0.7} fill="#f1c77a" />
    </g>
  );
}

function Shrimp({ x, y, rot, s = 1 }: { x: number; y: number; rot: number; s?: number }) {
  return (
    <g transform={`translate(${f(x)},${f(y)}) rotate(${f(rot)}) scale(${s})`} fill="none" strokeLinecap="round">
      <path d="M-4.6,-2.6A5,5 0 1 0 2.8,-4.2" stroke="#c4592f" strokeWidth={5} transform="translate(0.3,0.6)" />
      <path d="M-4.6,-2.6A5,5 0 1 0 2.8,-4.2" stroke="#f19a66" strokeWidth={5} />
      <path d="M-3.4,-0.6A3.4,3.4 0 1 0 1.8,-2.6" stroke="#f8c7a0" strokeWidth={1.4} />
      <path d="M2.8,-4.2L6.4,-7L7.2,-3.4Z" fill="#d6643a" stroke="#d6643a" strokeWidth={1} strokeLinejoin="round" />
    </g>
  );
}

function Walnut({ x, y, rot, s = 1 }: { x: number; y: number; rot: number; s?: number }) {
  return (
    <g transform={`translate(${f(x)},${f(y)}) rotate(${f(rot)}) scale(${s})`}>
      <path d="M-4.2,-2.4C-4.8,-4.4 -1.6,-4.6 0,-3C1.6,-4.6 4.8,-4.4 4.2,-2.4C5.2,0 4.4,3.4 1.2,3.6C0.6,4.2 -0.6,4.2 -1.2,3.6C-4.4,3.4 -5.2,0 -4.2,-2.4Z" fill="#7a4d27" transform="translate(0.3,0.5)" />
      <path d="M-4.2,-2.4C-4.8,-4.4 -1.6,-4.6 0,-3C1.6,-4.6 4.8,-4.4 4.2,-2.4C5.2,0 4.4,3.4 1.2,3.6C0.6,4.2 -0.6,4.2 -1.2,3.6C-4.4,3.4 -5.2,0 -4.2,-2.4Z" fill="#a8723f" />
      <path d="M0,-2.4L0,3" stroke="#7a4d27" strokeWidth={0.9} strokeLinecap="round" />
      <ellipse cx={-2.2} cy={-1.2} rx={1.3} ry={0.8} fill="#c99560" />
    </g>
  );
}

function croissant(r: Rand, s = 1) {
  // Полумесяц: толстый в середине, к рожкам тоньше; поперёк — завитки теста.
  const R = 10;
  const n = 16;
  const at = (t: number, k: number): [number, number] => {
    const a = ((-172 + 164 * t) * Math.PI) / 180;
    const w = 1.2 + 5.8 * Math.pow(Math.sin(Math.PI * t), 0.8);
    const rad = R + w * k;
    return [Math.cos(a) * rad, Math.sin(a) * rad + 9];
  };
  const ts = Array.from({ length: n + 1 }, (_, i) => i / n);
  const body = smoothClosed([...ts.map((t) => at(t, 1)), ...[...ts].reverse().map((t) => at(t, -0.8))]);
  const glow = smoothClosed([...ts.slice(2, -2).map((t) => at(t, 0.85)), ...ts.slice(2, -2).reverse().map((t) => at(t, 0.15))]);
  const lean = between(r, -0.04, 0.04);
  return (
    <g transform={`scale(${s})`}>
      <path d={body} fill="#9a5a1f" transform="translate(0.6,1.1)" />
      <path d={body} fill="#cd8536" />
      <path d={glow} fill="#e8ae5f" />
      {[0.2, 0.34, 0.5, 0.66, 0.8].map((t) => {
        const [x0, y0] = at(t + lean, -0.8);
        const [x1, y1] = at(t + lean + 0.03, 1);
        const [cx, cy] = at(t + lean - 0.035, 0.2);
        return <path key={t} d={`M${f(x0)},${f(y0)}Q${f(cx)},${f(cy)} ${f(x1)},${f(y1)}`} fill="none" stroke="#a5611f" strokeWidth={1.3} strokeLinecap="round" opacity={0.75} />;
      })}
      <path d={smoothClosed([...ts.slice(4, -4).map((t) => at(t, 0.75)), ...ts.slice(4, -4).reverse().map((t) => at(t, 0.5))])} fill="#f5cf8a" opacity={0.6} />
    </g>
  );
}

function Waffle({ green, s = 1 }: { green: boolean; s?: number }) {
  const base = green ? "#8fa85a" : "#d9a24f";
  const under = green ? "#5f7a36" : "#a8702d";
  const pocket = green ? "#6c8a3e" : "#b97c33";
  const rim = green ? "#a9bf74" : "#ebbd6c";
  const cells = [-7.5, -2.5, 2.5, 7.5];
  return (
    <g transform={`scale(${s})`}>
      <rect x={-12.2} y={-11.6} width={25} height={25} rx={5} fill={under} />
      <rect x={-12.5} y={-12.5} width={25} height={25} rx={5} fill={base} />
      <rect x={-12.5} y={-12.5} width={25} height={25} rx={5} fill="none" stroke={rim} strokeWidth={1.4} />
      <path d={cells.flatMap((cx) => cells.map((cy) => `M${cx - 1.8},${cy - 1.8}h3.6v3.6h-3.6z`)).join("")} fill={pocket} />
      <path d={cells.flatMap((cx) => cells.map((cy) => `M${cx - 1.6},${cy - 1.7}h2v0.9h-2z`)).join("")} fill={under} opacity={0.6} />
    </g>
  );
}

function pancake(r: Rand, s = 1) {
  // Блин, сложенный треугольником (четверть круга), сверху второй.
  const quarter = "M-9,9L-9,-9A18,18 0 0 1 9,9Z";
  return (
    <g transform={`scale(${s}) rotate(-35)`}>
      <path d={quarter} fill="#b77a35" transform="translate(0.8,1.2)" />
      <path d={quarter} fill="#e7b266" />
      <path d={blob(r, -1, 1, 6.5, 5.5, 8, 0.25)} fill="#f2cd8d" opacity={0.8} />
      {spots(r, 6, 8, 3).map(([x, y], i) => (
        <path key={i} d={blob(r, x - 1, y + 1, 1.6, 1.1, 6, 0.3)} fill="#c98a3c" opacity={0.45} />
      ))}
      <path d="M-9,7.5L-9,-7.5" stroke="#f7dca8" strokeWidth={1.2} strokeLinecap="round" opacity={0.8} />
    </g>
  );
}

function pastaNest(r: Rand, R: number) {
  const strands = Array.from({ length: 8 }, (_, i) => {
    const rx = R * between(r, 0.45, 1);
    const ry = rx * between(r, 0.55, 0.85);
    const rot = r() * 180;
    const a0 = r() * Math.PI * 2;
    const a1 = a0 + between(r, 2.2, 4);
    const p = (a: number) => [Math.cos(a) * rx, Math.sin(a) * ry] as const;
    const [x0, y0] = p(a0);
    const [x1, y1] = p(a1);
    const d = `M${f(x0)},${f(y0)}A${f(rx)},${f(ry)} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${f(x1)},${f(y1)}`;
    return { d, rot, key: i };
  });
  return (
    <g fill="none" strokeLinecap="round">
      <circle r={R * 0.9} fill="#d9b25f" />
      {strands.map(({ d, rot, key }) => (
        <g key={key} transform={`rotate(${f(rot)})`}>
          <path d={d} stroke="#c09246" strokeWidth={3.2} />
          <path d={d} stroke="#f2d48b" strokeWidth={2.2} />
        </g>
      ))}
      <Shine x={-R * 0.3} y={-R * 0.35} rx={R * 0.35} ry={R * 0.18} o={0.25} rot={-35} />
    </g>
  );
}

function noodles(r: Rand, R: number, count: number) {
  return (
    <g fill="none" strokeLinecap="round">
      {Array.from({ length: count }, (_, i) => {
        const a = r() * Math.PI;
        const d0 = between(r, -R * 0.7, R * 0.7);
        const len = R * between(r, 0.9, 1.6);
        const cx = Math.cos(a + Math.PI / 2) * d0;
        const cy = Math.sin(a + Math.PI / 2) * d0;
        const pts: string[] = [];
        for (let k = 0; k <= 8; k++) {
          const t = -len / 2 + (len * k) / 8;
          const w = Math.sin(k * 1.3 + i) * 1.6;
          pts.push(`${f(cx + Math.cos(a) * t + Math.cos(a + Math.PI / 2) * w)},${f(cy + Math.sin(a) * t + Math.sin(a + Math.PI / 2) * w)}`);
        }
        const d = `M${pts.join("L")}`;
        return (
          <g key={i}>
            <path d={d} stroke="#b88d42" strokeWidth={3} strokeLinejoin="round" />
            <path d={d} stroke="#f0d38c" strokeWidth={2} strokeLinejoin="round" />
          </g>
        );
      })}
    </g>
  );
}

function dollop(r: Rand, s = 1) {
  const d = blob(r, 0, 0, 7, 6.4, 8, 0.12);
  return (
    <g transform={`scale(${s})`}>
      <path d={d} fill="#d9cbb3" transform="translate(0.6,1)" />
      <path d={d} fill="#fbf6ec" />
      <path d={blob(r, -1, -1, 4, 3.4, 7, 0.15)} fill="#ffffff" />
      <path d="M-3,1.6C-1,3.2 2.4,2.6 3.4,0" fill="none" stroke="#e6d8c0" strokeWidth={1.1} strokeLinecap="round" />
    </g>
  );
}

function Swirl({ s = 1 }: { s?: number }) {
  const d = "M0,0C1.6,-1.8 4,0 3,2.4C1.8,5 -3,4.6 -4.2,1.4C-5.6,-2.6 -1.6,-6.4 2.8,-5.6C7.6,-4.6 8.6,1.8 5.6,5.2";
  return (
    <g transform={`scale(${s})`} fill="none" strokeLinecap="round">
      <path d={d} stroke="#cfc0a6" strokeWidth={2.6} opacity={0.5} transform="translate(0.4,0.6)" />
      <path d={d} stroke="#fdf8ef" strokeWidth={2.2} />
    </g>
  );
}

/** Нейтральная «крошка» — для неизвестного имени. */
function crumbs(r: Rand) {
  return (
    <g>
      {spots(r, 3, 6, 4.5).map(([x, y], i) => (
        <g key={i}>
          <path d={blob(r, x + 0.4, y + 0.6, 2.6, 2.2, 6, 0.25)} fill="#9c7b55" />
          <path d={blob(r, x, y, 2.6, 2.2, 6, 0.25)} fill="#cfb38c" />
        </g>
      ))}
    </g>
  );
}

// ── Основы для мисок и сковород ──

function grainBed(r: Rand, { R, base, light, grains, count = 46, size = [1.1, 0.75] }: { R: number; base: string; light: string; grains: string[]; count?: number; size?: [number, number] }) {
  return (
    <g>
      <circle r={R} fill={base} />
      <path d={blob(r, -R * 0.12, -R * 0.15, R * 0.62, R * 0.55, 8, 0.15)} fill={light} opacity={0.7} />
      {speckle(r, count, R * 0.95, grains, size[0], size[1])}
    </g>
  );
}

function puree(r: Rand, { R, base, light }: { R: number; base: string; light: string }) {
  return (
    <g>
      <circle r={R} fill={base} />
      <path d={blob(r, -R * 0.15, -R * 0.18, R * 0.6, R * 0.5, 8, 0.12)} fill={light} opacity={0.8} />
    </g>
  );
}

// ── Словарь: 38 ингредиентов из menu.ts ──

const greensColors = ["#5f8d36", "#7aa646", "#4b7a2b", "#94bb5a"];

/** Радиус спрайта-основы: чуть больше выреза миски, края срезает clipPath. */
export const BED_R = 32;

// ── Спрайты: каждый рисуется один раз, со своим фиксированным «случаем» ──

const SPRITES: Record<string, (r: Rand) => ReactNode> = {
  "egg-0": (r) => friedEgg(r),
  "egg-1": (r) => friedEgg(r),
  omelet: (r) => omelet(r),
  sausage: () => <Sausage x={0} y={0} rot={0} />,
  "bacon-0": (r) => bacon(r),
  "bacon-1": (r) => bacon(r),
  tomato: () => <TomatoHalf x={0} y={0} />,
  beans: (r) => (
    <g>
      <path d={blob(r, 0.5, 0.9, 9, 8, 8, 0.15)} fill="#8e3216" />
      <path d={blob(r, 0, 0, 9, 8, 8, 0.15)} fill="#c4512a" />
      {spots(r, 11, 6.5, 2.6).map(([x, y], i) => (
        <g key={i} transform={`translate(${f(x)},${f(y)}) rotate(${Math.round(r() * 180)})`}>
          <ellipse rx={1.9} ry={1.3} fill="#e48d55" />
          <ellipse cx={-0.5} cy={-0.4} rx={0.8} ry={0.45} fill="#f6c093" />
        </g>
      ))}
    </g>
  ),
  bread: (r) => {
    const crust = blob(r, 0, 0, 12, 8, 8, 0.07);
    return (
      <g>
        <path d={crust} fill="#8c5524" transform="translate(0.6,1)" />
        <path d={crust} fill="#c3843f" />
        <path d={blob(r, -0.3, -0.3, 10, 6.3, 8, 0.08)} fill="#ecd3a2" />
        {spots(r, 5, 5.5, 3).map(([x, y], i) => (
          <ellipse key={i} cx={f(x * 1.3)} cy={f(y * 0.8)} rx={1.2} ry={0.8} fill="#d6b277" />
        ))}
      </g>
    );
  },
  "mound-buckwheat": (r) => grainBed(r, { R: 9, base: "#b29c66", light: "#c9b67f", grains: ["#8b7646", "#d6c693"], count: 24 }),
  "mound-millet": (r) => grainBed(r, { R: 9, base: "#e9b94f", light: "#f4d17c", grains: ["#f8de94", "#d29d38"], count: 24, size: [0.8, 0.7] }),
  "mound-quinoa": (r) => grainBed(r, { R: 9, base: "#e3d2ad", light: "#f0e5cc", grains: ["#f8f1e0", "#c9a376", "#a8553a"], count: 30, size: [0.75, 0.7] }),
  "bed-buckwheat": (r) => grainBed(r, { R: BED_R, base: "#a99360", light: "#c2ae79", grains: ["#857043", "#d8c995", "#9a8553"], count: 70, size: [1.15, 0.8] }),
  "bed-millet": (r) => grainBed(r, { R: BED_R, base: "#e8b84c", light: "#f3cf74", grains: ["#f8de94", "#d39e39"], count: 80, size: [0.85, 0.75] }),
  "bed-quinoa": (r) =>
    grainBed(r, { R: BED_R, base: "#dccaa2", light: "#ece0c4", grains: ["#f8f1e0", "#c4a073", "#a9543a", "#f3e8d0", "#3f3530", "#b8603e"], count: 110, size: [0.9, 0.78] }),
  "bed-oats": (r) => grainBed(r, { R: BED_R, base: "#e3cfa6", light: "#efe2c5", grains: ["#f8efdb", "#c9ae7f", "#d9c39b"], count: 60, size: [1.7, 1] }),
  // крапинки считаются раньше пюре: такой порядок «случая» был у прежних рисунков — вид не меняется
  "bed-pumpkin": (r) => {
    const specks = speckle(r, 7, BED_R * 0.7, ["#5f7a3a"], 1.4, 0.7, 0.9);
    return (
      <g>
        {puree(r, { R: BED_R, base: "#df7f26", light: "#ef9d45" })}
        {specks}
      </g>
    );
  },
  "bed-mushroom": (r) => {
    const specks = speckle(r, 12, BED_R * 0.85, ["#9a7550", "#7a5a3e"], 1, 0.7, 0.6);
    return (
      <g>
        {puree(r, { R: BED_R, base: "#bf9a70", light: "#d4b48d" })}
        {specks}
        <Mushroom x={BED_R * 0.32} y={-BED_R * 0.3} rot={20} s={0.8} />
      </g>
    );
  },
  "bed-greens": (r) => (
    <g>
      <circle r={BED_R} fill="#3f6a26" />
      {Array.from({ length: 16 }, (_, i) => {
        const k = BED_R * Math.sqrt((i + 0.5) / 16) * 0.78;
        return (
          <Leaf
            key={i}
            x={Math.cos(i * 2.4) * k - 5}
            y={Math.sin(i * 2.4) * k}
            rot={r() * 360}
            len={between(r, 11, 15)}
            w={between(r, 4.2, 6)}
            fill={greensColors[(i * 3) % greensColors.length]}
            vein="#a9cc72"
            shade
          />
        );
      })}
    </g>
  ),
  "bed-tomato": (r) => (
    <g>
      <circle r={BED_R} fill="#ac3220" />
      <path d={blob(r, -BED_R * 0.1, -BED_R * 0.12, BED_R * 0.7, BED_R * 0.6, 9, 0.18)} fill="#c94a2c" />
      <path d={blob(r, BED_R * 0.2, BED_R * 0.25, BED_R * 0.3, BED_R * 0.22, 7, 0.25)} fill="#e06a3e" opacity={0.6} />
      {speckle(r, 14, BED_R * 0.9, ["#8a2414", "#e98a55"], 1.1, 0.8, 0.7)}
    </g>
  ),
  "bed-pasta": (r) => (
    <g>
      <circle r={BED_R} fill="#c99c4e" />
      {noodles(r, BED_R * 0.95, 13)}
    </g>
  ),
  "bed-broth": (r) => (
    <g>
      <circle r={BED_R} fill="#d99c42" />
      <path d={blob(r, -BED_R * 0.1, -BED_R * 0.12, BED_R * 0.68, BED_R * 0.6, 9, 0.12)} fill="#e8b85e" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = r() * Math.PI * 2;
        const d = Math.sqrt(r()) * BED_R * 0.85;
        return <circle key={i} cx={f(Math.cos(a) * d)} cy={f(Math.sin(a) * d)} r={f(between(r, 0.7, 1.7))} fill="#f6d891" opacity={0.75} />;
      })}
    </g>
  ),
  spinach: (r) => (
    <g>
      {[0, 1, 2].map((i) => (
        <Leaf key={i} x={between(r, -3, 0)} y={between(r, -2, 2)} rot={-150 + i * 55 + between(r, -10, 10)} len={12} w={4.6} fill={i === 1 ? "#3c6a2c" : "#4d7d34"} vein="#7aa452" shade />
      ))}
    </g>
  ),
  cheese: (r) => (
    <g>
      {spots(r, 3, 5, 4.5).map(([x, y], i) => (
        <g key={i}>
          <path d={blob(r, x + 0.3, y + 0.6, 3.4, 2, 5, 0.35)} fill="#c9a74f" />
          <path d={blob(r, x, y, 3.4, 2, 5, 0.35)} fill="#f5df95" />
        </g>
      ))}
    </g>
  ),
  pumpkin: (r) => (
    <g>
      {spots(r, 3, 4.5, 6).map(([x, y], i) => (
        <g key={i} transform={`translate(${f(x)},${f(y)}) rotate(${Math.round(between(r, -30, 30))})`}>
          <rect x={-2.6} y={-2.2} width={5.4} height={5.4} rx={1.3} fill="#b55d16" />
          <rect x={-2.9} y={-2.9} width={5.4} height={5.4} rx={1.3} fill="#e8862c" />
          <rect x={-2.2} y={-2.2} width={2.6} height={2.2} rx={0.8} fill="#f6ad5d" />
        </g>
      ))}
    </g>
  ),
  walnut: () => <Walnut x={0} y={0} rot={0} />,
  "nut-top": (r) => (
    <g>
      {spots(r, 3, 4, 3.2).map(([x, y], i) => (
        <Walnut key={i} x={x} y={y} rot={r() * 360} s={0.55} />
      ))}
    </g>
  ),
  oats: (r) => (
    <g>
      <path d={blob(r, 0.6, 1, 11.5, 10.5, 9, 0.1)} fill="#c7aa7c" />
      <path d={blob(r, 0, 0, 11.5, 10.5, 9, 0.1)} fill="#efe1c4" />
      <path d={blob(r, -2, -2.4, 6.5, 5, 7, 0.15)} fill="#f8f0de" />
      {speckle(r, 20, 9.5, ["#fbf6ea", "#dcc79f"], 1.5, 0.8, 1)}
    </g>
  ),
  berries: (r) => (
    <g>
      {spots(r, 5, 6, 4.6).map(([x, y], i) => (i % 2 === 0 ? <Raspberry key={i} x={x} y={y} /> : <Blueberry key={i} x={x} y={y} />))}
    </g>
  ),
  "berries-top": () => (
    <g>
      <Raspberry x={-3} y={0} s={0.9} />
      <Blueberry x={2.6} y={-1.6} s={0.9} />
      <Raspberry x={3.4} y={2.4} s={0.75} />
    </g>
  ),
  banana: (r) => (
    <g>
      {spots(r, 4, 5.5, 5.4).map(([x, y], i) => (
        <g key={i} transform={`translate(${f(x)},${f(y)})`}>
          <circle cx={0.3} cy={0.6} r={4.3} fill="#c9ad5e" />
          <circle r={4.3} fill="#f6e7ad" />
          <circle r={2.4} fill="#efd88f" />
          {[0, 120, 240].map((a) => (
            <ellipse key={a} cx={0.9} cy={0} rx={0.55} ry={0.3} fill="#a8894c" transform={`rotate(${a + i * 20})`} />
          ))}
        </g>
      ))}
    </g>
  ),
  dollop: (r) => dollop(r),
  swirl: () => <Swirl />,
  syrnik: () => <Syrnik x={0} y={0} />,
  pancake: (r) => pancake(r, 1.05),
  croissant: (r) => croissant(r),
  avocado: () => {
    const d = "M0,-12C6,-12 8,-5 9,1C10,8 6,12 0,12C-6,12 -10,8 -9,1C-8,-5 -6,-12 0,-12Z";
    return (
      <g transform="rotate(28)">
        <path d={d} fill="#26381a" transform="translate(0.6,1)" />
        <path d={d} fill="#3b5626" />
        <path d={d} fill="#a5c45a" transform="scale(0.86) translate(0,0.6)" />
        <path d={d} fill="#dfe79d" transform="scale(0.62) translate(0,2.6)" />
        <circle cx={0} cy={3.4} r={3.9} fill="#6f4425" />
        <circle cx={0} cy={3.4} r={3.6} fill="#9a6235" />
        <Shine x={-1.2} y={2.2} rx={1.3} ry={0.8} o={0.45} rot={-30} />
      </g>
    );
  },
  greens: (r) => sprig(r, { n: 7, len: 9.5, w: 3.2 }),
  "greens-s": (r) => sprig(r, { n: 5, len: 7.5, w: 2.4 }),
  salmon: (r) => (
    <g>
      {[-3.6, 3.6].map((y, i) => (
        <g key={i} transform={`translate(${f(between(r, -1, 1))},${y}) rotate(${Math.round(between(r, -14, 14))})`}>
          <path d={wavy(20, 7, 1.4, i * 2)} fill="#c95a36" transform="translate(0.4,0.8)" />
          <path d={wavy(20, 7, 1.4, i * 2)} fill="#f2875a" />
          {[-5, 0, 5].map((x) => (
            <path key={x} d={`M${x - 1.6},-2.6L${x + 1.6},2.6`} stroke="#fbc8a8" strokeWidth={1} strokeLinecap="round" />
          ))}
        </g>
      ))}
    </g>
  ),
  trout: (r) => (
    <g>
      {[-3.4, 3.8].map((y, i) => (
        <g key={i} transform={`translate(${f(between(r, -1, 1))},${y}) rotate(${Math.round(between(r, -16, 16))})`}>
          <path d={wavy(19, 6.6, 1.6, i * 2 + 1)} fill="#b8482c" transform="translate(0.4,0.8)" />
          <path d={wavy(19, 6.6, 1.6, i * 2 + 1)} fill="#e8714a" />
          <path d={wavy(16, 1.4, 1.4, i * 2 + 1)} fill="#f7b08c" transform="translate(0,-1.2)" />
        </g>
      ))}
    </g>
  ),
  tuna: (r) => (
    <g>
      {[-6.5, 0, 6.5].map((x, i) => (
        <g key={i} transform={`translate(${x},${f(between(r, -1, 1))}) rotate(${Math.round(between(r, -6, 6) + 64 + i * 14)})`}>
          <rect x={-8} y={-3.6} width={16} height={7.2} rx={1.4} fill="#4f3830" transform="translate(0.4,0.8)" />
          <rect x={-8} y={-3.6} width={16} height={7.2} rx={1.4} fill="#7e6052" />
          <rect x={-6.6} y={-2.3} width={13.2} height={4.6} rx={1} fill="#c84a5c" />
          <rect x={-5.6} y={-1.6} width={6} height={1} rx={0.5} fill="#e27a88" opacity={0.7} />
        </g>
      ))}
    </g>
  ),
  shrimp: () => <Shrimp x={0} y={0} rot={0} />,
  chicken: (r) => (
    <g>
      {[-4.4, 0, 4.4].map((y, i) => (
        <Strip key={i} x={between(r, -1, 1)} y={y} rot={between(r, -8, 8) - 10} len={18 - Math.abs(y) * 0.6} w={4.6} fill="#e5bb88" under="#a87447" mark="#a3683a" />
      ))}
    </g>
  ),
  "chicken-bits": (r) => (
    <g>
      {spots(r, 4, 6, 5).map(([x, y], i) => (
        <g key={i}>
          <path d={blob(r, x + 0.4, y + 0.7, 3, 2.4, 6, 0.2)} fill="#b8895a" />
          <path d={blob(r, x, y, 3, 2.4, 6, 0.2)} fill="#ecd0a6" />
        </g>
      ))}
    </g>
  ),
  mushroom: () => <Mushroom x={0} y={0} rot={0} />,
  pepper: (r) => (
    <g fill="none" strokeLinecap="round">
      {[
        ["#d6402c", "#a52c1d"],
        ["#eeb02b", "#c4861c"],
        ["#d6402c", "#a52c1d"],
      ].map(([c, u], i) => (
        <g key={i} transform={`translate(${f(between(r, -4, 4))},${-4 + i * 4}) rotate(${Math.round(between(r, 0, 360))})`}>
          <path d="M-5,0A6,4.6 0 0 1 5,0" stroke={u} strokeWidth={3} transform="translate(0.3,0.6)" />
          <path d="M-5,0A6,4.6 0 0 1 5,0" stroke={c} strokeWidth={2.8} />
        </g>
      ))}
    </g>
  ),
  "pasta-nest": (r) => pastaNest(r, 13),
  noodles: (r) => noodles(r, 8, 4),
  croutons: (r) => (
    <g>
      {spots(r, 4, 5, 4.6).map(([x, y], i) => (
        <Crouton key={i} x={x} y={y} rot={r() * 90} />
      ))}
    </g>
  ),
  cucumber: (r) => (
    <g>
      {spots(r, 3, 4.5, 5.6).map(([x, y], i) => (
        <CucumberSlice key={i} x={x} y={y} />
      ))}
    </g>
  ),
  chocolate: (r) => {
    const pts: string[] = [];
    for (let i = 0; i <= 6; i++) pts.push(`${f(-11 + i * 3.7)},${f((i % 2 ? -1 : 1) * between(r, 5, 8))}`);
    const d = `M${pts.join("L")}`;
    return (
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d={d} stroke="#2c140b" strokeWidth={2.6} transform="translate(0.3,0.6)" opacity={0.5} />
        <path d={d} stroke="#4a2618" strokeWidth={2.2} />
        <path d={d} stroke="#7a4a30" strokeWidth={0.7} transform="translate(-0.4,-0.5)" />
      </g>
    );
  },
  "chocolate-top": (r) => (
    <g>
      {spots(r, 4, 4.5, 2.8).map(([x, y], i) => (
        <rect key={i} x={f(x - 1.4)} y={f(y - 0.6)} width={2.8} height={1.2} rx={0.6} fill="#3d1f12" transform={`rotate(${Math.round(r() * 180)} ${f(x)} ${f(y)})`} />
      ))}
    </g>
  ),
  lemon: () => <LemonSlice x={0} y={0} />,
  pistachio: (r) => (
    <g>
      {spots(r, 9, 6, 2.2).map(([x, y], i) => (
        <path key={i} d={blob(r, x, y, 1.5, 1.1, 5, 0.35)} fill={["#9cbf5a", "#c3d887", "#7e9f46"][i % 3]} />
      ))}
      <ellipse cx={2} cy={-1} rx={2.4} ry={1.6} fill="#8fb04f" transform="rotate(30 2 -1)" />
      <ellipse cx={1.4} cy={-1.4} rx={1.2} ry={0.7} fill="#c9a07a" opacity={0.8} transform="rotate(30 2 -1)" />
    </g>
  ),
  "pistachio-top": (r) => (
    <g>
      {spots(r, 7, 4.5, 1.8).map(([x, y], i) => (
        <path key={i} d={blob(r, x, y, 1.2, 0.9, 5, 0.35)} fill={["#9cbf5a", "#c3d887", "#7e9f46"][i % 3]} />
      ))}
    </g>
  ),
  waffle: () => <Waffle green={false} />,
  "waffle-green": () => <Waffle green />,
  caramel: (r) => (
    <g>
      <path d={blob(r, 0.4, 0.7, 6, 5, 7, 0.2)} fill="#7f4718" />
      <path d={blob(r, 0, 0, 6, 5, 7, 0.2)} fill="#b8702e" />
      <Shine x={-1.8} y={-1.6} rx={2} ry={1} o={0.4} rot={-30} />
    </g>
  ),
  macarons: () => (
    <g>
      <MacaronSide x={-3} y={-8} rot={-7} color="#a9c27b" shade="#7d9757" />
      <MacaronSide x={4} y={0} rot={5} color="#c75d6d" shade="#9b3f4e" />
      <MacaronSide x={-1.5} y={8.5} rot={-3} color="#d9a466" shade="#a9773f" />
    </g>
  ),
  crumbs: (r) => crumbs(r),
};

/** Все спрайты ингредиентов — для <ArtDefs />. */
export function IngredientSprites() {
  return (
    <>
      {Object.entries(SPRITES).map(([name, draw]) => (
        <g key={name} id={`pk-${name}`}>
          {draw(rand(`sprite:${name}`))}
        </g>
      ))}
    </>
  );
}

function sprig(r: Rand, { n, len, w }: { n: number; len: number; w: number }) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => (
        <Leaf
          key={i}
          x={between(r, -1.5, 1.5)}
          y={between(r, -1.5, 1.5)}
          rot={(i / n) * 360 + between(r, -20, 20)}
          len={len}
          w={w}
          fill={greensColors[i % greensColors.length]}
          shade
        />
      ))}
    </g>
  );
}

function MacaronSide({ x, y, rot, color, shade }: { x: number; y: number; rot: number; color: string; shade: string }) {
  return (
    <g transform={`translate(${x},${y}) rotate(${rot})`}>
      <path d="M-8.8,-0.4C-8.8,-6 8.8,-6 8.8,-0.4L8.8,4.2C8.8,7.4 -8.8,7.4 -8.8,4.2Z" fill="#3a2114" opacity={0.25} transform="translate(0.6,1.2)" />
      <path d="M-8.8,-0.8C-8.8,-6 8.8,-6 8.8,-0.8Z" fill={color} />
      <rect x={-8.6} y={-1.4} width={17.2} height={1.6} rx={0.7} fill={shade} />
      <rect x={-7.8} y={0.2} width={15.6} height={2.2} rx={1} fill="#f7ecd6" />
      <rect x={-8.6} y={2.4} width={17.2} height={1.6} rx={0.7} fill={shade} />
      <path d="M-8.8,4C-8.8,7 8.8,7 8.8,4Z" fill={color} />
      <path d="M-5.6,-3.4C-3.4,-4.6 0,-4.8 2,-4.4" fill="none" stroke="#ffffff" strokeOpacity={0.45} strokeWidth={1.1} strokeLinecap="round" />
    </g>
  );
}

// ── Словарь: 38 ингредиентов из menu.ts. Порция = одна или несколько ссылок на спрайты ──

/** Несколько одинаковых кусочков россыпью: помидоры, орехи. */
const scatter = (r: Rand, id: string, count: number, R: number, gap: number, s = 1) =>
  spots(r, count, R, gap).map(([x, y], i) => <Use key={i} id={id} x={x} y={y} rot={r() * 360} s={s} />);

export const INGREDIENTS: Record<string, IngredientDef> = {
  egg: {
    draw: ({ r, role, dish }) => {
      if (role === "solo") return <Use id="omelet" />;
      if (dish === "deep") {
        return (
          <>
            <Use id="egg-0" x={-5} y={-4} s={0.78} />
            <Use id="egg-1" x={6} y={5} s={0.72} />
          </>
        );
      }
      return <Use id={r() < 0.5 ? "egg-0" : "egg-1"} />;
    },
  },
  sausage: {
    draw: ({ r }) => (
      <>
        <Use id="sausage" y={-4} rot={between(r, -12, 4)} />
        <Use id="sausage" x={1.5} y={4} rot={between(r, -4, 12)} />
      </>
    ),
  },
  bacon: {
    draw: ({ r }) => (
      <>
        <Use id="bacon-0" y={-3.6} rot={between(r, -10, 6)} />
        <Use id="bacon-1" x={1} y={3.6} rot={between(r, -4, 10)} />
      </>
    ),
  },
  tomato: {
    draw: ({ r, role }) => scatter(r, "tomato", role === "hero" ? 3 : 2, 5, 8.5, role === "garnish" ? 0.75 : 1),
    bed: { dishes: ["deep"], sprite: "bed-tomato" },
    layer: "#c9452f",
  },
  beans: { draw: () => <Use id="beans" /> },
  bread: { draw: () => <Use id="bread" /> },
  buckwheat: { draw: () => <Use id="mound-buckwheat" />, bed: { dishes: ["bowl"], sprite: "bed-buckwheat" } },
  spinach: { draw: () => <Use id="spinach" />, layer: "#4d7d34" },
  cheese: { draw: () => <Use id="cheese" />, layer: "#f1d9a0", garnish: (dish) => dish !== "slice" },
  millet: { draw: () => <Use id="mound-millet" />, bed: { dishes: ["bowl"], sprite: "bed-millet" } },
  pumpkin: { draw: () => <Use id="pumpkin" />, bed: { dishes: ["bowl"], sprite: "bed-pumpkin" } },
  nut: {
    draw: ({ r, role }) => scatter(r, "walnut", role === "garnish" ? 2 : 3, 4.5, 5.5, role === "garnish" ? 0.8 : 1),
    layer: "#b98552",
    topping: () => <Use id="nut-top" />,
    garnish: (dish) => dish === "bowl",
  },
  oats: { draw: () => <Use id="oats" />, bed: { dishes: ["bowl"], sprite: "bed-oats" } },
  berries: {
    draw: ({ role }) => <Use id="berries" s={role === "garnish" ? 0.85 : 1} />,
    layer: "#a5243f",
    topping: () => <Use id="berries-top" />,
  },
  banana: { draw: () => <Use id="banana" /> },
  cream: {
    draw: ({ dish, all }) => (dish === "bowl" || dish === "deep" ? <Use id="swirl" s={all.length > 3 ? 1 : 1.2} /> : <Use id="dollop" />),
    layer: "#f7ecd9",
    topping: () => <Use id="dollop" s={0.55} />,
    garnish: (dish) => dish === "bowl" || dish === "deep",
  },
  curd: {
    draw: ({ role }) =>
      role === "hero" || role === "solo" ? (
        <>
          <Use id="syrnik" x={-5.5} y={-3.5} />
          <Use id="syrnik" x={6} y={-2} s={0.95} />
          <Use id="syrnik" y={6} s={0.98} />
        </>
      ) : (
        <>
          <Use id="syrnik" x={-3.5} y={-1.5} s={0.8} />
          <Use id="syrnik" x={3.8} y={2} s={0.78} />
        </>
      ),
    layer: "#f6efe2",
  },
  pancake: { draw: () => <Use id="pancake" /> },
  croissant: { draw: () => <Use id="croissant" s={1.05} /> },
  avocado: { draw: () => <Use id="avocado" />, layer: "#b9cf6a" },
  greens: {
    draw: ({ role }) => <Use id={role === "garnish" ? "greens-s" : "greens"} />,
    bed: { dishes: ["bowl"], sprite: "bed-greens" },
    garnish: () => true,
  },
  salmon: { draw: () => <Use id="salmon" /> },
  trout: { draw: () => <Use id="trout" /> },
  tuna: { draw: () => <Use id="tuna" /> },
  shrimp: {
    draw: ({ r }) => (
      <>
        <Use id="shrimp" x={-4} y={-2} rot={r() * 360} />
        <Use id="shrimp" x={4.6} y={3} rot={r() * 360} s={0.95} />
      </>
    ),
  },
  chicken: { draw: ({ dish }) => <Use id={dish === "bowl" ? "chicken-bits" : "chicken"} /> },
  mushroom: {
    draw: ({ r }) => (
      <>
        <Use id="mushroom" x={-4} y={-2} rot={between(r, -40, 40)} />
        <Use id="mushroom" x={4.5} y={3} rot={between(r, -40, 40)} s={0.9} />
      </>
    ),
    bed: { dishes: ["bowl"], sprite: "bed-mushroom" },
  },
  pepper: { draw: () => <Use id="pepper" /> },
  pasta: {
    draw: ({ role, dish }) => {
      if (dish === "bowl") return <Use id="noodles" />;
      return <Use id="pasta-nest" s={role === "hero" || role === "solo" ? 1 : 0.7} />;
    },
    bed: { dishes: ["deep"], sprite: "bed-pasta" },
  },
  crouton: { draw: () => <Use id="croutons" /> },
  cucumber: { draw: () => <Use id="cucumber" /> },
  chocolate: { draw: () => <Use id="chocolate" />, layer: "#4f2a1a", topping: () => <Use id="chocolate-top" />, garnish: () => true },
  lemon: {
    draw: ({ role }) => <Use id="lemon" s={role === "garnish" ? 0.8 : 1} />,
    layer: "#f1cf47",
    topping: () => <Use id="lemon" s={0.5} />,
  },
  pistachio: { draw: () => <Use id="pistachio" />, layer: "#b7cb7c", topping: () => <Use id="pistachio-top" />, garnish: () => true },
  waffle: { draw: ({ all }) => <Use id={all.includes("spinach") ? "waffle-green" : "waffle"} /> },
  caramel: { draw: () => <Use id="caramel" />, layer: "#c08040" },
  quinoa: { draw: () => <Use id="mound-quinoa" />, bed: { dishes: ["bowl"], sprite: "bed-quinoa" } },
  macaron: { draw: () => <Use id="macarons" /> },
};

/** Нейтральная «крошка» для неизвестного имени: рисунок не падает. */
export const CRUMB: IngredientDef = {
  draw: () => <Use id="crumbs" />,
  layer: "#d8c3a0",
};

export function ingredient(name: string): IngredientDef {
  return INGREDIENTS[name] ?? CRUMB;
}
