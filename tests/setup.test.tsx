import { render, screen } from "@testing-library/react";

// Страница целиком рендерится в jsdom — убеждаемся, что окружение из tests/setup.ts на месте
// и что JSX собирается без `import React`.

test("JSX рендерится, матчеры jest-dom подключены", () => {
  render(<p>Пенка</p>);
  expect(screen.getByText("Пенка")).toBeInTheDocument();
});

test("заглушки браузерных API на месте", () => {
  expect(() => new IntersectionObserver(() => {}).observe(document.body)).not.toThrow();
  expect(() => new ResizeObserver(() => {}).observe(document.body)).not.toThrow();
  expect(window.matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(false);
  expect(document.createElement("canvas").getContext("2d")).toBeNull();
});
