import { render } from "@testing-library/react";
import { createElement } from "react";

import Page from "@/app/page";
import { sections } from "@/content/sections";
import { contrast, mixColor, mutedInk } from "@/lib/theme";
import {
  BODY,
  bodyColor,
  edgeFrom,
  frontVisible,
  GPU_GUARD,
  gpuVerdict,
  gradientStops,
  pourFront,
  pourGradient,
  pourSections,
  pourUniforms,
  type PourEdge,
} from "@/motion/pour";

const LAST = sections.length - 1;
const rgb01 = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

// Телефон 390 × 844: шапка 100 px, линия чтения на 102 px. Место без текста — как на странице:
// над границей ~52 px (низ последней строки), под ней до заголовка ~122 px у напитков и ~254 px у еды.
const VIEW = 844;
const LINE = 102;
const edgeAt = (t: number, down = 122, up = 52): PourEdge => {
  const y = VIEW - t * (VIEW - LINE);
  return edgeFrom({ y, upperText: y - up - 8, lowerText: y + down + 8, line: LINE, view: VIEW });
};
const TAUS = Array.from({ length: 21 }, (_, k) => k / 20);

describe("какие разделы лежат на слое", () => {
  test("первый раздел: он, следующий и тот, что за ним (короткий следующий раздел виден целиком)", () => {
    expect(pourSections({ index: 0, next: 1, t: 0.3 })).toEqual([0, 1, 2]);
  });
  test("в середине меню — ещё и предыдущий: его граница стоит у шапки", () => {
    expect(pourSections({ index: 4, next: 5, t: 0.5 })).toEqual([3, 4, 5, 6]);
  });
  test("предпоследний и последний", () => {
    expect(pourSections({ index: LAST - 1, next: LAST, t: 0.2 })).toEqual([LAST - 2, LAST - 1, LAST]);
    expect(pourSections({ index: LAST, next: LAST, t: 0 })).toEqual([LAST - 1, LAST]);
  });
});

describe("граница двух разделов", () => {
  test("τ: 0 — граница у низа окна, 1 — дошла до линии чтения; дальше не выходит из 0…1", () => {
    const at = (y: number) => edgeFrom({ y, upperText: y - 60, lowerText: y + 130, line: LINE, view: VIEW }).tau;
    expect(at(VIEW)).toBe(0);
    expect(at(LINE)).toBe(1);
    expect(at((VIEW + LINE) / 2)).toBeCloseTo(0.5, 3);
    expect(at(VIEW + 300)).toBe(0);
    expect(at(LINE - 300)).toBe(1);
  });
  test("место без текста — за вычетом запаса 8 px, не меньше нуля", () => {
    const e = edgeFrom({ y: 500, upperText: 440, lowerText: 630, line: LINE, view: VIEW });
    expect(e).toMatchObject({ y: 500, up: 52, down: 122 });
    expect(edgeFrom({ y: 500, upperText: 499, lowerText: 501, line: LINE, view: VIEW })).toMatchObject({ up: 0, down: 0 });
  });
});

describe("фронт перелива", () => {
  test.each([
    ["напитки", 122],
    ["еда", 254],
    ["узко", 30],
  ])("при любом τ не выходит из полосы без текста (%s)", (_, down) => {
    for (const t of TAUS) {
      const e = edgeAt(t, down);
      const { centre, reach } = pourFront(e);
      expect(reach).toBeGreaterThanOrEqual(0);
      expect(centre - reach, `τ=${e.tau}`).toBeGreaterThanOrEqual(-e.up - 1e-9);
      expect(centre + reach, `τ=${e.tau}`).toBeLessThanOrEqual(e.down + 1e-9);
    }
  });
  test("τ = 1 — перелив закончен: фронт целиком выше границы, под шапкой", () => {
    const e = edgeAt(1);
    const { centre, reach } = pourFront(e);
    expect(centre + reach).toBeLessThan(0);
    expect(frontVisible(e, LINE - 2, VIEW)).toBe(false);
  });
  test("фронт поднимается вместе с прокруткой и успокаивается к концу", () => {
    const fronts = TAUS.map((t) => pourFront(edgeAt(t)));
    for (let k = 1; k < fronts.length; k++) {
      expect(fronts[k].centre).toBeLessThanOrEqual(fronts[k - 1].centre);
      expect(fronts[k].reach).toBeLessThanOrEqual(fronts[k - 1].reach + 1e-9);
    }
    expect(fronts[0].centre).toBeGreaterThan(0);
  });
  test("видимость: граница посреди экрана — да; ниже экрана или под шапкой — нет", () => {
    expect(frontVisible(edgeAt(0.5), LINE - 2, VIEW)).toBe(true);
    expect(frontVisible({ ...edgeAt(0), y: VIEW + 400 }, LINE - 2, VIEW)).toBe(false);
    expect(frontVisible({ ...edgeAt(1), y: -200 }, LINE - 2, VIEW)).toBe(false);
  });
});

describe("цвет тела раздела", () => {
  test("доля второго цвета: сверху меньше, к низу больше, внутри 0…1", () => {
    expect(bodyColor(sections[0], 0, VIEW)).toBe(mixColor(sections[0].bg[0], sections[0].bg[1], BODY.top));
    expect(bodyColor(sections[0], VIEW, VIEW)).toBe(mixColor(sections[0].bg[0], sections[0].bg[1], BODY.bottom));
    expect(BODY.top).toBeGreaterThanOrEqual(0);
    expect(BODY.bottom).toBeLessThanOrEqual(1);
  });
  test("весь диапазон цветов раздела читается: текст и приглушённый ≥ 4,5 на любой смеси bg (шейдер рисует внутри него)", () => {
    for (const s of sections) {
      for (let k = 0; k <= 1.0001; k += 0.05) {
        const bg = mixColor(s.bg[0], s.bg[1], k);
        expect(contrast(s.ink, bg), `${s.id} k=${k}`).toBeGreaterThanOrEqual(4.5);
        expect(contrast(mutedInk(s), bg), `${s.id} k=${k}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe("uniforms шейдера", () => {
  test("цвета: четыре раздела сверху вниз по два цвета bg в 0…1; пустые места повторяют последний", () => {
    const { colors } = pourUniforms({ ids: [8, 9], edges: [edgeAt(0.4)], line: LINE });
    expect(colors).toHaveLength(24);
    const slot = (i: number) => Array.from(colors.slice(i * 6, i * 6 + 6));
    const expectSlot = (i: number, id: number) =>
      slot(i).forEach((v, k) => expect(v).toBeCloseTo([...rgb01(sections[id].bg[0]), ...rgb01(sections[id].bg[1])][k], 5));
    expectSlot(0, 8);
    expectSlot(1, 9);
    expectSlot(2, 9);
    expectSlot(3, 9);
  });
  test("границы: (y, up, down, τ) и фронт (середина, размах, зерно); пустые — далеко внизу", () => {
    const e = edgeAt(0.5);
    const { edges, fronts } = pourUniforms({ ids: [0, 1], edges: [e], line: LINE });
    expect(Array.from(edges.slice(0, 4))).toEqual([e.y, e.up, e.down, e.tau].map((v) => Math.fround(v)));
    const f = pourFront(e);
    expect(fronts[0]).toBeCloseTo(f.centre, 3);
    expect(fronts[1]).toBeCloseTo(f.reach, 3);
    expect(edges[4]).toBeGreaterThan(10_000);
    expect(edges[8]).toBeGreaterThan(10_000);
  });
  test("зерно узора — номер нижнего раздела: граница «Рафы → Чай» та же, какой бы раздел ни был текущим", () => {
    const e = edgeAt(0.3);
    const seedOf = (ids: number[], slot: number) => pourUniforms({ ids, edges: ids.slice(1).map(() => e), line: LINE }).fronts[slot * 3 + 2];
    expect(seedOf([0, 1, 2], 1)).toBe(2); // текущий «Кофе»: граница «Рафы → Чай» — вторая
    expect(seedOf([1, 2, 3, 4], 0)).toBe(2); // текущий «Чай»: она же — первая
  });
});

describe("запасной CSS-градиент (без WebGL)", () => {
  const colorAt = (stops: { color: string; at: number }[], y: number) => {
    let k = stops.findIndex((s) => s.at >= y);
    if (k === -1) return stops.at(-1)!.color;
    if (k === 0) return stops[0].color;
    const [a, b] = [stops[k - 1], stops[k]];
    return b.at === a.at ? b.color : mixColor(a.color, b.color, (y - a.at) / (b.at - a.at));
  };

  test("один раздел — его тело сверху донизу", () => {
    expect(pourGradient({ ids: [LAST], edges: [], line: LINE }, VIEW)).toBe(
      `linear-gradient(180deg, ${bodyColor(sections[LAST], 0, VIEW)} 0px, ${bodyColor(sections[LAST], VIEW, VIEW)} ${VIEW}px)`,
    );
  });

  test("по t: над полосой — цвет верхнего раздела, под ней — нижнего, смесь (mixColor) только в полосе без текста", () => {
    const e = edgeAt(0.5);
    const stops = gradientStops({ ids: [0, 1], edges: [e], line: LINE }, VIEW);
    // тело линейно по y, поэтому между опорными точками — тот же цвет (с точностью до округления канала)
    const same = (a: string, b: string) => rgb01(a).forEach((v, k) => expect(Math.round(Math.abs(v - rgb01(b)[k]) * 255)).toBeLessThanOrEqual(1));
    same(colorAt(stops, e.y - e.up - 1), bodyColor(sections[0], e.y - e.up - 1, VIEW));
    same(colorAt(stops, e.y + e.down + 1), bodyColor(sections[1], e.y + e.down + 1, VIEW));
    const band = stops.slice(1, 3);
    expect(band[0].at).toBeGreaterThanOrEqual(e.y - e.up);
    expect(band[1].at).toBeLessThanOrEqual(e.y + e.down);
    expect(band[1].at).toBeGreaterThan(band[0].at);
  });

  test("по t полоса поднимается: в начале под границей, в конце — над ней", () => {
    const mid = (t: number) => {
      const e = edgeAt(t);
      const [, a, b] = gradientStops({ ids: [0, 1], edges: [e], line: LINE }, VIEW);
      return (a.at + b.at) / 2 - e.y;
    };
    expect(mid(0)).toBeGreaterThan(0);
    expect(mid(1)).toBeLessThan(0);
  });

  test("для всех пар разделов и любого t текст стоит на цвете своего раздела (≥ 4,5)", () => {
    for (let i = 0; i < LAST; i++) {
      const [upper, lower] = [sections[i], sections[i + 1]];
      const down = i + 1 >= 4 ? 254 : 122;
      for (const t of TAUS) {
        const e = edgeAt(t, down);
        const stops = gradientStops({ ids: [i, i + 1], edges: [e], line: LINE }, VIEW);
        for (let y = LINE; y <= VIEW; y += 6) {
          const above = y <= e.y - e.up - 8;
          const below = y >= e.y + e.down + 8;
          if (!above && !below) continue;
          const s = above ? upper : lower;
          const bg = colorAt(stops, y);
          expect(contrast(s.ink, bg), `${upper.id}→${lower.id} t=${t} y=${y}`).toBeGreaterThanOrEqual(4.5);
          expect(contrast(mutedInk(s), bg), `${upper.id}→${lower.id} t=${t} y=${y}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });
});

describe("сторож видеокарты: по интервалам кадров решает, оставить шейдер, снизить DPR или уйти на CSS", () => {
  const frames = (ms: number, n: number = GPU_GUARD.samples) => Array.from({ length: n }, () => ms);

  test("быстро (60 и 120 Гц) — оставить", () => {
    expect(gpuVerdict(frames(16.7))).toBe("keep");
    expect(gpuVerdict(frames(8.3))).toBe("keep");
    expect(gpuVerdict(frames(16.7), true)).toBe("keep");
  });
  test("медленно — сначала снизить DPR, после снижения — на CSS", () => {
    expect(gpuVerdict(frames(33))).toBe("lower-dpr");
    expect(gpuVerdict(frames(33), true)).toBe("css");
  });
  test("на границе бюджета 22 мс", () => {
    expect(gpuVerdict(frames(21.5))).toBe("keep");
    expect(gpuVerdict(frames(22.5))).toBe("lower-dpr");
  });
  test("каждый второй кадр пропущен (~40 к/с) — медленно", () => {
    const mixed = Array.from({ length: GPU_GUARD.samples }, (_, k) => (k % 2 ? 33.3 : 16.7));
    expect(gpuVerdict(mixed)).toBe("lower-dpr");
  });
  test("мало замеров — решать рано, шейдер остаётся даже на медленных кадрах", () => {
    expect(gpuVerdict([])).toBe("keep");
    expect(gpuVerdict(frames(50, GPU_GUARD.samples - 1))).toBe("keep");
  });
  test("одна заминка (200 мс, вкладка вернулась в фокус) не понижает; и две-три тоже", () => {
    expect(gpuVerdict([...frames(16.7, GPU_GUARD.samples - 1), 200])).toBe("keep");
    expect(gpuVerdict([200, ...frames(16.7, GPU_GUARD.samples - 1)])).toBe("keep");
    expect(gpuVerdict([200, 150, 120, ...frames(16.7, GPU_GUARD.samples - 3)])).toBe("keep");
  });
  test("мусор в замерах (NaN, отрицательные, бесконечность) не считается", () => {
    expect(gpuVerdict([NaN, -5, Infinity, ...frames(16.7)])).toBe("keep");
    expect(gpuVerdict([NaN, -5, Infinity, ...frames(16.7, 5)])).toBe("keep");
  });
});

describe("слой на странице", () => {
  test("один слой перелива, скрыт от скринридеров; без WebGL холста нет", () => {
    const { container } = render(createElement(Page));
    const layers = container.querySelectorAll("[data-pour-layer]");
    expect(layers).toHaveLength(1);
    expect(layers[0].getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector("canvas")).toBeNull();
  });
});
