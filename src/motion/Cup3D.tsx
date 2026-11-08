"use client";

// 3D-стаканчик первого экрана: чистый three.js, отдельным чанком (Hero грузит его через next/dynamic через
// CUP_START_DELAY_MS после `load`, в свободное время и если устройство тянет — см. shouldLoadCup3D). Ложится холстом точно поверх
// SVG-рисунка (CupFallback) в той же рамке и проявляется, когда нарисовал первый кадр.
//
// Кадры — только по делу: при прокрутке, пока рамка на экране, и при смене её размера; в покое — ни одного.
// Прогресс первого экрана считается по тому же окну прокрутки, что и useSectionProgress (страница на телефоне,
// экран рамки на компьютере), без React-состояния на кадр. Прокрутили мимо первого экрана — контекст WebGL
// отпускается (на экране остаётся только перелив), вернулись — собирается снова. Потеря контекста — назад к SVG.

import { useEffect, type RefObject } from "react";
import {
  BackSide,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  HemisphereLight,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NeutralToneMapping,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  QuadraticBezierCurve3,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  TubeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Material,
} from "three";

import { CUP_PROFILE, CUP_VIEW, cupPose, cupSwap, HERO, heroProgress, LETTERING, pourTail, readPourVerdict, SIP, wallRadius, type CupPose } from "./hero";
import { CHROME_ATTR, FRAME_QUERY, scrollRoot } from "./useSectionProgress";

/** Плотность холста не выше 1,5: стаканчик ~200 px, разницы с 3× не видно, а пикселей вчетверо меньше. */
const MAX_DPR = 1.5;
/** Узкий объектив, как на предметной съёмке: почти без искажений. */
const FOV = 18;
/** Наклон — вокруг середины стаканчика (мм от донышка). */
const PIVOT = 56;
/** Струя: отрезков вдоль и по кругу, толщина у прорези и внизу (мм). */
const STREAM = { segments: 48, radial: 10, radius: 1.7, end: 0.55 } as const;
/** Насколько заранее (до появления рамки на экране) собирать сцену и когда отпускать её после ухода. */
const NEAR_MARGIN = "400px 0px";
const RELEASE_DELAY = 700;
/** Рисовать начинаем чуть раньше, чем рамка покажется из-за края окна. */
const VISIBLE_MARGIN = "64px 0px";
/** Ось наклона: горизонтальная, поперёк направления наклона HERO.azimuth. */
const TILT_AXIS = new Vector3(Math.cos(HERO.azimuth), 0, -Math.sin(HERO.azimuth));

type CupScene = {
  /** `tail` — доля струи, уже упавшей вниз после конца первого экрана (pourTail). */
  render(pose: CupPose, tail: number): void;
  resize(width: number, height: number): void;
  destroy(): void;
};

// ───── Текстуры (рисуются один раз на вкладку, холсты переиспользуются при повторной сборке сцены) ─────

const SLEEVE_Y: [number, number] = [CUP_PROFILE.sleeve[0][1], CUP_PROFILE.sleeve[CUP_PROFILE.sleeve.length - 1][1]];
const BODY_Y: [number, number] = [0, CUP_PROFILE.body[CUP_PROFILE.body.length - 1][1]];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas2d(width: number, height: number) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2d");
  return { c, ctx };
}

/** Бумага стенки: тёплый белый, мягкая тень под юбкой крышки и под нижней кромкой гильзы. */
function paintPaper(): HTMLCanvasElement {
  const { c, ctx } = canvas2d(256, 512);
  const py = (y: number) => (1 - (y - BODY_Y[0]) / (BODY_Y[1] - BODY_Y[0])) * c.height;
  ctx.fillStyle = "#f8f3eb";
  ctx.fillRect(0, 0, c.width, c.height);
  const shade = (from: number, to: number, alpha: number) => {
    const g = ctx.createLinearGradient(0, py(from), 0, py(to));
    g.addColorStop(0, `rgba(70, 42, 20, ${alpha})`);
    g.addColorStop(1, "rgba(70, 42, 20, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, Math.min(py(from), py(to)), c.width, Math.abs(py(to) - py(from)));
  };
  shade(BODY_Y[1], 91, 0.5); // под юбкой крышки
  shade(SLEEVE_Y[0], 24, 0.32); // под гильзой
  shade(0, 5, 0.25); // у донышка
  // тонкая печатная линия у донышка
  ctx.fillStyle = "rgba(91, 52, 24, 0.55)";
  ctx.fillRect(0, py(10.6), c.width, Math.max(1, py(10) - py(10.6)));
  return c;
}

/** Крафт гильзы с волокнами и надписью «Пенка» (на обороте — мельче «Челябинск»). Шрифт уже на странице. */
async function paintKraft(): Promise<HTMLCanvasElement> {
  try {
    await document.fonts.load('100px "Marck Script"', LETTERING.text + LETTERING.back);
  } catch {
    // нет шрифта — нарисуем запасным рукописным
  }
  const rMid = wallRadius((SLEEVE_Y[0] + SLEEVE_Y[1]) / 2) + 0.95;
  const W = 2048;
  const pxPerMm = W / (2 * Math.PI * rMid);
  const H = Math.round((SLEEVE_Y[1] - SLEEVE_Y[0]) * pxPerMm);
  const { c, ctx } = canvas2d(W, H);
  const py = (y: number) => (1 - (y - SLEEVE_Y[0]) / (SLEEVE_Y[1] - SLEEVE_Y[0])) * H;
  const rand = mulberry32(54);

  ctx.fillStyle = "#a08568";
  ctx.fillRect(0, 0, W, H);
  // крупные пятна тона — крафт неровный
  for (let k = 0; k < 40; k++) {
    const x = rand() * W;
    const y = rand() * H;
    const r = 40 + rand() * 120;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const light = rand() < 0.5;
    g.addColorStop(0, light ? "rgba(214, 170, 120, 0.07)" : "rgba(120, 80, 44, 0.07)");
    g.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  // волокна
  for (let k = 0; k < 3200; k++) {
    const x = rand() * W;
    const y = rand() * H;
    const len = 3 + rand() * 11;
    const a = rand() * Math.PI;
    ctx.strokeStyle = rand() < 0.55 ? `rgba(92, 58, 28, ${0.05 + rand() * 0.09})` : `rgba(236, 204, 156, ${0.05 + rand() * 0.09})`;
    ctx.lineWidth = 0.6 + rand() * 0.9;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  // кромки чуть темнее — подвёрнутый край
  for (const [from, to] of [[0, 6], [H, H - 6]] as const) {
    const g = ctx.createLinearGradient(0, from, 0, to);
    g.addColorStop(0, "rgba(70, 44, 22, 0.45)");
    g.addColorStop(1, "rgba(70, 44, 22, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, Math.min(from, to), W, 6);
  }

  // Надпись — на своём слое: краска «пробита» волокнами, как печать по крафту
  const ink = canvas2d(W, H);
  const font = (px: number) => `${px}px "Marck Script", "Segoe Script", cursive`;
  const word = (text: string, mm: number, arcMm: number, x: number, baseline: number) => {
    const size = mm * pxPerMm;
    ink.ctx.font = font(size);
    const sx = (arcMm * pxPerMm) / Math.max(1, ink.ctx.measureText(text).width);
    ink.ctx.save();
    ink.ctx.translate(x, baseline);
    ink.ctx.scale(sx, 1);
    ink.ctx.textAlign = "center";
    ink.ctx.fillStyle = "#23120a";
    ink.ctx.fillText(text, 0, 0);
    ink.ctx.restore();
  };
  word(LETTERING.text, LETTERING.size, LETTERING.arc, W / 2, py(LETTERING.baseline));
  // оборот: на шве (u = 0 и u = 1) — рисуем дважды, по половине с каждой стороны
  for (const x of [0, W]) word(LETTERING.back, LETTERING.size * 0.42, LETTERING.arc * 0.62, x, py(LETTERING.baseline + 4));
  ink.ctx.globalCompositeOperation = "destination-out";
  for (let k = 0; k < 9000; k++) {
    ink.ctx.fillStyle = `rgba(0, 0, 0, ${0.15 + rand() * 0.45})`;
    ink.ctx.fillRect(rand() * W, rand() * H, 1 + rand() * 1.6, 1 + rand() * 1.6);
  }
  ctx.globalAlpha = 0.9;
  ctx.drawImage(ink.c, 0, 0);
  ctx.globalAlpha = 1;
  return c;
}

/** Мягкая тень на «столе»: эллипс, тёмный тёплый, края уходят в ноль. */
function paintShadow(): HTMLCanvasElement {
  const { c, ctx } = canvas2d(256, 256);
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(10, 5, 2, 0.7)");
  g.addColorStop(0.45, "rgba(10, 5, 2, 0.34)");
  g.addColorStop(1, "rgba(10, 5, 2, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return c;
}

/** Струя тает к концу: вдоль трубки u = 0 у прорези, 1 — у нижнего края кадра (там её принимает стакан латте). */
function paintStreamAlpha(): HTMLCanvasElement {
  const { c, ctx } = canvas2d(64, 4);
  const g = ctx.createLinearGradient(0, 0, 64, 0);
  g.addColorStop(0, "#fff");
  g.addColorStop(0.92, "#fff");
  g.addColorStop(1, "#000");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 4);
  return c;
}

let painted: Promise<{ paper: HTMLCanvasElement; kraft: HTMLCanvasElement; shadow: HTMLCanvasElement; stream: HTMLCanvasElement }> | null = null;
const paintAll = () =>
  (painted ??= paintKraft().then((kraft) => ({ paper: paintPaper(), kraft, shadow: paintShadow(), stream: paintStreamAlpha() })));

// ───── Сцена ─────

/** Тело вращения с u вокруг (шов сзади, u = 0,5 — к гостю) и v по высоте в пределах `v`. */
function lathe(profile: [number, number][], segments: number, v?: [number, number]): LatheGeometry {
  const g = new LatheGeometry(
    profile.map(([r, y]) => new Vector2(r, y)),
    segments,
    Math.PI,
    Math.PI * 2,
  );
  if (v) {
    const pos = g.getAttribute("position");
    const uv = g.getAttribute("uv");
    for (let i = 0; i < uv.count; i++) uv.setY(i, (pos.getY(i) - v[0]) / (v[1] - v[0]));
    uv.needsUpdate = true;
  }
  return g;
}

/** Окружение для бликов: тёмная комната, тёплый софтбокс сверху слева, узкий контровой сзади справа. */
function makeEnvironment(renderer: WebGLRenderer) {
  const pmrem = new PMREMGenerator(renderer);
  const room = new Scene();
  const parts: { geometry: BufferGeometry; material: Material }[] = [];
  const add = <T extends Mesh<BufferGeometry, Material>>(mesh: T) => {
    room.add(mesh);
    parts.push({ geometry: mesh.geometry, material: mesh.material });
    return mesh;
  };
  add(new Mesh(new BoxGeometry(12, 12, 12), new MeshBasicMaterial({ color: new Color("#1d120b"), side: BackSide })));
  const panel = (color: string, power: number, w: number, h: number, at: [number, number, number]) => {
    const m = add(new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ color: new Color(color).multiplyScalar(power), side: DoubleSide })));
    m.position.set(...at);
    m.lookAt(0, 0, 0);
  };
  try {
    panel("#fff0dc", 6, 4.5, 3.2, [-3.6, 3.8, 3.2]);
    panel("#ffcf9a", 4, 1.1, 4.4, [4.4, 1.2, -2.8]);
    panel("#f4e2cc", 0.6, 7, 2.2, [1.2, -1.6, 4.8]);
    return pmrem.fromScene(room, 0.04);
  } finally {
    // временная комната и генератор не нужны ни после успеха, ни после ошибки
    parts.forEach((p) => {
      p.geometry.dispose();
      p.material.dispose();
    });
    pmrem.dispose();
  }
}

/**
 * Собирает сцену в новом холсте внутри рамки. `null` — WebGL недоступен или сборка упала (шейдер, память):
 * тогда всё, что успели создать, освобождено, контекст отпущен, холста в рамке нет — остаётся SVG.
 */
async function createCupScene(box: HTMLElement, onLost: () => void): Promise<CupScene | null> {
  const art = await paintAll().catch(() => null);
  if (!art) return null;
  const canvas = document.createElement("canvas");
  canvas.dataset.cup = "3d";
  canvas.setAttribute("aria-hidden", "true");
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: true, stencil: false, powerPreference: "low-power" });
  } catch {
    return null;
  }
  const lost = (e: Event) => {
    e.preventDefault();
    onLost();
  };
  canvas.addEventListener("webglcontextlost", lost);
  // Всё, что создано для сцены, — сюда: при ошибке сборки и в destroy() освобождается одним путём
  const owned: { dispose(): void }[] = [];
  const own = <T extends { dispose(): void }>(x: T): T => {
    owned.push(x);
    return x;
  };
  const free = () => {
    canvas.removeEventListener("webglcontextlost", lost);
    for (const x of owned.splice(0)) {
      try {
        x.dispose();
      } catch {
        // освобождаем остальное, даже если одно не освободилось
      }
    }
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  };
  try {
    return buildScene();
  } catch {
    free();
    return null;
  }

  function buildScene(): CupScene {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR));
    renderer.setClearColor(0x000000, 0);
    // проверка шейдеров синхронно ждёт компиляции и шумит в консоль предупреждениями ANGLE — в проде не нужна
    renderer.debug.checkShaderErrors = false;
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = NeutralToneMapping;
    renderer.toneMappingExposure = 0.95;

    const texture = (c: HTMLCanvasElement, srgb = true) => {
      const t = own(new CanvasTexture(c));
      if (srgb) t.colorSpace = SRGBColorSpace;
      t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      return t;
    };

    const scene = new Scene();
    const env = own(makeEnvironment(renderer));
    scene.environment = env.texture;
    scene.environmentIntensity = 0.5;

    // Камера: тот же вид, что у SVG — высота кадра 400 / scale мм, донышко на baseY, взгляд чуть сверху
    const camera = new PerspectiveCamera(FOV, CUP_VIEW.width / CUP_VIEW.height, 1, 2000);
    const span = CUP_VIEW.height / CUP_VIEW.scale;
    const lookY = (CUP_VIEW.baseY - CUP_VIEW.height / 2) / CUP_VIEW.scale / Math.cos(CUP_VIEW.elevation);
    const distance = span / 2 / Math.tan((FOV * Math.PI) / 360);
    camera.position.set(0, lookY + distance * Math.sin(CUP_VIEW.elevation), distance * Math.cos(CUP_VIEW.elevation));
    camera.lookAt(0, lookY, 0);
    camera.near = distance - 250;
    camera.far = distance + 250;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    // Свет: тёплый ключевой сверху слева, контровой сзади справа (кромка), мягкое небо/пол
    const key = new DirectionalLight("#fff1df", 3.2);
    key.position.set(-420, 300, 220);
    const rim = new DirectionalLight("#ffd2a0", 2.3);
    rim.position.set(420, 130, -220);
    scene.add(key, rim, new HemisphereLight("#fff6ea", "#3a2414", 0.16));

    // бумага с тонким покрытием: мягкий широкий блик слева, не пластик
    const paper = own(new MeshStandardMaterial({ map: texture(art!.paper), roughness: 0.66, metalness: 0 }));
    const kraft = own(new MeshStandardMaterial({ map: texture(art!.kraft), roughness: 0.92, metalness: 0 }));
    const plastic = own(new MeshStandardMaterial({ color: "#ece2d2", roughness: 0.36, metalness: 0 }));
    const slot = own(new MeshStandardMaterial({ color: "#090503", roughness: 0.7, metalness: 0 }));
    const liquid = own(new MeshStandardMaterial({
      color: "#cf9d6a",
      roughness: 0.1,
      metalness: 0,
      emissive: "#5a3416",
      emissiveIntensity: 0.3,
      alphaMap: texture(art!.stream, false),
      transparent: true,
    }));
    const shadowMat = own(new MeshBasicMaterial({ map: texture(art!.shadow), transparent: true, depthWrite: false, toneMapped: false }));

    const tilt = new Group();
    const spin = new Group();
    spin.position.y = -PIVOT;
    tilt.add(spin);
    scene.add(tilt);

    const body = new Mesh(own(lathe(CUP_PROFILE.body, 96, BODY_Y)), paper);
    const sleeve = new Mesh(own(lathe(CUP_PROFILE.sleeve, 128, SLEEVE_Y)), kraft);
    const lid = new Mesh(own(lathe(CUP_PROFILE.lid, 96)), plastic);
    // прорезь для питья: тёмная капля, утопленная в кольцо крышки, по касательной
    const sipGeo = own(new SphereGeometry(1, 20, 10));
    const sip = new Mesh(sipGeo, slot);
    sip.scale.set(6.4, 1.1, 1.7);
    // верх капли — на 0,15 мм над гребнем кольца: видна тёмная прорезь, а на силуэте крышки бугорка нет
    sip.position.set(SIP.r * Math.sin(SIP.angle), SIP.y - 0.95, SIP.r * Math.cos(SIP.angle));
    sip.rotation.y = SIP.angle;
    spin.add(body, sleeve, lid, sip);

    const shadow = new Mesh(own(new PlaneGeometry(150, 150)), shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.2;
    shadow.scale.set(1, 0.42, 1);
    scene.add(shadow);

    const spout = new Vector3();
    const pose = (p: CupPose) => {
      spin.rotation.y = p.yaw;
      tilt.position.y = PIVOT + p.lift;
      // наклон вокруг горизонтальной оси, поперечной направлению `azimuth`: верх уходит туда, вперёд-вправо
      tilt.quaternion.setFromAxisAngle(TILT_AXIS, p.tilt);
      scene.updateMatrixWorld();
      sip.getWorldPosition(spout);
    };

    // Струя: трубка от прорези — короткая дуга наружу и вниз до нижнего края кадра, книзу тоньше. Форма считается
    // один раз для конечной позы; дальше трубка едет за прорезью и проявляется сверху вниз (drawRange).
    pose(cupPose(1));
    const out = new Vector3(Math.sin(HERO.azimuth), 0, Math.cos(HERO.azimuth));
    const endAt = spout.clone().addScaledVector(out, 9);
    const probe = new Vector3();
    let lo = endAt.y - 400;
    let hi = endAt.y;
    for (let k = 0; k < 24; k++) {
      const mid = (lo + hi) / 2;
      if (probe.set(endAt.x, mid, endAt.z).project(camera).y < -1) lo = mid;
      else hi = mid;
    }
    const curve = new QuadraticBezierCurve3(new Vector3(0, 0, 0), new Vector3(out.x * 7, -3, out.z * 7), new Vector3(out.x * 9, hi - spout.y, out.z * 9));
    const streamGeo = own(new TubeGeometry(curve, STREAM.segments, STREAM.radius, STREAM.radial, false));
    {
      const pos = streamGeo.getAttribute("position");
      const at = new Vector3();
      for (let j = 0; j <= STREAM.segments; j++) {
        curve.getPointAt(j / STREAM.segments, at);
        const k = 1 - (1 - STREAM.end) * (j / STREAM.segments);
        for (let i = 0; i <= STREAM.radial; i++) {
          const v = j * (STREAM.radial + 1) + i;
          pos.setXYZ(v, at.x + (pos.getX(v) - at.x) * k, at.y + (pos.getY(v) - at.y) * k, at.z + (pos.getZ(v) - at.z) * k);
        }
      }
      pos.needsUpdate = true;
    }
    const quad = STREAM.radial * 6;
    const stream = new Mesh(streamGeo, liquid);
    stream.visible = false;
    scene.add(stream);

    canvas.style.opacity = "";
    box.append(canvas);
    // стиль холста посчитан до проявления — иначе переход прозрачности не сработает
    void getComputedStyle(canvas).opacity;

    return {
      render(p, tail) {
        pose(p);
        const tip = p.tilt / HERO.tiltMax;
        shadowMat.opacity = 1 - 0.75 * tip;
        shadow.scale.set(1 - 0.12 * tip, 0.42 * (1 - 0.12 * tip), 1);
        // струя проявляется от прорези вниз; после конца первого экрана её верх отрывается и падает
        const from = Math.round(tail * STREAM.segments);
        const to = Math.round(p.pour * STREAM.segments);
        stream.visible = to - from > 0;
        if (stream.visible) {
          stream.position.set(spout.x, spout.y - 0.4, spout.z);
          streamGeo.setDrawRange(from * quad, (to - from) * quad);
        }
        renderer.render(scene, camera);
      },
      resize(width, height) {
        if (!width || !height) return;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      },
      destroy: free,
    };
  }
}

// ───── Жизненный цикл в рамке ─────

/** Прогресс первого экрана и хвост струи по рамке стаканчика — тем же окном прокрутки и линией чтения, что у useSectionProgress. */
function measure(box: HTMLElement): { p: number; tail: number } {
  const root = scrollRoot();
  const rootTop = root ? root.getBoundingClientRect().top : 0;
  const chrome = document.querySelector(`[${CHROME_ATTR}]`);
  const line = (chrome ? chrome.getBoundingClientRect().bottom - rootTop : 0) + 2;
  const m = { top: box.getBoundingClientRect().top - rootTop, scrolled: root ? root.scrollTop : window.scrollY, line };
  return { p: heroProgress(m), tail: pourTail(m) };
}

/** Рамка хоть краем в окне прокрутки (под шапкой тоже считается). */
function onScreen(box: HTMLElement): boolean {
  const root = scrollRoot();
  const view = root ? root.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
  const r = box.getBoundingClientRect();
  return r.bottom > view.top && r.top < view.bottom;
}

function mountCup(box: HTMLElement): () => void {
  let scene: CupScene | null = null;
  let creating = false;
  let failed = false;
  let destroyed = false;
  let near = false;
  let visible = false;
  let frame = 0;
  let releaseTimer = 0;
  let drawn = "";

  const draw = () => {
    frame = 0;
    if (!scene || !visible || document.hidden) return;
    const { p, tail } = measure(box);
    const key = `${p}|${tail}`;
    if (key === drawn) return;
    drawn = key;
    scene.render(cupPose(p), tail);
  };
  const invalidate = (force = false) => {
    if (force) drawn = "";
    if (!frame) frame = requestAnimationFrame(draw);
  };

  const release = () => {
    window.clearTimeout(releaseTimer);
    box.dataset.cupMode = "svg";
    scene?.destroy();
    scene = null;
    drawn = "";
  };
  const lost = () => {
    // контекст отняли (драйвер, нехватка памяти) — до перезагрузки только рисунок
    failed = true;
    release();
  };
  /** Никогда не бросает: сборка упала — до перезагрузки только рисунок, как при потере контекста. */
  const create = async () => {
    if (scene || creating || failed || destroyed) return;
    // сторож перелива мог решить «css» уже после загрузки — тогда и стаканчик остаётся рисунком
    if (readPourVerdict(() => window.sessionStorage) === "css") return;
    creating = true;
    let made: CupScene | null = null;
    try {
      made = await createCupScene(box, lost);
    } catch {
      made = null;
    } finally {
      creating = false;
    }
    if (!made) {
      failed = true;
      box.dataset.cupMode = "svg";
      return;
    }
    if (destroyed || !near) {
      made.destroy();
      return;
    }
    scene = made;
    try {
      scene.resize(box.clientWidth, box.clientHeight);
      // Первый кадр — сразу, в текущей позе, и сразу подмена. Растворение — только если рамка на экране и
      // стаканчик в позе рисунка (начало); собрали заранее за экраном или он уже повёрнут/наклонён — подмена
      // мгновенно: рисунок и 3D в разных позах не накладываются.
      const { p, tail } = measure(box);
      scene.render(cupPose(p), tail);
      drawn = `${p}|${tail}`;
      box.dataset.cupSwap = cupSwap(onScreen(box), p);
      box.dataset.cupMode = "3d";
    } catch {
      lost();
    }
  };

  const onNear: IntersectionObserverCallback = (entries) => {
    near = entries[entries.length - 1].isIntersecting;
    window.clearTimeout(releaseTimer);
    if (near) void create();
    else if (scene) releaseTimer = window.setTimeout(release, RELEASE_DELAY);
  };
  const onVisible: IntersectionObserverCallback = (entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) invalidate(true);
  };
  const onScroll = () => {
    if (visible && scene) invalidate();
  };

  // Окно прокрутки меняется на границе рамки телефона (FRAME_QUERY: 768 × 600 px) — наблюдатели и слушатель вешаются заново
  let detach = () => {};
  const attach = () => {
    const root = scrollRoot();
    const target: HTMLElement | Window = root ?? window;
    const nearIo = new IntersectionObserver(onNear, { root, rootMargin: NEAR_MARGIN });
    // чуть раньше края окна: первый видимый кадр уже в текущей позе
    const visibleIo = new IntersectionObserver(onVisible, { root, rootMargin: VISIBLE_MARGIN });
    nearIo.observe(box);
    visibleIo.observe(box);
    target.addEventListener("scroll", onScroll, { passive: true });
    detach = () => {
      nearIo.disconnect();
      visibleIo.disconnect();
      target.removeEventListener("scroll", onScroll);
    };
  };
  attach();
  const wide = window.matchMedia(FRAME_QUERY);
  const onWide = () => {
    detach();
    attach();
  };
  wide.addEventListener?.("change", onWide);
  const resize = new ResizeObserver(() => {
    scene?.resize(box.clientWidth, box.clientHeight);
    invalidate(true);
  });
  resize.observe(box);
  const onShow = () => {
    if (!document.hidden) invalidate(true);
  };
  document.addEventListener("visibilitychange", onShow);

  return () => {
    destroyed = true;
    detach();
    wide.removeEventListener?.("change", onWide);
    resize.disconnect();
    document.removeEventListener("visibilitychange", onShow);
    if (frame) cancelAnimationFrame(frame);
    release();
  };
}

/** Монтирует 3D в рамку `box` (в ней уже лежит SVG-рисунок). Сам ничего не рисует в React. */
export default function Cup3D({ box }: { box: RefObject<HTMLDivElement | null> }) {
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    return mountCup(el);
  }, [box]);
  return null;
}
