import type { Section } from "./types";

// Порядок — как в дизайне и в карусели. `ink` и `accent` читаются (контраст ≥ 4,5) на обоих цветах `bg`.
export const sections: Section[] = [
  { id: "coffee", title: "Кофе", tone: "dark", bg: ["#1b110b", "#3b2417"], ink: "#f5e8d6", accent: "#e0a769" },
  { id: "raf", title: "Рафы и авторский", tone: "light", bg: ["#f5e9d3", "#ecd9b8"], ink: "#3a2416", accent: "#8a4a1c" },
  { id: "tea", title: "Чай", tone: "light", bg: ["#f2c877", "#e5a94d"], ink: "#35200a", accent: "#5f2f04" },
  { id: "cold", title: "Холодные", tone: "light", bg: ["#f8e3ea", "#efc8d6"], ink: "#4a1830", accent: "#a8224f" },
  { id: "breakfast", title: "Завтраки", tone: "light", bg: ["#fcf7ee", "#f3ebdc"], ink: "#33261c", accent: "#85542a" },
  { id: "waffles", title: "Вафли и закуски", tone: "light", bg: ["#ecbd82", "#dca25b"], ink: "#38200a", accent: "#5f2f04" },
  { id: "soups", title: "Супы", tone: "light", bg: ["#eeb59a", "#df916d"], ink: "#3a1a0d", accent: "#611f08" },
  { id: "pasta", title: "Паста и вок", tone: "dark", bg: ["#222428", "#383b40"], ink: "#efebe4", accent: "#e3b57c" },
  { id: "salads", title: "Салаты", tone: "light", bg: ["#e6f0d7", "#d1e4b8"], ink: "#1e3318", accent: "#2f6a1f" },
  { id: "desserts", title: "Десерты", tone: "light", bg: ["#f8d7e0", "#eeb4c8"], ink: "#4a1428", accent: "#961548" },
];
