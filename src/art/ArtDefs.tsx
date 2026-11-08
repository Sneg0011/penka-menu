import { DrinkDefs } from "./DrinkArt";
import { FoodDefs } from "./FoodArt";
import { IngredientSprites } from "./ingredients";
import { GrainFilter } from "./shared";

/**
 * Всё неизменное для рисунков — зерно, градиенты, посуда, кусочки еды — с фиксированными id `pk-…`.
 * Рендерить РОВНО ОДИН РАЗ на странице, где есть DrinkArt / FoodArt / ItemArt (сейчас /dev/art,
 * в меню — Task 5): без него рисунки остаются без посуды и ингредиентов.
 * Не display:none — так в части браузеров перестают работать ссылки на градиенты.
 */
export function ArtDefs() {
  return (
    <svg
      aria-hidden="true"
      data-art-defs=""
      width="0"
      height="0"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden", pointerEvents: "none" }}
    >
      <defs>
        <GrainFilter id="pk-grain" />
        <DrinkDefs />
        <FoodDefs />
        <IngredientSprites />
      </defs>
    </svg>
  );
}
