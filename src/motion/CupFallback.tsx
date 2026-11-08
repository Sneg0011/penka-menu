import { CUP_VIEW, HERO, LETTERING, SIP, wallRadius } from "./hero";

// SVG-стаканчик первого экрана: есть в статической разметке, его видят слабые телефоны, «уменьшить движение»
// и первая секунда каждого визита, пока 3D не загрузилось. Геометрия — проекция того же профиля, что
// вытачивает Cup3D (hero.ts), с тем же видом сверху и в той же рамке: подмена на 3D идёт без скачка.
// Свет — тёплый, сверху слева; справа тонкий контровой. Надпись «Пенка» — своя, рукописным Marck Script
// (не логотип кофейни), и, как у 3D, повёрнута на yaw0 — вид в три четверти.

const { width: W, scale: S, baseY, elevation: E } = CUP_VIEW;
const CX = W / 2;
const COS = Math.cos(E);
const SIN = Math.sin(E);

const n = (v: number) => Math.round(v * 10) / 10;
/** Центр эллипса окружности на высоте y (мм) — в координатах viewBox. */
const cy = (y: number) => baseY - S * y * COS;
/** Полуоси эллипса окружности радиуса r. */
const rx = (r: number) => S * r;
const ry = (r: number) => S * r * SIN;

/** Полоса бока между высотами y0 < y1 (передние дуги), радиусы r0, r1. */
function band(y0: number, r0: number, y1: number, r1: number) {
  return [
    `M${n(CX - rx(r1))} ${n(cy(y1))}`,
    `A${n(rx(r1))} ${n(ry(r1))} 0 0 0 ${n(CX + rx(r1))} ${n(cy(y1))}`,
    `L${n(CX + rx(r0))} ${n(cy(y0))}`,
    `A${n(rx(r0))} ${n(ry(r0))} 0 0 1 ${n(CX - rx(r0))} ${n(cy(y0))}`,
    "Z",
  ].join("");
}

/** Передняя дуга окружности радиуса r на высоте y, слева направо (для надписи и теней-кромок). */
function frontArc(y: number, r: number) {
  return `M${n(CX - rx(r))} ${n(cy(y))}A${n(rx(r))} ${n(ry(r))} 0 0 0 ${n(CX + rx(r))} ${n(cy(y))}`;
}

const ellipse = (y: number, r: number) => ({ cx: CX, cy: n(cy(y)), rx: n(rx(r)), ry: n(ry(r)) });

// Высоты и радиусы (мм) — из профилей hero.ts
const SKIRT = { y0: 99.6, y1: 110.6, r: 47.7 };
const RING = { y0: 111.2, r0: 45.6, y1: 118.3, r1: 43.6, top: 118.6, inner: 39.8 };
const SLEEVE = { y0: 30, y1: 78.3, r0: wallRadius(30) + 0.95, r1: wallRadius(78.3) + 0.95 };
const BODY = { r0: wallRadius(0.6), r1: wallRadius(SKIRT.y0 + 1) };

// Надпись: по передней дуге на высоте базовой линии; ширина — проекция дуги `LETTERING.arc` мм,
// центр — под углом yaw0 (там же, где надпись у 3D в начале).
const R_TEXT = wallRadius(LETTERING.baseline) + 1;
const half = LETTERING.arc / (2 * R_TEXT);
const xLeft = R_TEXT * Math.sin(HERO.yaw0 - half);
const xRight = R_TEXT * Math.sin(HERO.yaw0 + half);
const TEXT = {
  path: frontArc(LETTERING.baseline, R_TEXT),
  offset: `${n((((xLeft + xRight) / 2 + R_TEXT) / (2 * R_TEXT)) * 100)}%`,
  length: n(S * (xRight - xLeft)),
  size: n(S * LETTERING.size),
};

// Прорезь для питья: в начале она смотрит на гостя (угол SIP.angle + yaw0 = 0)
const sipPhi = SIP.angle + HERO.yaw0;
const SIP_AT = { x: n(CX + S * SIP.r * Math.sin(sipPhi)), y: n(baseY - S * (SIP.y * COS - SIP.r * Math.cos(sipPhi) * SIN)) };

export function CupFallback({ className }: { className?: string }) {
  return (
    <svg
      data-cup="fallback"
      viewBox={`0 0 ${W} ${CUP_VIEW.height}`}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* бока: свет слева, тень справа, у самой кромки — тёплый контровой */}
        <linearGradient id="pk-cup-paper" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#bfae98" />
          <stop offset="0.16" stopColor="#f6eee2" />
          <stop offset="0.3" stopColor="#fbf5ec" />
          <stop offset="0.62" stopColor="#e2d4c1" />
          <stop offset="0.86" stopColor="#a8927a" />
          <stop offset="0.96" stopColor="#8f7760" />
          <stop offset="1" stopColor="#c99f73" />
        </linearGradient>
        <linearGradient id="pk-cup-kraft" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#6c5236" />
          <stop offset="0.16" stopColor="#b8946b" />
          <stop offset="0.3" stopColor="#c09b71" />
          <stop offset="0.62" stopColor="#9c7a55" />
          <stop offset="0.88" stopColor="#5f472d" />
          <stop offset="1" stopColor="#9a7650" />
        </linearGradient>
        <linearGradient id="pk-cup-lid" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#b2a28d" />
          <stop offset="0.17" stopColor="#f8f0e4" />
          <stop offset="0.32" stopColor="#f2e9db" />
          <stop offset="0.7" stopColor="#cbbca8" />
          <stop offset="0.95" stopColor="#968672" />
          <stop offset="1" stopColor="#d8b38a" />
        </linearGradient>
        <linearGradient id="pk-cup-lid-top" x1="0" x2="1" y1="0" y2="0.4">
          <stop offset="0" stopColor="#fbf6ee" />
          <stop offset="0.45" stopColor="#ece2d3" />
          <stop offset="1" stopColor="#bdad97" />
        </linearGradient>
        <linearGradient id="pk-cup-recess" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ad9c86" />
          <stop offset="1" stopColor="#e9dfd0" />
        </linearGradient>
        {/* мягкая тень на «столе» и под кромками */}
        <radialGradient id="pk-cup-shadow">
          <stop offset="0" stopColor="#080402" stopOpacity="0.62" />
          <stop offset="0.55" stopColor="#080402" stopOpacity="0.28" />
          <stop offset="1" stopColor="#080402" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pk-cup-ao" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#3a2414" stopOpacity="0.45" />
          <stop offset="1" stopColor="#3a2414" stopOpacity="0" />
        </linearGradient>
        <path id="pk-cup-text-path" d={TEXT.path} />
      </defs>

      {/* тень на столе */}
      <ellipse {...ellipse(0, 50)} cy={n(cy(0) + 4)} ry={n(ry(50) * 1.35)} fill="url(#pk-cup-shadow)" />

      {/* стаканчик: бок от донышка до юбки крышки */}
      <path d={band(0.6, BODY.r0, SKIRT.y0 + 1, BODY.r1)} fill="url(#pk-cup-paper)" />
      {/* тонкая печатная линия у донышка — как на 3D */}
      <path d={frontArc(10.3, wallRadius(10.3))} fill="none" stroke="#5b3418" strokeOpacity="0.5" strokeWidth="0.9" />
      {/* тень юбки крышки на бумаге */}
      <path d={band(SKIRT.y0 - 7, wallRadius(SKIRT.y0 - 7), SKIRT.y0 + 1, BODY.r1)} fill="url(#pk-cup-ao)" />

      {/* гильза из крафта: тонкая тень под нижней кромкой, полоса, светлая верхняя кромка */}
      <path d={frontArc(SLEEVE.y0 - 0.9, SLEEVE.r0 - 0.3)} fill="none" stroke="#3a2414" strokeOpacity="0.28" strokeWidth="2.4" />
      <path d={band(SLEEVE.y0, SLEEVE.r0, SLEEVE.y1, SLEEVE.r1)} fill="url(#pk-cup-kraft)" />
      <path d={frontArc(SLEEVE.y1, SLEEVE.r1)} fill="none" stroke="#e7c497" strokeOpacity="0.55" strokeWidth="1" />

      {/* надпись — своя, рукописная */}
      <text
        fontFamily="'Marck Script', 'Segoe Script', cursive"
        fontSize={TEXT.size}
        fill="#2a170b"
        fillOpacity="0.9"
        textAnchor="middle"
        textLength={TEXT.length}
        lengthAdjust="spacingAndGlyphs"
      >
        <textPath href="#pk-cup-text-path" startOffset={TEXT.offset}>
          {LETTERING.text}
        </textPath>
      </text>

      {/* крышка: юбка, ступенька, кольцо, утопленный верх, прорезь */}
      <path d={band(SKIRT.y0, SKIRT.r - 0.4, SKIRT.y1, SKIRT.r)} fill="url(#pk-cup-lid)" />
      <ellipse {...ellipse(SKIRT.y1 + 0.3, 46.6)} fill="#d6c8b4" />
      <path d={band(RING.y0, RING.r0, RING.y1, RING.r1)} fill="url(#pk-cup-lid)" />
      <ellipse {...ellipse(RING.top, RING.r1)} fill="url(#pk-cup-lid-top)" />
      <ellipse {...ellipse(RING.top - 0.6, RING.inner)} fill="url(#pk-cup-recess)" />
      <path d={frontArc(RING.top - 0.6, RING.inner)} fill="none" stroke="#8c7a64" strokeOpacity="0.55" strokeWidth="1" />
      <ellipse cx={SIP_AT.x} cy={SIP_AT.y} rx={n(S * 6.4 * Math.cos(sipPhi))} ry={n(S * 1.5)} fill="#1a0f08" />
      {/* блик на юбке и кольце слева */}
      <path d={frontArc(SKIRT.y0 + 0.6, SKIRT.r - 0.2)} fill="none" stroke="#6e5a44" strokeOpacity="0.35" strokeWidth="1.2" />
    </svg>
  );
}
