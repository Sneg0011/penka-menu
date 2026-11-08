// Перелив фона на WebGL2 (без библиотек): у границы двух разделов жидкость нижнего вливается в верхний —
// между «Кофе» и «Рафами» это молоко в эспрессо. Грузится отдельным чанком после `load` и только там,
// где canUseRichMotion() разрешает (PourBackground). Один холст, DPR ≤ 1,5, `low-power`.
//
// Что на экране:
// • тело раздела — его два цвета `bg`, мягко «мраморенные» крупным медленным шумом; доля второго цвета не
//   выходит из 0…1, поэтому контраст текста раздела тот же, что проверен в данных;
// • на границе — фронт жидкости: каждую точку уносит по плавному вихревому течению (ротор шума, без
//   источников и стоков), поэтому фронт складывается в округлые языки и завитки, а не рвётся. Нижняя жидкость
//   тёплой дымкой «крема» расходится в верхнюю, её тонкий край полупрозрачный, по линиям течения — прожилки,
//   по кромке — слабый блик. К концу перелива течение затихает. Всё это живёт только в полосе без текста
//   над и под границей (см. pourFront), у краёв полосы течение стихает до нуля — среза не видно.
// Кадры: на каждое изменение прогресса — сразу (полная частота при прокрутке); в покое, пока фронт на экране, —
// медленный дрейф не чаще 30 кадров в секунду, который за несколько секунд затихает; вкладка скрыта — ничего.
// Сторож видеокарты: первые ~20 кадров с фронтом на экране меряются интервалы rAF; если перелив не укладывается
// в бюджет (gpuVerdict), DPR снижается до 1, а если и это не помогло — слой насовсем уходит на CSS-градиент.

import { frontVisible, GPU_GUARD, gpuVerdict, pourUniforms, type PourStack } from "./pour";

const VERTEX = /* glsl */ `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAGMENT = /* glsl */ `#version 300 es
precision highp float;

uniform vec2 uRes;      // холст, px
uniform float uScale;   // px холста на CSS px
uniform float uHeight;  // высота слоя, CSS px
uniform float uTime;    // с, медленный дрейф
uniform vec3 uColor[8]; // разделы сверху вниз: bg0, bg1 × 4
uniform vec4 uEdge[3];  // границы: y, место без текста сверху и снизу, τ (CSS px)
uniform vec3 uFront[3]; // фронт: середина относительно границы, размах (CSS px), зерно шума

out vec4 outColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

const mat2 R = mat2(1.6, 1.2, -1.2, 1.6);

// 0…1, среднее ≈ 0,5
float fbm3(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * noise(p); p = R * p; a *= 0.5; }
  return v / 0.875;
}

// Сглаженный шум из двух октав — для течения и крупных «лепестков» фронта, без рваной мелочи
float n2(vec2 p) {
  return (noise(p) + 0.5 * noise(R * p + 7.1)) / 1.5;
}

// Доля второго цвета раздела: свет сверху (как в CSS-запасном варианте) и крупный медленный мрамор
float bodyShare(vec2 p) {
  vec2 q = p / 340.0;
  float t = uTime;
  vec2 w = vec2(n2(q + vec2(0.0, t * 0.010)), n2(q + vec2(4.7, 2.3) - t * 0.008));
  float n = fbm3(q * 1.4 + 1.8 * w + vec2(t * 0.006, 0.0));
  float base = mix(0.12, 0.34, clamp(p.y / uHeight, 0.0, 1.0));
  return clamp(base + (n - 0.5) * 0.6, 0.0, 1.0);
}

// Шум со своим градиентом (значение, d/dx, d/dy) — производная считается сразу, без лишних выборок
vec3 noised(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  vec2 du = 6.0 * f * (1.0 - f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  float k = a - b - c + d;
  return vec3(a + (b - a) * u.x + (c - a) * u.y + k * u.x * u.y, du * vec2(b - a + k * u.y, c - a + k * u.x));
}

// Течение без источников и стоков (ротор плавной функции тока n2): жидкость закручивается, а не «рвётся».
// Градиент n2 — аналитически: две выборки шума на шаг вместо восьми.
vec2 flow(vec2 p) {
  vec2 g = noised(p).yz + 0.5 * (transpose(R) * noised(R * p + 7.1).yz);
  return vec2(g.y, -g.x) / 1.5;
}

// Граница: верхняя жидкость (upper) и вливающаяся нижняя (lower)
vec3 pour(vec3 upper, vec3 lower, vec2 p, vec4 e, vec3 f) {
  float d = p.y - e.x;
  float reach = max(f.y, 2.0);
  float px = 1.0 / reach;
  // к концу перелива течение затихает, а прожилки и блик гаснут: под шапкой — ровный цвет нового раздела
  float stir = 1.0 - 0.7 * smoothstep(0.3, 1.0, e.w);
  float live = 1.0 - smoothstep(0.75, 1.0, e.w);
  float ph = e.w * 1.6 + uTime * 0.05;
  vec2 seed = vec2(f.z * 3.17, f.z * 1.31);
  // точку уносит течением: фронт складывается в завитки и тонкие нити, как молоко в эспрессо
  // у краёв полосы течение стихает: там ровно цвет своего раздела, без среза
  float calmEdge = smoothstep(-e.y, 0.0, d) * (1.0 - smoothstep(e.z - 0.35 * e.z, e.z, d));
  vec2 q = vec2(p.x, d);
  for (int i = 0; i < 7; i++) {
    q += flow(q / 120.0 + seed + vec2(ph * 0.3, -ph * 0.2)) * (reach * 0.3 * stir * calmEdge);
  }
  float lobes = n2(vec2(q.x / 230.0, ph * 0.25) + seed) - 0.5;
  // < 0 — верхняя жидкость, > 0 — нижняя
  float s = (q.y - f.x) / reach - lobes;

  // крем — тёплая смесь двух жидкостей, как пенка эспрессо, размешанная с молоком
  // тёплый оттенок — только у контрастной пары (молоко в эспрессо); у близких цветов он дал бы рыжую обводку
  float apart = clamp(abs(dot(upper - lower, vec3(0.2126, 0.7152, 0.0722))) * 1.6, 0.0, 1.0);
  vec3 crema = mix(upper, lower, 0.5);
  crema = mix(crema, crema * vec3(1.12, 0.95, 0.78), 0.7 * apart);
  float m = smoothstep(-2.0 * px, 6.0 * px, s);
  // нижняя жидкость мутной дымкой расходится в верхнюю; тонкий край нижней — полупрозрачный, темнее тела
  float halo = (1.0 - m) * smoothstep(-0.7, 0.0, s);
  vec3 col = mix(upper, crema, halo * halo * 0.6);
  vec3 body = mix(crema, lower, smoothstep(0.0, 0.35, s));
  col = mix(col, body, m);
  // прожилки по линиям течения рядом с фронтом: крем в нижней жидкости, светлые нити в верхней
  float near = exp(-abs(s) * 2.4);
  float vein = pow(0.5 + 0.5 * sin(s * 11.0 + 1.3), 6.0) * near * live;
  col = mix(col, mix(crema, lower, 0.3), vein * m * 0.75);
  col = mix(col, crema, vein * (1.0 - m) * 0.35);
  // блик на кромке
  float rim = smoothstep(0.0, 4.0 * px, s) * (1.0 - smoothstep(4.0 * px, 16.0 * px, s));
  col = mix(col, vec3(1.0), rim * 0.06 * live);

  // только в полосе без текста
  float band = smoothstep(-e.y, -e.y + 10.0, d) * (1.0 - smoothstep(e.z - 10.0, e.z, d));
  return mix(d < f.x ? upper : lower, col, band);
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uScale;
  float k = bodyShare(p);
  vec3 col = mix(uColor[0], uColor[1], k);
  for (int i = 0; i < 3; i++) {
    vec4 e = uEdge[i];
    float d = p.y - e.x;
    if (d <= -e.y) break;
    vec3 lower = mix(uColor[2 * i + 2], uColor[2 * i + 3], k);
    if (d >= e.z) { col = lower; continue; }
    col = pour(col, lower, p, e, uFront[i]);
    break;
  }
  // лёгкий дизеринг: без ступенек на тёмных градиентах
  col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  outColor = vec4(col, 1.0);
}`;

/** Кадров в секунду в покое (дрейф жидкости). При прокрутке кадр рисуется на каждое изменение прогресса. */
const IDLE_FPS = 30;
/** После прокрутки жидкость ещё дрейфует и за это время затихает. */
const SETTLE_MS = 8000;
/** Первые интервалы после запуска и после снижения DPR не меряются: сборка шейдера, новый размер холста. */
const GUARD_WARMUP = 3;

export type PourRenderer = {
  /** Новые границы и разделы: кадр рисуется сразу. */
  render(stack: PourStack): void;
  destroy(): void;
};

async function compile(gl: WebGL2RenderingContext): Promise<WebGLProgram | null> {
  const shader = (type: number, source: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, source);
    gl.compileShader(s);
    return s;
  };
  const vs = shader(gl.VERTEX_SHADER, VERTEX);
  const fs = shader(gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  // компиляция в фоне, если драйвер умеет: главный поток не ждёт
  const parallel = gl.getExtension("KHR_parallel_shader_compile");
  if (parallel) {
    const started = performance.now();
    while (!gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR)) {
      if (performance.now() - started > 5000 || gl.isContextLost()) return null;
      await new Promise((resolve) => setTimeout(resolve, 16));
    }
  }
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("Перелив: шейдер не собрался —", gl.getShaderInfoLog(fs) || gl.getProgramInfoLog(program));
    return null;
  }
  gl.detachShader(program, vs);
  gl.detachShader(program, fs);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return program;
}

/** Почему холст убран: потерян контекст (драйвер, нехватка памяти) или видеокарта не тянет перелив. */
export type PourFallback = "lost" | "slow";

export type PourOptions = {
  /** Только для проверки сторожа (`?pour=slow`): прибавка к каждому замеренному интервалу кадра, мс. */
  slowMs?: number;
};

/**
 * Холст перелива внутри `host` (слой PourBackground). `null` — WebGL2 недоступен или шейдер не собрался:
 * остаётся CSS-градиент. `onFallback` — холст уже убран (контекст потерян или сторож решил, что видеокарта
 * не тянет): в том же задании нужно нарисовать градиент, тогда пустого кадра не будет.
 */
export async function createPour(host: HTMLElement, onFallback: (reason: PourFallback) => void, options: PourOptions = {}): Promise<PourRenderer | null> {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    powerPreference: "low-power",
  });
  if (!gl) return null;
  const program = await compile(gl);
  if (!program) {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return null;
  }

  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const at = (name: string) => gl.getUniformLocation(program, name);
  const u = { res: at("uRes"), scale: at("uScale"), height: at("uHeight"), time: at("uTime"), color: at("uColor"), edge: at("uEdge"), front: at("uFront") };

  let stack: PourStack | null = null;
  let height = 0;
  let time = 0;
  let raf = 0;
  let prevTick = 0;
  let lastDraw = -Infinity;
  let lastChange = performance.now();
  let alive = true;
  let dprCap = 1.5;
  // сторож: решает один раз за сессию и только вниз; на экране с DPR ≤ 1 снижать нечего — сразу CSS
  const guard = { on: true, lowered: Math.min(window.devicePixelRatio || 1, dprCap) <= 1, warmup: GUARD_WARMUP, deltas: [] as number[] };
  const slowMs = options.slowMs ?? 0;

  function fit() {
    const w = host.clientWidth;
    const h = host.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    const cw = Math.max(1, Math.round(w * dpr));
    const ch = Math.max(1, Math.round(h * dpr));
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }
    height = h;
    return w > 0 ? cw / w : dpr;
  }

  function draw(now: number) {
    if (!stack || !alive) return;
    const scale = fit();
    const { colors, edges, fronts } = pourUniforms(stack);
    gl!.viewport(0, 0, canvas.width, canvas.height);
    gl!.uniform2f(u.res, canvas.width, canvas.height);
    gl!.uniform1f(u.scale, scale);
    gl!.uniform1f(u.height, Math.max(1, height));
    gl!.uniform1f(u.time, time);
    gl!.uniform3fv(u.color, colors);
    gl!.uniform4fv(u.edge, edges);
    gl!.uniform3fv(u.front, fronts);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    lastDraw = now;
  }

  /** Дрейф нужен, пока фронт на экране, вкладка видна и с прокрутки прошло меньше SETTLE_MS. */
  const drifting = (now: number) =>
    alive && !document.hidden && !!stack && now - lastChange < SETTLE_MS && stack.edges.some((e) => frontVisible(e, stack!.line - 2, height));

  function tick(now: number) {
    raf = 0;
    if (!drifting(now)) {
      prevTick = 0;
      return;
    }
    // к концу SETTLE_MS дрейф замедляется до нуля — жидкость успокаивается, а не замирает рывком
    const calm = Math.min(1, Math.max(0, (now - lastChange - SETTLE_MS * 0.4) / (SETTLE_MS * 0.6)));
    if (prevTick) {
      time += (Math.min(now - prevTick, 100) / 1000) * (1 - calm * calm);
      // интервал между соседними кадрами, пока фронт на экране; после скрытой вкладки prevTick = 0 — не меряется
      watch(now - prevTick + slowMs, now);
      if (!alive) return;
    }
    prevTick = now;
    if (now - lastDraw >= 1000 / IDLE_FPS - 4) draw(now);
    raf = requestAnimationFrame(tick);
  }

  function kick() {
    if (!raf && drifting(performance.now())) raf = requestAnimationFrame(tick);
  }

  /** Сторож видеокарты: копит интервалы кадров и один раз решает — оставить, снизить DPR или уйти на CSS. */
  function watch(delta: number, now: number) {
    if (!guard.on) return;
    if (guard.warmup > 0) {
      guard.warmup--;
      return;
    }
    guard.deltas.push(delta);
    if (guard.deltas.length < GPU_GUARD.samples) return;
    const verdict = gpuVerdict(guard.deltas, guard.lowered);
    guard.deltas = [];
    if (verdict === "keep") {
      guard.on = false;
    } else if (verdict === "lower-dpr") {
      guard.lowered = true;
      guard.warmup = GUARD_WARMUP;
      dprCap = 1;
      // холст меньше — перерисовать сразу, в том же кадре
      draw(now);
    } else {
      // холст убирается, а слой в том же задании получает градиент (onFallback) — без пустого кадра
      teardown();
      gl!.getExtension("WEBGL_lose_context")?.loseContext();
      onFallback("slow");
    }
  }

  function teardown() {
    alive = false;
    cancelAnimationFrame(raf);
    raf = 0;
    document.removeEventListener("visibilitychange", kick);
    canvas.removeEventListener("webglcontextlost", onContextLost);
    canvas.remove();
  }

  function onContextLost(event: Event) {
    event.preventDefault();
    teardown();
    onFallback("lost");
  }

  canvas.addEventListener("webglcontextlost", onContextLost);
  document.addEventListener("visibilitychange", kick);

  return {
    render(next) {
      if (!alive) return;
      stack = next;
      lastChange = performance.now();
      draw(lastChange);
      // холст появляется в том же задании, что и первый кадр, — без чёрной вспышки
      if (!canvas.isConnected) host.appendChild(canvas);
      kick();
    },
    destroy() {
      teardown();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
