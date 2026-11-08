"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ArtDefs } from "@/art/ArtDefs";
import { sections } from "@/content/sections";
import { scrollToSection, useSectionProgress } from "@/motion/useSectionProgress";

import { Footer } from "./Footer";
import { HabitSheet } from "./HabitSheet";
import { Header } from "./Header";
import { Hero } from "./Hero";
import { ItemSheet } from "./ItemSheet";
import { MenuSection } from "./MenuSection";
import { SectionCarousel } from "./SectionCarousel";

/**
 * Липкая шапка с каруселью — единственное, что перерисовывается на каждый кадр прокрутки.
 *
 * Карусель и меню связаны в обе стороны. Прокрутка → useSectionProgress → колесо поворачивается на `index + t`,
 * шапка берёт тему текущего раздела. Выбор в карусели → плавная прокрутка к разделу; пока она идёт, шапка
 * и карусель уже стоят на выбранном разделе (`target`) и не мигают темами промежуточных.
 */
function MenuChrome() {
  const progress = useSectionProgress();
  const [target, setTarget] = useState<number | null>(null);
  const jump = useRef(0);

  const active = target ?? progress.index;
  const theme = sections[active];

  const pick = useCallback((index: number) => {
    const ticket = ++jump.current;
    setTarget(index);
    void scrollToSection(sections[index].id).then(() => {
      // отпускаем, только если за это время не выбрали другой раздел
      if (jump.current === ticket) setTarget(null);
    });
  }, []);

  // Цвет панели браузера на телефоне — под текущий раздел
  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme.bg[0]);
  }, [theme]);

  return (
    <Header theme={theme}>
      <SectionCarousel active={active} onPick={pick} position={target ?? progress.index + progress.t} />
    </Header>
  );
}

/**
 * Экран меню: липкая шапка с каруселью, первый экран (Hero: вход по привычке и стаканчик), общие рисунки (<ArtDefs /> — один
 * раз, после первого экрана, перед разделами), разделы, футер и две шторки: подборка по привычке и карточка
 * позиции. Карточку можно открыть и из раздела, и из подборки — тогда она ложится поверх подборки.
 * Сам экран прокрутку не слушает: разделы и общие рисунки не перерисовываются, пока листают меню.
 */
// Неизменные части экрана — одни и те же элементы: React не перерисовывает их, когда открывают шторку
const ART_DEFS = <ArtDefs />;
const FOOTER = <Footer />;

export function MenuScreen() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [habitId, setHabitId] = useState<string | null>(null);
  const open = useCallback((id: string) => setOpenId(id), []);
  const close = useCallback(() => setOpenId(null), []);
  const pickHabit = useCallback((id: string) => setHabitId(id), []);
  const closeHabit = useCallback(() => setHabitId(null), []);

  return (
    <>
      <MenuChrome />
      <main>
        <Hero onPickHabit={pickHabit} />
        {ART_DEFS}
        {sections.map((section) => (
          <MenuSection key={section.id} section={section} onOpen={open} />
        ))}
      </main>
      {FOOTER}
      {/* Порядок важен: карточка позиции идёт после подборки и открывается поверх неё (стопка шторок в Sheet) */}
      <HabitSheet habitId={habitId} onClose={closeHabit} onOpenItem={open} />
      <ItemSheet itemId={openId} onClose={close} onOpenItem={setOpenId} />
    </>
  );
}
