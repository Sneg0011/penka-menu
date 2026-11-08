import type { ReactNode } from "react";

import type { Art, Dish } from "@/content/types";
import { mixColor } from "@/lib/theme";

import { type DrawCtx, type Role, BED_R, ingredient } from "./ingredients";
import { type Rand, Use, between, blob, f, place, rand, svgProps } from "./shared";

export type FoodArtData = Extract<Art, { type: "food" }>;

type Props = {
  art: FoodArtData;
  /** Сторона квадрата в px. */
  size: number;
  /** Строка для раскладки (обычно id позиции); по умолчанию — посуда и состав. */
  seed?: string;
  className?: string;
};

// Вид сверху, свет сверху-слева: тень посуды уходит вправо-вниз.
// Посуда, основы и кусочки — спрайты из <ArtDefs />; здесь только раскладка по данным позиции.

type Placed = { name: string; x: number; y: number; rot: number; s: number; role: Role };

function Portion({ p, dish, all, seed }: { p: Placed; dish: Dish; all: string[]; seed: string }) {
  const ctx: DrawCtx = { r: rand(`${seed}:${p.name}:${p.role}`), role: p.role, dish, all };
  return (
    <g data-ingredient={p.name} transform={place(p.x, p.y, p.rot, p.s)}>
      {ingredient(p.name).draw(ctx)}
    </g>
  );
}

const isGarnish = (name: string, dish: Dish) => ingredient(name).garnish?.(dish) ?? false;

/** Главное чуть в сторону, остальное — дугой с другой стороны, с лёгким наложением. */
function layoutPlate(names: string[], dish: Dish, r: Rand, cx: number, cy: number): Placed[] {
  const [hero, ...rest] = names;
  const sides = rest.filter((n) => !isGarnish(n, dish));
  const garnish = rest.filter((n) => isGarnish(n, dish));
  const k = sides.length;
  const solo = names.length === 1;

  const heroAngle = r() * Math.PI * 2;
  const shift = k ? 4.5 : 0;
  const hx = cx + Math.cos(heroAngle) * shift;
  const hy = cy + Math.sin(heroAngle) * shift;
  const heroScale = solo ? 1.75 : k >= 4 ? 1.2 : k === 3 ? 1.3 : k === 2 ? 1.4 : 1.45;
  const out: Placed[] = [{ name: hero, x: hx, y: hy, rot: between(r, -25, 25), s: heroScale, role: solo ? "solo" : "hero" }];

  const step = (55 * Math.PI) / 180;
  const sideScale = k >= 4 ? 0.85 : k === 3 ? 0.95 : 1;
  const dist = k >= 4 ? 19.5 : 18;
  sides.forEach((name, i) => {
    const a = heroAngle + Math.PI + (i - (k - 1) / 2) * step + between(r, -0.14, 0.14);
    const d = dist + between(r, -1.5, 1.5);
    out.push({ name, x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, rot: r() * 360, s: sideScale * between(r, 0.94, 1.06), role: "side" });
  });

  garnish.forEach((name, i) => {
    const a = heroAngle + Math.PI * 0.7 + i * 2.2 + between(r, -0.4, 0.4);
    const d = name === "chocolate" ? 1 : between(r, 6, 10);
    out.push({ name, x: hx + Math.cos(a) * d, y: hy + Math.sin(a) * d, rot: r() * 360, s: name === "chocolate" ? heroScale * 0.9 : 1, role: "garnish" });
  });
  return out;
}

/** На основе (каша, суп, салат): кусочки кольцом, зелень и сыр — россыпью сверху. */
function layoutTopping(names: string[], dish: Dish, r: Rand, cx: number, cy: number): Placed[] {
  const pieces = names.filter((n) => !isGarnish(n, dish));
  const garnish = names.filter((n) => isGarnish(n, dish));
  const k = pieces.length;
  const start = r() * Math.PI * 2;
  const ring = k <= 1 ? 7 : k === 2 ? 10.5 : 13.5;
  const scale = k >= 3 ? 0.92 : k === 2 ? 1.1 : 1.3;
  const out: Placed[] = pieces.map((name, i) => {
    const a = start + (i * Math.PI * 2) / Math.max(k, 1) + between(r, -0.3, 0.3);
    const d = ring * between(r, 0.85, 1.1);
    return { name, x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, rot: r() * 360, s: scale, role: "side" };
  });
  garnish.forEach((name, i) => {
    const a = start + Math.PI / Math.max(k, 1) + i * 2.4 + between(r, -0.3, 0.3);
    const d = name === "cream" ? between(r, 0, 4) : between(r, 4, 12);
    out.push({ name, x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, rot: r() * 360, s: name === "cream" ? 1.15 : 0.95, role: "garnish" });
  });
  return out;
}

/** Основа миски или сковороды: первый ингредиент, который умеет быть основой; зелень в конце — посыпка. */
function pickBed(names: string[], dish: Dish) {
  return names.findIndex((n, i) => {
    const bed = ingredient(n).bed;
    if (!bed || !bed.dishes.includes(dish)) return false;
    return !(n === "greens" && i === names.length - 1 && names.length > 1);
  });
}

/** Центры мисок: сковорода сдвинута, чтобы влезла ручка. */
const BOWL = { bowl: [50, 49], deep: [46, 47] } as const;

export function FoodArt({ art, size, seed, className }: Props) {
  const names = art.ingredients.length ? art.ingredients : ["crumb"];
  const key = seed ?? `${art.dish}:${names.join(",")}`;
  const dish = art.dish;

  // Генератор раскладки создаётся и расходуется здесь же, синхронно (раскладка — обычные функции).
  // Кусок торта и выпечка заводят свой из того же ключа: компонент, получивший `r` пропом,
  // при повторном рендере (StrictMode, гидратация) вытянул бы следующие числа.
  let body: ReactNode;
  if (dish === "plate") {
    const r = rand(key);
    body = (
      <>
        <use href="#pk-plate" />
        {layoutPlate(names, dish, r, 50, 49).map((p, i) => (
          <Portion key={i} p={p} dish={dish} all={names} seed={key} />
        ))}
      </>
    );
  } else if (dish === "bowl" || dish === "deep") {
    const r = rand(key);
    const [cx, cy] = BOWL[dish];
    const bedIndex = pickBed(names, dish);
    const bedName = bedIndex >= 0 ? names[bedIndex] : null;
    const toppings = names.filter((_, i) => i !== bedIndex);
    const bed = <Use id={bedName ? ingredient(bedName).bed!.sprite : "bed-broth"} x={cx} y={cy} />;
    body = (
      <>
        <use href={dish === "bowl" ? "#pk-bowl" : "#pk-pan"} />
        <g clipPath={`url(#pk-clip-${dish})`}>
          {bedName ? <g data-ingredient={bedName}>{bed}</g> : bed}
          {layoutTopping(toppings, dish, r, cx, cy).map((p, i) => (
            <Portion key={i} p={p} dish={dish} all={names} seed={key} />
          ))}
          <use href={`#pk-${dish}-inset`} />
        </g>
      </>
    );
  } else if (dish === "slice") {
    body = <Slice names={names} seed={key} />;
  } else {
    body = <Pastry names={names} seed={key} />;
  }

  return (
    <svg {...svgProps(size, className)}>
      <g filter="url(#pk-grain)">{body}</g>
    </svg>
  );
}

// ── Кусок торта: вид чуть сбоку, чтобы читались слои ──

const A = [19, 50] as const;
const B = [69, 29] as const;
const C = [81, 46] as const;
const H = 21;
const CRUST = 3.8;

const band = (y0: number, y1: number) => `M${A[0]},${f(A[1] + y0)}L${C[0]},${f(C[1] + y0)}L${C[0]},${f(C[1] + y1)}L${A[0]},${f(A[1] + y1)}Z`;
const topFace = `M${A[0]},${A[1]}L${B[0]},${B[1]}Q${C[0] + 5},${B[1] + 2} ${C[0]},${C[1]}Z`;

function Slice({ names, seed }: { names: string[]; seed: string }) {
  const r = rand(seed);
  const [topName] = names;
  const topBand = Math.min(5, (H - CRUST) / names.length);
  const rest = names.length > 1 ? (H - CRUST - topBand) / (names.length - 1) : 0;

  let y = 0;
  const layers = names.map((name, i) => {
    const h = i === 0 ? topBand : rest;
    const d = band(y, y + h);
    y += h;
    return (
      <g key={i} data-ingredient={name}>
        <path d={d} fill={ingredient(name).layer ?? "#d8c3a0"} />
      </g>
    );
  });
  const topColor = mixColor(ingredient(topName).layer ?? "#d8c3a0", "#ffffff", 0.12);
  const anchors: [number, number][] = [
    [63, 39],
    [48, 44],
    [72, 42],
  ];
  const toppings = names
    .filter((n) => ingredient(n).topping)
    .slice(0, 3)
    .map((name, i) => {
      const [x, yy] = anchors[i];
      const ctx: DrawCtx = { r: rand(`${seed}:top:${name}`), role: "garnish", dish: "slice", all: names };
      return (
        <g key={name} data-ingredient={name} transform={place(x, yy, between(r, -20, 20))}>
          {ingredient(name).topping!(ctx)}
        </g>
      );
    });

  return (
    <>
      <use href="#pk-plate-s" />
      <g transform={`rotate(${Math.round(between(r, -5, 5))} 50 50)`}>
        <use href="#pk-slice-shadow" />
        {layers}
        <use href="#pk-slice-crust" />
        <use href="#pk-slice-top" fill={topColor} stroke={mixColor(topColor, "#3a2114", 0.3)} />
        <use href="#pk-slice-edge" />
        {toppings}
      </g>
    </>
  );
}

// ── Выпечка на пергаменте ──

function Pastry({ names, seed }: { names: string[]; seed: string }) {
  const r = rand(seed);
  const has = (n: string) => names.includes(n);
  const ctx = (name: string, role: Role = "hero"): DrawCtx => ({ r: rand(`${seed}:${name}`), role, dish: "pastry", all: names });
  const turn = between(r, -16, -6);
  let hero: ReactNode;
  let used: string[] = [];

  if (has("croissant")) {
    used = ["croissant", "cream", "lemon"];
    hero = (
      <>
        <g data-ingredient="croissant" transform={place(50, 48, turn, 2.05)}>
          <Use id="croissant" />
        </g>
        {has("cream") && (
          <g data-ingredient="cream" transform={place(50, 48, turn)}>
            <Use id="napoleon" />
          </g>
        )}
        {has("lemon") && (
          <g data-ingredient="lemon">
            <Use id="lemon-drizzle" x={50} y={48} rot={turn} />
            <Use id="lemon" x={73} y={73} s={1.3} />
          </g>
        )}
      </>
    );
  } else if (has("macaron")) {
    used = ["macaron"];
    hero = (
      <g data-ingredient="macaron" transform={place(50, 50, turn, 1.85)}>
        {ingredient("macaron").draw(ctx("macaron"))}
      </g>
    );
  } else if (has("waffle")) {
    used = ["waffle", "caramel"];
    hero = (
      <g transform={place(50, 50, turn - 18)}>
        <g data-ingredient="waffle">
          <Use id="wafers" />
        </g>
        {has("caramel") && (
          <g data-ingredient="caramel">
            <Use id="wafer-caramel" />
          </g>
        )}
      </g>
    );
  } else {
    const flavour = names.find((n) => n !== "cream");
    used = flavour ? [flavour, "cream"] : ["cream"];
    hero = flavour ? (
      <Eclair name={flavour} turn={turn} names={names} seed={seed} />
    ) : (
      <>
        <g data-ingredient="cream">
          <use href="#pk-choux-cream" />
        </g>
        <use href="#pk-choux" />
      </>
    );
  }

  const accents = names.filter((n) => !used.includes(n));
  return (
    <>
      <use href="#pk-parchment" transform={`rotate(${Math.round(between(r, -10, -4))} 50 50)`} />
      {hero}
      {accents.map((name, i) => (
        <g key={name} data-ingredient={name} transform={place(i % 2 ? 28 : 73, i % 2 ? 28 : 73, 0, 0.7)}>
          {ingredient(name).draw(ctx(name, "side"))}
        </g>
      ))}
    </>
  );
}

function Eclair({ name, turn, names, seed }: { name: string; turn: number; names: string[]; seed: string }) {
  const def = ingredient(name);
  const ctx: DrawCtx = { r: rand(`${seed}:${name}`), role: "garnish", dish: "pastry", all: names };
  const glaze = def.layer ?? "#4f2a1a";
  return (
    <g transform={place(50, 50, turn - 8, 1.22)}>
      <use href="#pk-eclair" />
      <g data-ingredient="cream">
        <use href="#pk-eclair-cream" />
      </g>
      <g data-ingredient={name}>
        <use href="#pk-eclair-glaze" fill={mixColor(glaze, "#000000", 0.18)} transform="translate(0,0.6)" />
        <use href="#pk-eclair-glaze" fill={glaze} />
        <rect x={-18} y={-4.6} width={22} height={1.6} rx={0.8} fill="#ffffff" opacity={0.4} />
        {def.topping &&
          [-11, 1.5, 13].map((x) => (
            <g key={x} transform={place(x, -0.8, 0, 0.85)}>
              {def.topping!(ctx)}
            </g>
          ))}
      </g>
    </g>
  );
}

// ── Неизменная посуда и выпечка: один раз на страницу, в <ArtDefs /> ──

function PlateBase({ cx, cy, R, well }: { cx: number; cy: number; R: number; well: number }) {
  return (
    <>
      <circle cx={cx + 1.8} cy={cy + 2.8} r={R + 6} fill="url(#pk-dish-shadow)" />
      <circle cx={cx} cy={cy} r={R} fill="#9a6b48" />
      <circle cx={cx} cy={cy} r={R - 1.2} fill="url(#pk-plate-glaze)" />
      <circle cx={cx} cy={cy} r={well} fill="url(#pk-well)" />
      <path d={`M${f(cx + well * 0.94)},${f(cy + well * 0.34)}A${well},${well} 0 0 1 ${f(cx - well * 0.34)},${f(cy + well * 0.94)}`} fill="none" stroke="#ffffff" strokeOpacity={0.8} strokeWidth={1} strokeLinecap="round" />
    </>
  );
}

function ChouxSprites() {
  const r = rand("sprite:choux");
  const ring = (outer: string, inner: number) => `${outer}M50,${50 - inner}A${inner},${inner} 0 1 0 50,${50 + inner}A${inner},${inner} 0 1 0 50,${50 - inner}Z`;
  const cream = ring(blob(r, 50, 50, 26.5, 26.5, 22, 0.05), 8.5);
  const choux = ring(blob(r, 50, 50, 21, 21, 14, 0.06), 10.5);
  const glow = ring(blob(r, 49, 49, 17, 17, 12, 0.08), 13);
  return (
    <>
      <g id="pk-choux-cream">
        <path d={cream} fillRule="evenodd" fill="#e2d2b4" transform="translate(0.5,1)" />
        <path d={cream} fillRule="evenodd" fill="#f8efdd" />
      </g>
      <g id="pk-choux">
        <path d={choux} fillRule="evenodd" fill="#a6682a" transform="translate(0.6,1.2)" />
        <path d={choux} fillRule="evenodd" fill="#d89f52" />
        <path d={glow} fillRule="evenodd" fill="#ebbd70" opacity={0.75} />
        {Array.from({ length: 26 }, (_, i) => {
          const a = r() * Math.PI * 2;
          const d = between(r, 12, 19.5);
          return <circle key={i} cx={f(50 + Math.cos(a) * d)} cy={f(50 + Math.sin(a) * d)} r={f(between(r, 0.5, 1))} fill="#fffaf0" opacity={0.9} />;
        })}
      </g>
    </>
  );
}

const WAFER_ROWS = [
  [-1.5, -10.5],
  [2, 0],
  [-0.5, 10.5],
] as const;

/** Градиенты, обрезка мисок, посуда, торт и выпечка — для <ArtDefs />. */
export function FoodDefs() {
  const crumbs = rand("sprite:napoleon");
  return (
    <>
      <radialGradient id="pk-dish-shadow">
        <stop offset="0.78" stopColor="#24130a" stopOpacity={0.34} />
        <stop offset="0.9" stopColor="#24130a" stopOpacity={0.13} />
        <stop offset="1" stopColor="#24130a" stopOpacity={0} />
      </radialGradient>
      <linearGradient id="pk-plate-glaze" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fcf9f3" />
        <stop offset="1" stopColor="#e5dacb" />
      </linearGradient>
      <radialGradient id="pk-well" cx="0.55" cy="0.58" r="0.56">
        <stop offset="0.72" stopColor="#f7f2ea" />
        <stop offset="1" stopColor="#dcd0bd" />
      </radialGradient>
      <radialGradient id="pk-inset" cx="0.56" cy="0.6" r="0.58">
        <stop offset="0.72" stopColor="#1e1008" stopOpacity={0} />
        <stop offset="1" stopColor="#1e1008" stopOpacity={0.38} />
      </radialGradient>
      <linearGradient id="pk-bowl-glaze" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#efe2cc" />
        <stop offset="1" stopColor="#cdb795" />
      </linearGradient>
      <radialGradient id="pk-bowl-wall" cx="0.58" cy="0.62" r="0.6">
        <stop offset="0.6" stopColor="#f6efe4" />
        <stop offset="1" stopColor="#cfc1aa" />
      </radialGradient>

      {(["bowl", "deep"] as const).map((dish) => {
        const [cx, cy] = BOWL[dish];
        return (
          <clipPath key={dish} id={`pk-clip-${dish}`}>
            <circle cx={cx} cy={cy} r={31} />
          </clipPath>
        );
      })}
      {(["bowl", "deep"] as const).map((dish) => {
        const [cx, cy] = BOWL[dish];
        return <circle key={dish} id={`pk-${dish}-inset`} cx={cx} cy={cy} r={BED_R} fill="url(#pk-inset)" />;
      })}

      <g id="pk-plate">
        <PlateBase cx={50} cy={49} R={44} well={31} />
      </g>
      <g id="pk-plate-s">
        <PlateBase cx={50} cy={51} R={41} well={28} />
      </g>
      <g id="pk-bowl">
        <circle cx={51.8} cy={52} r={48} fill="url(#pk-dish-shadow)" />
        <circle cx={50} cy={49} r={42} fill="#7b4f35" />
        <circle cx={50} cy={49} r={40.8} fill="url(#pk-bowl-glaze)" />
        <circle cx={50} cy={49} r={36} fill="url(#pk-bowl-wall)" />
        <path d="M89.6,58A40.6,40.6 0 0 1 41,88.6" fill="none" stroke="#ffffff" strokeOpacity={0.6} strokeWidth={1.2} strokeLinecap="round" />
      </g>
      <g id="pk-pan">
        <circle cx={47.8} cy={50} r={46} fill="url(#pk-dish-shadow)" />
        <g transform="translate(46,47) rotate(38)">
          <rect x={34} y={-5.4} width={22} height={10.8} rx={4} fill="#1d1a18" transform="translate(0.8,1.4)" opacity={0.5} />
          <rect x={34} y={-5} width={22} height={10} rx={4} fill="#3a3430" />
          <rect x={36} y={-3.6} width={18} height={2} rx={1} fill="#ffffff" opacity={0.18} />
          <circle cx={51} cy={0.4} r={1.8} fill="#1d1a18" />
        </g>
        <circle cx={46} cy={47} r={40} fill="#26221f" />
        <circle cx={46} cy={47} r={38.8} fill="#4a433d" />
        <circle cx={46} cy={47} r={35} fill="#2a2522" />
        <path d="M84.2,55.6A39,39 0 0 1 37.4,85.2" fill="none" stroke="#ffffff" strokeOpacity={0.35} strokeWidth={1.4} strokeLinecap="round" />
        <path d="M8,39A39,39 0 0 1 54,9" fill="none" stroke="#000000" strokeOpacity={0.3} strokeWidth={1.4} strokeLinecap="round" />
      </g>

      <g id="pk-parchment">
        <rect x={17.4} y={18.4} width={68} height={68} rx={1.5} fill="#3a2112" opacity={0.12} />
        <rect x={16.7} y={17.2} width={68} height={68} rx={1.5} fill="#3a2112" opacity={0.12} />
        <rect x={16} y={16} width={68} height={68} rx={1.5} fill="#ecdcc0" />
        <path d="M16,16L84,16L16,84Z" fill="#f4e9d5" />
        <path d="M18,82L82,18" stroke="#ffffff" strokeOpacity={0.35} strokeWidth={0.8} />
      </g>

      <path id="pk-slice-shadow" d={`${band(-0.2, H)}${topFace}`} fill="#3a2112" opacity={0.22} transform="translate(1.4,2.2)" />
      <g id="pk-slice-crust">
        <path d={band(H - CRUST, H)} fill="#c58a4b" />
        <path d={`M${C[0]},${C[1]}Q${C[0] + 4},${C[1] + H / 2} ${C[0]},${C[1] + H}L${C[0]},${C[1]}Z`} fill="#000000" opacity={0.12} />
      </g>
      <path id="pk-slice-top" d={topFace} strokeOpacity={0.55} strokeWidth={0.9} strokeLinejoin="round" />
      <path id="pk-slice-edge" d={`M${A[0] + 1},${A[1]}L${C[0] - 0.5},${C[1]}`} stroke="#ffffff" strokeOpacity={0.5} strokeWidth={0.9} strokeLinecap="round" />

      <ChouxSprites />

      <g id="pk-wafers">
        {WAFER_ROWS.map(([dx, dy], i) => (
          <g key={i} transform={`translate(${dx},${dy})`}>
            <rect x={-21} y={-4.4} width={42} height={9} rx={4.4} fill="#a87534" transform="translate(0.5,1.1)" />
            <rect x={-21} y={-4.6} width={42} height={9} rx={4.4} fill="#e3b56b" />
            {[-14, -8, -2, 4, 10].map((x) => (
              <rect key={x} x={x} y={-4} width={1.8} height={8} rx={0.9} fill="#c58f45" transform={`rotate(24 ${x} 0)`} />
            ))}
            <rect x={-17} y={-3.6} width={20} height={1.3} rx={0.6} fill="#ffffff" opacity={0.35} />
          </g>
        ))}
      </g>
      <g id="pk-wafer-caramel">
        {WAFER_ROWS.map(([dx, dy], i) => (
          <g key={i}>
            <ellipse cx={dx - 20.6} cy={dy} rx={2} ry={3.8} fill="#a8622a" />
            <ellipse cx={dx + 20.6} cy={dy} rx={2} ry={3.8} fill="#b8702e" />
          </g>
        ))}
      </g>

      <g id="pk-eclair">
        <rect x={-25} y={-7.4} width={50} height={15} rx={7.4} fill="#9c6128" transform="translate(0.6,1.4)" />
        <rect x={-25} y={-7.6} width={50} height={15} rx={7.4} fill="#d99d55" />
      </g>
      <g id="pk-eclair-cream">
        <ellipse cx={-24.2} cy={0} rx={1.8} ry={5.2} fill="#f8eedc" />
        <ellipse cx={24.2} cy={0} rx={1.8} ry={5.2} fill="#f8eedc" />
      </g>
      <rect id="pk-eclair-glaze" x={-22.5} y={-6} width={45} height={9.4} rx={4.7} />

      <g id="pk-napoleon">
        {Array.from({ length: 18 }, (_, i) => {
          const a = (-160 + i * 8) * (Math.PI / 180);
          const d = 22 + between(crumbs, -4, 4);
          return <circle key={i} cx={f(Math.cos(a) * d)} cy={f(Math.sin(a) * d + 18.5)} r={f(between(crumbs, 0.9, 1.7))} fill="#f8eedc" />;
        })}
      </g>
      <g id="pk-lemon-drizzle" fill="none" strokeLinecap="round" stroke="#f3d24e">
        <path d="M-17,-2C-10,-12 10,-12 17,-2" strokeWidth={2.4} />
        <path d="M-12,3C-6,-4 6,-4 12,3" strokeWidth={2.2} />
      </g>
    </>
  );
}
