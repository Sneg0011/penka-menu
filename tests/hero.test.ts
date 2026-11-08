import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

import Page from "@/app/page";
import { CUP_VIEW, cupPose, cupSwap, HERO, heroProgress, pourTail, readPourVerdict, shouldLoadCup3D, SIP } from "@/motion/hero";
import { POUR_SESSION_KEY } from "@/motion/pour";

// ───────── прогресс первого экрана ─────────

// Телефон 390 × 844: линия чтения на 102 px (низ шапки + 2), стаканчик стоит на 620 px от верха окна.
const LINE = 102;
const START = 620;
/** Где стаканчик после прокрутки на `scrolled` px. */
const at = (scrolled: number) => ({ top: START - scrolled, scrolled, line: LINE });

describe("heroProgress", () => {
  test("без прокрутки — 0", () => {
    expect(heroProgress(at(0))).toBe(0);
  });

  test("растёт линейно, пока верх стаканчика едет к линии чтения", () => {
    const path = START - LINE;
    expect(heroProgress(at(path / 4))).toBeCloseTo(0.25, 6);
    expect(heroProgress(at(path / 2))).toBeCloseTo(0.5, 6);
  });

  test("верх стаканчика дошёл до линии — 1, дальше не растёт", () => {
    expect(heroProgress(at(START - LINE))).toBe(1);
    expect(heroProgress(at(START - LINE + 400))).toBe(1);
  });

  test("не зависит от окна прокрутки: в рамке телефона те же числа дают то же", () => {
    // в рамке всё считается от верха экрана телефона — те же top/scrolled/line
    expect(heroProgress({ top: 361, scrolled: 259, line: LINE })).toBeCloseTo(0.5, 6);
  });

  test("отрицательная прокрутка (оттяжка на iOS) — 0", () => {
    expect(heroProgress({ top: START + 40, scrolled: -40, line: LINE })).toBe(0);
  });

  test("вырожденный случай: стаканчик уже у шапки без прокрутки — 0, с прокруткой — 1, без NaN", () => {
    expect(heroProgress({ top: LINE, scrolled: 0, line: LINE })).toBe(0);
    expect(heroProgress({ top: LINE - 50, scrolled: 10, line: LINE })).toBe(1);
    expect(Number.isNaN(heroProgress({ top: Number.NaN, scrolled: 10, line: LINE }))).toBe(false);
  });
});

describe("pourTail", () => {
  const path = START - LINE;
  test("пока первый экран не кончился — струя на месте (0)", () => {
    expect(pourTail(at(0))).toBe(0);
    expect(pourTail(at(path * 0.9))).toBe(0);
    expect(pourTail(at(path))).toBe(0);
  });
  test("рамка ушла выше линии чтения — остаток струи падает за 10 % пути", () => {
    const mid = pourTail(at(path * 1.05));
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    expect(pourTail(at(path * 1.1))).toBe(1);
    expect(pourTail(at(path * 3))).toBe(1);
  });
  test("монотонно и без NaN в вырожденном случае", () => {
    let prev = 0;
    for (let k = 0; k <= 60; k++) {
      const v = pourTail(at(path * (0.9 + k / 200)));
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
    expect(pourTail({ top: LINE, scrolled: 0, line: LINE })).toBe(0);
    expect(pourTail({ top: Number.NaN, scrolled: 10, line: LINE })).toBe(0);
  });
});

// ───────── поза стаканчика ─────────

const samples = (from: number, to: number, n = 200) => Array.from({ length: n + 1 }, (_, k) => from + ((to - from) * k) / n);

describe("cupPose", () => {
  test("в начале: надпись к гостю (yaw0), стоит ровно, не льёт", () => {
    expect(cupPose(0)).toEqual({ yaw: HERO.yaw0, tilt: 0, pour: 0, lift: 0 });
  });

  test("за первую часть прокрутки — ровно один оборот: к концу поворота надпись там же, где в начале", () => {
    expect(cupPose(HERO.turnEnd).yaw - HERO.yaw0).toBeCloseTo(2 * Math.PI, 6);
    expect(cupPose(HERO.turnEnd / 2).yaw - HERO.yaw0).toBeCloseTo(Math.PI, 6);
  });

  test("пока крутится — не наклоняется и не льёт", () => {
    for (const p of samples(0, HERO.turnEnd)) {
      const pose = cupPose(p);
      expect(pose.tilt).toBe(0);
      expect(pose.pour).toBe(0);
      expect(pose.lift).toBe(0);
    }
  });

  test("в последних ~20 % — наклон до tiltMax, поворот стоит", () => {
    expect(1 - HERO.turnEnd).toBeGreaterThanOrEqual(0.15);
    expect(1 - HERO.turnEnd).toBeLessThanOrEqual(0.25);
    for (const p of samples(HERO.turnEnd, 1)) expect(cupPose(p).yaw).toBeCloseTo(HERO.yaw0 + 2 * Math.PI, 6);
    const end = cupPose(1);
    expect(end.tilt).toBeCloseTo(HERO.tiltMax, 6);
    expect(end.pour).toBe(1);
    expect(end.lift).toBeCloseTo(HERO.lift, 6);
  });

  test("наклон сдержанный: 25…45°", () => {
    expect(HERO.tiltMax).toBeGreaterThan((25 * Math.PI) / 180);
    expect(HERO.tiltMax).toBeLessThan((45 * Math.PI) / 180);
  });

  test("в конце оборота прорезь крышки — в самой низкой точке наклона: струя идёт из неё", () => {
    const end = cupPose(1);
    const sipWorld = SIP.angle + end.yaw;
    const d = Math.atan2(Math.sin(sipWorld - HERO.azimuth), Math.cos(sipWorld - HERO.azimuth));
    expect(Math.abs(d)).toBeLessThan(1e-9);
  });

  test("струя появляется только на заметном наклоне", () => {
    for (const p of samples(0, 1)) {
      const pose = cupPose(p);
      if (pose.pour > 0) expect(pose.tilt).toBeGreaterThanOrEqual(0.4 * HERO.tiltMax);
    }
  });

  test("всё монотонно по прокрутке: назад — та же дорога", () => {
    let prev = cupPose(0);
    for (const p of samples(0, 1, 400)) {
      const pose = cupPose(p);
      expect(pose.yaw).toBeGreaterThanOrEqual(prev.yaw - 1e-12);
      expect(pose.tilt).toBeGreaterThanOrEqual(prev.tilt - 1e-12);
      expect(pose.pour).toBeGreaterThanOrEqual(prev.pour - 1e-12);
      expect(pose.lift).toBeGreaterThanOrEqual(prev.lift - 1e-12);
      prev = pose;
    }
  });

  test("плавно: на 1 % прокрутки поворот не больше 20°, наклон не больше 10°", () => {
    const pts = samples(0, 1, 100);
    for (let k = 1; k < pts.length; k++) {
      const [a, b] = [cupPose(pts[k - 1]), cupPose(pts[k])];
      expect(b.yaw - a.yaw).toBeLessThanOrEqual((20 * Math.PI) / 180);
      expect(b.tilt - a.tilt).toBeLessThanOrEqual((10 * Math.PI) / 180);
    }
  });

  test("за пределами 0…1 зажимается", () => {
    expect(cupPose(-0.5)).toEqual(cupPose(0));
    expect(cupPose(1.7)).toEqual(cupPose(1));
    expect(cupPose(Number.NaN)).toEqual(cupPose(0));
  });
});

// ───────── грузить ли 3D ─────────

describe("shouldLoadCup3D", () => {
  test("устройство тянет, вердикта перелива нет — да", () => {
    expect(shouldLoadCup3D(true, null)).toBe(true);
  });
  test("устройство не тянет (слабое, без WebGL2, «уменьшить движение») — нет", () => {
    expect(shouldLoadCup3D(false, null)).toBe(false);
  });
  test("сторож перелива решил «css» — нет, даже если устройство тянет", () => {
    expect(shouldLoadCup3D(true, "css")).toBe(false);
    expect(shouldLoadCup3D(false, "css")).toBe(false);
  });
  test("другое значение в хранилище — не вердикт, решает устройство", () => {
    expect(shouldLoadCup3D(true, "gl")).toBe(true);
  });
});

describe("cupSwap", () => {
  test("первая загрузка: рамка на экране, стаканчик в позе рисунка — растворение", () => {
    expect(cupSwap(true, 0)).toBe("fade");
    expect(cupSwap(true, 0.04)).toBe("fade");
  });
  test("на экране, но стаканчик уже повёрнут или наклонён — сразу, без двойной экспозиции", () => {
    expect(cupSwap(true, 0.05)).toBe("instant");
    expect(cupSwap(true, 0.5)).toBe("instant");
    expect(cupSwap(true, 1)).toBe("instant");
  });
  test("собрали заранее за экраном (возврат из меню) — сразу, при любом прогрессе", () => {
    expect(cupSwap(false, 0)).toBe("instant");
    expect(cupSwap(false, 1)).toBe("instant");
  });
  test("порог растворения — поза почти как у рисунка: поворот меньше 4°, без наклона и струи", () => {
    const p = 0.0499;
    expect(cupSwap(true, p)).toBe("fade");
    const pose = cupPose(p);
    expect(Math.abs(pose.yaw - HERO.yaw0)).toBeLessThan((4 * Math.PI) / 180);
    expect(pose.tilt).toBe(0);
    expect(pose.pour).toBe(0);
  });
});

describe("readPourVerdict", () => {
  const storage = (items: Record<string, string>) => ({ getItem: (k: string) => items[k] ?? null });

  test("читает вердикт перелива по его ключу", () => {
    expect(POUR_SESSION_KEY).toBe("pk-pour");
    expect(readPourVerdict(() => storage({ [POUR_SESSION_KEY]: "css" }))).toBe("css");
    expect(readPourVerdict(() => storage({}))).toBeNull();
  });
  test("хранилище недоступно (приватный режим бросает) — null", () => {
    expect(
      readPourVerdict(() => {
        throw new DOMException("denied", "SecurityError");
      }),
    ).toBeNull();
    expect(readPourVerdict(() => ({ getItem: () => { throw new Error("quota"); } }))).toBeNull();
  });
  test("хранилища нет — null", () => {
    expect(readPourVerdict(() => null)).toBeNull();
    expect(readPourVerdict(() => undefined)).toBeNull();
  });
});

// ───────── первый экран на странице ─────────

describe("первый экран", () => {
  test("рамка стаканчика: над крышкой — запас на подъём и наклон, под донышком — тень, ниже — место для конца струи", () => {
    const { height, scale, baseY, layoutBottom } = CUP_VIEW;
    // донышко внутри рамки, низ для вёрстки — под донышком (тень), низ рамки — ещё ниже (струя)
    expect(baseY).toBeLessThan(layoutBottom);
    expect(layoutBottom).toBeLessThan(height);
    // стаканчик с крышкой целиком в рамке, над крышкой ≥ 20 мм запаса
    expect(baseY / scale - 118.6).toBeGreaterThanOrEqual(20);
    // струя уходит ниже низа для вёрстки хотя бы на 10 мм — в стакан на обложке «Кофе»
    expect((height - layoutBottom) / scale).toBeGreaterThanOrEqual(10);
  });

  test("в статической разметке — SVG-стаканчик со своей надписью «Пенка», без canvas", () => {
    const html = renderToString(createElement(Page));
    expect(html).toMatch(/<svg[^>]*data-cup="fallback"/);
    expect(html).not.toContain("<canvas");
    const svg = html.slice(html.search(/<svg[^>]*data-cup="fallback"/));
    expect(svg.slice(0, svg.indexOf("</svg>"))).toContain("Пенка");
  });

  test("порядок: заголовок → «Что вы обычно пьёте?» → стаканчик → <ArtDefs /> → разделы", () => {
    const { container } = render(createElement(Page));
    const h1 = screen.getByRole("heading", { level: 1 });
    const entry = screen.getByRole("group", { name: "Что вы обычно пьёте?" });
    const cup = container.querySelector('svg[data-cup="fallback"]')!;
    const defs = container.querySelector("[data-art-defs]")!;
    const firstSection = container.querySelector("section")!;
    const follows = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(follows(h1, entry)).toBe(true);
    expect(follows(entry, cup)).toBe(true);
    expect(follows(cup, defs)).toBe(true);
    expect(follows(defs, firstSection)).toBe(true);
  });

  test("стаканчик — картинка для зрячих: спрятан от скринридера, ничего не перехватывает", () => {
    const { container } = render(createElement(Page));
    const box = container.querySelector("[data-cup-box]")!;
    expect(box).toHaveAttribute("aria-hidden", "true");
    expect(box.querySelector("button, a, [tabindex]")).toBeNull();
    // в jsdom нет WebGL — 3D не грузится, остаётся SVG
    expect(container.querySelector("canvas")).toBeNull();
    expect(box).toHaveAttribute("data-cup-mode", "svg");
  });
});
