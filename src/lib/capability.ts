// Потянет ли устройство тяжёлую анимацию (WebGL-фон, 3D-стакан).
// Порт `detectWebGL` из oblako-site/src/lib/skyGl.ts без замера кадра в воркере: здесь только
// быстрые проверки — «уменьшить движение», экономия трафика, число ядер и строка рендерера WebGL2.

/** Рендерер без видеокарты: шейдеры считаются на процессоре, лучше статичный вариант. */
const SOFTWARE_GL = /swiftshader|llvmpipe|software|basic render/i;

let check: Promise<boolean> | undefined;

/** `true` — можно включать WebGL-фон и 3D. Работает только в браузере; на сервере (сборка) всегда `false`. Результат запоминается. */
export function canUseRichMotion(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  check ??= detect();
  return check;
}

async function detect(): Promise<boolean> {
  if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;

  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return false;
  if ((nav.hardwareConcurrency ?? 8) <= 4) return false;

  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return false;
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return !SOFTWARE_GL.test(renderer);
  } catch {
    return false;
  }
}
