import { readFileSync } from "node:fs";
import { join } from "node:path";

import { FRAME_QUERY } from "@/motion/useSectionProgress";

// Рамка телефона включается условием в двух местах: в CSS (вёрстка) и в JS (окно прокрутки). Они не должны разойтись.
const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

describe("рамка телефона", () => {
  it("условие в globals.css то же, что FRAME_QUERY в JS", () => {
    expect(FRAME_QUERY).toBe("(min-width: 768px) and (min-height: 600px)");
    expect(css).toContain(`@media ${FRAME_QUERY} {`);
  });

  it("телефон «лёжа» (844 × 390) рамки не получает: условие требует высоту от 600 px", () => {
    expect(FRAME_QUERY).toContain("min-height: 600px");
  });

  it("подписи по краям рамки включаются только там, где есть рамка", () => {
    expect(css).toContain("@media (min-width: 1100px) and (min-height: 600px) {");
  });
});
