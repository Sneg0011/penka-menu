import type { Item } from "./types";

// Реальные позиции (`real: true`) — по меню доставки «Пенки» на 4 октября 2026: название, цена, вес/объём точные.
// Придуманные (`real: false`) — для концепта: цена, вкус, калории и аллергены примерные.
// Слои напитков идут снизу вверх, `part` — доля слоя; ингредиенты еды — короткие id, их рисует src/art.
// Порядок позиций = порядок на экране; разделы идут в порядке `sections`.
export const menu: Item[] = [
  // ───────── Кофе ─────────
  {
    id: "cappuccino", section: "coffee", name: "Капучино", price: 200, priceFrom: true, size: "250 мл",
    text: "Эспрессо, горячее молоко и плотная шапка пены — классика, с которой удобно начать.",
    art: { type: "drink", vessel: "cup", layers: [{ kind: "espresso", part: 1 }, { kind: "milk", part: 2 }, { kind: "foam", part: 1.5 }] },
    taste: { sweet: 1, bitter: 2, sour: 1 }, strength: 2, kcal: 120, allergens: ["lactose"], plantMilk: true, real: true,
  },
  {
    id: "espresso", section: "coffee", name: "Эспрессо", price: 140, size: "30 мл",
    text: "Короткий и плотный: тридцать миллилитров, золотистая крема, горчинка и лёгкая кислинка.",
    art: { type: "drink", vessel: "cup", layers: [{ kind: "espresso", part: 1 }] },
    taste: { sweet: 0, bitter: 3, sour: 1 }, strength: 3, kcal: 5, allergens: [], real: false,
  },
  {
    id: "americano", section: "coffee", name: "Американо", price: 170, size: "250 мл",
    text: "Эспрессо, разбавленный горячей водой: мягче и дольше пьётся, горечь остаётся чистой.",
    art: { type: "drink", vessel: "cup", layers: [{ kind: "espresso", part: 1 }, { kind: "water", part: 4 }] },
    taste: { sweet: 0, bitter: 2, sour: 1 }, strength: 2, kcal: 5, allergens: [], real: false,
  },
  {
    id: "latte", section: "coffee", name: "Латте", price: 260, size: "300 мл",
    text: "Много горячего молока, один эспрессо и тонкая пенка; вкус мягкий и сливочный.",
    art: { type: "drink", vessel: "glass", layers: [{ kind: "espresso", part: 1 }, { kind: "milk", part: 4 }, { kind: "foam", part: 0.5 }] },
    taste: { sweet: 2, bitter: 1, sour: 0 }, strength: 1, kcal: 170, allergens: ["lactose"], plantMilk: true, real: false,
  },
  {
    id: "flat-white", section: "coffee", name: "Флэт уайт", price: 270, size: "200 мл",
    text: "Двойной эспрессо и бархатное молоко почти без пены — кофе здесь слышно сильнее, чем в латте.",
    art: { type: "drink", vessel: "cup", layers: [{ kind: "espresso", part: 2 }, { kind: "milk", part: 3.5 }, { kind: "foam", part: 0.5 }] },
    taste: { sweet: 1, bitter: 2, sour: 1 }, strength: 3, kcal: 130, allergens: ["lactose"], plantMilk: true, real: false,
  },
  {
    id: "cortado", section: "coffee", name: "Кортадо", price: 190, size: "120 мл",
    text: "Эспрессо пополам с тёплым молоком: пены почти нет, горечь смягчена, а вкус остаётся плотным.",
    art: { type: "drink", vessel: "cup", layers: [{ kind: "espresso", part: 1 }, { kind: "milk", part: 1 }, { kind: "foam", part: 0.2 }] },
    taste: { sweet: 1, bitter: 2, sour: 1 }, strength: 3, kcal: 70, allergens: ["lactose"], plantMilk: true, real: false,
  },

  // ───────── Рафы и авторский ─────────
  {
    id: "raf-pistachio", section: "raf", name: "Раф «Фисташковый»", price: 290, priceGuess: true, size: "250 мл",
    text: "Эспрессо со сливками и фисташковой пастой, взбитые паром до кремовой густоты; сверху фисташковая крошка.",
    art: { type: "drink", vessel: "cup", layers: [{ kind: "espresso", part: 1 }, { kind: "cream", part: 3, color: "#c9d6a0" }, { kind: "foam", part: 0.5 }] },
    taste: { sweet: 3, bitter: 1, sour: 0 }, strength: 1, kcal: 330, allergens: ["lactose", "nuts"], real: true,
  },
  {
    id: "raf-classic", section: "raf", name: "Раф классический", price: 280, size: "250 мл",
    text: "Эспрессо, сливки и ванильный сахар, прогретые паром: густо, сладко, почти десерт.",
    art: { type: "drink", vessel: "cup", layers: [{ kind: "espresso", part: 1 }, { kind: "cream", part: 3 }, { kind: "foam", part: 0.5 }] },
    taste: { sweet: 3, bitter: 1, sour: 0 }, strength: 1, kcal: 300, allergens: ["lactose"], real: false,
  },
  {
    id: "raf-lavender", section: "raf", name: "Раф лавандовый", price: 320, size: "250 мл",
    text: "Классический раф с лавандовым сиропом: цветочный аромат и мягкая сладость без резкости.",
    art: { type: "drink", vessel: "cup", layers: [{ kind: "espresso", part: 1 }, { kind: "syrup", part: 0.5, color: "#b79ad6" }, { kind: "cream", part: 2.5 }, { kind: "foam", part: 0.5 }] },
    taste: { sweet: 3, bitter: 1, sour: 0 }, strength: 1, kcal: 310, allergens: ["lactose"], real: false,
  },
  {
    id: "latte-salted-caramel", section: "raf", name: "Латте «Солёная карамель»", price: 300, size: "300 мл",
    text: "Латте с карамельным сиропом и щепоткой морской соли: сладко, а в конце чуть солоновато.",
    art: { type: "drink", vessel: "glass", layers: [{ kind: "espresso", part: 1 }, { kind: "syrup", part: 0.5, color: "#c98a3c" }, { kind: "milk", part: 4 }, { kind: "foam", part: 0.5 }] },
    taste: { sweet: 3, bitter: 1, sour: 0 }, strength: 1, kcal: 260, allergens: ["lactose"], plantMilk: true, real: false,
  },

  // ───────── Чай ─────────
  {
    id: "tea-black", section: "tea", name: "Чёрный чай", price: 180, size: "400 мл",
    text: "Крупнолистовой чёрный чай в чайнике: насыщенный, терпкий, подходит и с лимоном, и без.",
    art: { type: "drink", vessel: "teapot", layers: [{ kind: "tea", part: 1, color: "#7a3b12" }] },
    taste: { sweet: 0, bitter: 2, sour: 0 }, kcal: 2, allergens: [], real: false,
  },
  {
    id: "tea-green", section: "tea", name: "Зелёный чай", price: 180, size: "400 мл",
    text: "Лёгкий зелёный чай с травяной ноткой и сухим послевкусием; горчит, только если передержать.",
    art: { type: "drink", vessel: "teapot", layers: [{ kind: "tea", part: 1, color: "#b5b04a" }] },
    taste: { sweet: 0, bitter: 1, sour: 0 }, kcal: 2, allergens: [], real: false,
  },
  {
    id: "tea-seabuckthorn", section: "tea", name: "Облепиховый чай", price: 240, size: "400 мл",
    text: "Горячий чай с облепихой, апельсином и мёдом: яркий, кисло-сладкий, согревает за пару глотков.",
    art: { type: "drink", vessel: "glass", layers: [{ kind: "tea", part: 4, color: "#e58a28" }, { kind: "juice", part: 1, color: "#f4b13a" }] },
    taste: { sweet: 2, bitter: 0, sour: 2 }, kcal: 90, allergens: [], real: false,
  },
  {
    id: "tea-ginger", section: "tea", name: "Имбирный чай", price: 220, size: "400 мл",
    text: "Свежий имбирь, лимон и немного мёда на чёрном чае: острый, с кислинкой и тёплым послевкусием.",
    art: { type: "drink", vessel: "teapot", layers: [{ kind: "tea", part: 1, color: "#c98a2b" }] },
    taste: { sweet: 1, bitter: 1, sour: 1 }, kcal: 60, allergens: [], real: false,
  },

  // ───────── Холодные ─────────
  {
    id: "mors-cranberry", section: "cold", name: "Морс клюквенный", price: 240, size: "400 мл",
    text: "Морс из клюквы, который варят в самой кофейне: кисло-сладкий, холодный, с ягодной терпкостью.",
    art: { type: "drink", vessel: "tall", layers: [{ kind: "ice", part: 1 }, { kind: "juice", part: 5, color: "#b3203f" }] },
    taste: { sweet: 1, bitter: 0, sour: 3 }, kcal: 130, allergens: [], real: true,
  },
  {
    id: "mors-currant", section: "cold", name: "Морс смородиновый", price: 240, size: "400 мл",
    text: "Морс из смородины, тоже домашний: густой, чуть сладкий, с ярким ароматом ягоды.",
    art: { type: "drink", vessel: "tall", layers: [{ kind: "ice", part: 1 }, { kind: "juice", part: 5, color: "#4d1a3f" }] },
    taste: { sweet: 2, bitter: 0, sour: 2 }, kcal: 140, allergens: [], real: true,
  },
  {
    id: "fresh-orange", section: "cold", name: "Фреш апельсиновый", price: 760, size: "400 мл",
    text: "Свежевыжатый апельсиновый сок: яркий, сладкий, с лёгкой цитрусовой кислинкой.",
    art: { type: "drink", vessel: "glass", layers: [{ kind: "juice", part: 1, color: "#f28a1c" }] },
    taste: { sweet: 2, bitter: 0, sour: 2 }, kcal: 180, allergens: [], real: true,
  },
  {
    id: "fresh-apple", section: "cold", name: "Фреш яблочный", price: 720, size: "400 мл",
    text: "Свежевыжатый яблочный сок: мягкая сладость и свежесть, кислинки почти нет.",
    art: { type: "drink", vessel: "glass", layers: [{ kind: "juice", part: 1, color: "#d9b84a" }] },
    taste: { sweet: 3, bitter: 0, sour: 1 }, kcal: 190, allergens: [], real: true,
  },
  {
    id: "fresh-carrot", section: "cold", name: "Фреш морковный", price: 500, size: "400 мл",
    text: "Свежевыжатый морковный сок: сладковатый, чуть землистый, густого оранжевого цвета.",
    art: { type: "drink", vessel: "glass", layers: [{ kind: "juice", part: 1, color: "#e8761c" }] },
    taste: { sweet: 2, bitter: 0, sour: 0 }, kcal: 150, allergens: [], real: true,
  },
  {
    id: "iced-latte", section: "cold", name: "Айс латте", price: 280, size: "400 мл",
    text: "Холодное молоко, лёд и порция эспрессо сверху: освежает и бодрит, сахара в нём нет.",
    art: { type: "drink", vessel: "tall", layers: [{ kind: "ice", part: 2 }, { kind: "milk", part: 4 }, { kind: "espresso", part: 1 }] },
    taste: { sweet: 1, bitter: 1, sour: 0 }, strength: 1, kcal: 150, allergens: ["lactose"], plantMilk: true, real: false,
  },
  {
    id: "lemonade", section: "cold", name: "Лимонад лимонный", price: 260, size: "400 мл",
    text: "Лимон, мята и много льда в высоком стакане: кислый, холодный и очень освежающий.",
    art: { type: "drink", vessel: "tall", layers: [{ kind: "ice", part: 2 }, { kind: "juice", part: 4, color: "#ece27a" }] },
    taste: { sweet: 2, bitter: 0, sour: 3 }, kcal: 110, allergens: [], real: false,
  },

  // ───────── Завтраки ─────────
  {
    id: "breakfast-lord", section: "breakfast", name: "Завтрак английского лорда", price: 690, size: "380 г",
    text: "Два жареных яйца, колбаски, бекон, томаты и фасоль, к ним чиабатта: английский завтрак на целый день.",
    art: { type: "food", dish: "plate", ingredients: ["egg", "sausage", "bacon", "tomato", "beans", "bread"] },
    kcal: 880, allergens: ["eggs", "gluten"], real: true,
  },
  {
    id: "buckwheat-poached", section: "breakfast", name: "Зелёная гречка с яйцом пашот и пармезаном", price: 400, size: "210 г",
    text: "Зелёная гречка в сливочном соусе со шпинатом, яйцо пашот в центре и стружка пармезана.",
    art: { type: "food", dish: "bowl", ingredients: ["buckwheat", "egg", "spinach", "cheese"] },
    kcal: 430, allergens: ["eggs", "lactose"], real: true,
  },
  {
    id: "millet-pumpkin", section: "breakfast", name: "Каша пшённая с тыквой, изюмом и грецким орехом", price: 410, size: "280 г",
    text: "Пшённая каша с кусочками тыквы, изюмом и грецким орехом: тёплая, сладковатая, сытная.",
    art: { type: "food", dish: "bowl", ingredients: ["millet", "pumpkin", "nut"] },
    kcal: 380, allergens: ["lactose", "nuts"], real: true,
  },
  {
    id: "oatmeal-water", section: "breakfast", name: "Овсяная каша на воде", price: 230, size: "260 г",
    text: "Овсянка на воде с добавками на выбор — самый лёгкий вариант для утра.",
    art: { type: "food", dish: "bowl", ingredients: ["oats", "berries"] },
    kcal: 220, allergens: ["gluten"], real: true,
  },
  {
    id: "oatmeal-milk", section: "breakfast", name: "Овсяная каша на молоке", price: 260, size: "260 г",
    text: "Овсянка, сваренная на молоке: мягче и сытнее, чем на воде; добавки на выбор.",
    art: { type: "food", dish: "bowl", ingredients: ["oats", "banana"] },
    kcal: 310, allergens: ["gluten", "lactose"], real: true,
  },
  {
    id: "oatmeal-cream", section: "breakfast", name: "Овсяная каша на сливках", price: 320, size: "260 г",
    text: "Овсянка на сливках — густая, кремовая, почти как десерт; добавки на выбор.",
    art: { type: "food", dish: "bowl", ingredients: ["oats", "cream", "berries"] },
    kcal: 420, allergens: ["gluten", "lactose"], real: true,
  },
  {
    id: "breakfast-russian", section: "breakfast", name: "Завтрак «Русский»", price: 590, size: "400 г",
    text: "Молочная каша, сырники и блинчики со сметаной, ягодами и клубничным соусом; сверху грецкий орех.",
    art: { type: "food", dish: "plate", ingredients: ["oats", "curd", "pancake", "cream", "berries", "nut"] },
    kcal: 780, allergens: ["gluten", "lactose", "eggs", "nuts"], real: true,
  },
  {
    id: "breakfast-penka", section: "breakfast", name: "Фирменный завтрак «Пенка»", price: 710, size: "320 г",
    text: "Яйцо пашот, авокадо и бекон на круассане, с зеленью; состав примерный, точнее спросите в зале.",
    art: { type: "food", dish: "plate", ingredients: ["croissant", "egg", "avocado", "bacon", "greens"] },
    kcal: 640, allergens: ["gluten", "eggs", "lactose"], real: true,
  },
  {
    id: "breakfast-fitness", section: "breakfast", name: "Фитнес-завтрак", price: 720, size: "275 г",
    text: "Шпинатный омлет, половинка авокадо, лосось на чиабатте с творожным сыром и хрустящий салат.",
    art: { type: "food", dish: "plate", ingredients: ["egg", "spinach", "avocado", "salmon", "bread", "tomato"] },
    kcal: 560, allergens: ["eggs", "fish", "gluten", "lactose"], real: true,
  },
  {
    id: "shakshuka", section: "breakfast", name: "Шакшука", price: 510, size: "300 г",
    text: "Яйца, томлёные в пряной томатной подливе с перцем и луком; фета, кинза и чиабатта для макания.",
    art: { type: "food", dish: "deep", ingredients: ["tomato", "egg", "pepper", "cheese", "greens", "bread"] },
    kcal: 430, allergens: ["eggs", "lactose", "gluten"], real: true,
  },
  {
    id: "omelet-two-eggs", section: "breakfast", name: "Омлет из двух яиц", price: 250, size: "140 г",
    text: "Классический омлет из двух яиц: румяный снаружи, мягкий внутри.",
    art: { type: "food", dish: "plate", ingredients: ["egg"] },
    kcal: 290, allergens: ["eggs", "lactose"], real: true,
  },

  // ───────── Вафли и закуски ─────────
  {
    id: "pancake-caesar", section: "waffles", name: "Блинчик «Цезарь»", price: 440, size: "250 г",
    text: "Тонкий блин с начинкой в духе «Цезаря»: курица, салатные листья и пармезан.",
    art: { type: "food", dish: "plate", ingredients: ["pancake", "chicken", "greens", "cheese"] },
    kcal: 520, allergens: ["gluten", "eggs", "lactose"], real: true,
  },
  {
    id: "pancake-mushroom", section: "waffles", name: "Блинчик с грибным жюльеном", price: 480, size: "250 г",
    text: "Блин, внутри шампиньоны в сливочной подливе, сверху сырная корочка.",
    art: { type: "food", dish: "plate", ingredients: ["pancake", "mushroom", "cheese", "cream"] },
    kcal: 480, allergens: ["gluten", "eggs", "lactose"], real: true,
  },
  {
    id: "waffle-viennese", section: "waffles", name: "Венские вафли с бананом, малиной и горячим шоколадом", price: 460, size: "220 г",
    text: "Хрустящие венские вафли, банан, малина и горячий шоколад: сладкий завтрак без компромиссов.",
    art: { type: "food", dish: "plate", ingredients: ["waffle", "banana", "berries", "chocolate"] },
    kcal: 620, allergens: ["gluten", "eggs", "lactose"], real: true,
  },
  {
    id: "waffle-cheese-julienne", section: "waffles", name: "Сырная вафля с жюльеном", price: 510, size: "175 г",
    text: "Сырная вафля вместо хлеба: сверху сливочные грибы под пармезаном и веточки микрозелени.",
    art: { type: "food", dish: "plate", ingredients: ["waffle", "mushroom", "cheese", "greens"] },
    kcal: 470, allergens: ["gluten", "eggs", "lactose"], real: true,
  },
  {
    id: "waffle-cheese-chicken", section: "waffles", name: "Сырная вафля с курицей", price: 510, size: "260 г",
    text: "Сырная вафля, на ней курица с беконом и глазуньей, огурец, салат и два соуса — сметанный и сырный.",
    art: { type: "food", dish: "plate", ingredients: ["waffle", "chicken", "bacon", "egg", "cucumber", "greens"] },
    kcal: 620, allergens: ["gluten", "eggs", "lactose"], real: true,
  },
  {
    id: "waffle-cheese-trout", section: "waffles", name: "Сырная вафля с форелью", price: 670, size: "230 г",
    text: "Форель на сырной вафле с авокадо и яйцом пашот; вяленые томаты добавляют сладкую кислинку.",
    art: { type: "food", dish: "plate", ingredients: ["waffle", "trout", "avocado", "egg", "tomato", "greens"] },
    kcal: 600, allergens: ["gluten", "eggs", "lactose", "fish"], real: true,
  },
  {
    id: "waffle-spinach-julienne", section: "waffles", name: "Сырно-шпинатная вафля с жюльеном", price: 510, size: "175 г",
    text: "Вафля из теста со шпинатом и сыром — зелёная, солёная, с грибным жюльеном сверху.",
    art: { type: "food", dish: "plate", ingredients: ["waffle", "spinach", "mushroom", "cheese"] },
    kcal: 450, allergens: ["gluten", "eggs", "lactose"], real: true,
  },
  {
    id: "waffle-spinach-chicken", section: "waffles", name: "Сырно-шпинатная вафля с курицей", price: 510, size: "260 г",
    text: "Зелёная шпинатная вафля с курицей, огурцом, салатом и сырным соусом.",
    art: { type: "food", dish: "plate", ingredients: ["waffle", "spinach", "chicken", "cucumber", "greens"] },
    kcal: 600, allergens: ["gluten", "eggs", "lactose"], real: true,
  },
  {
    id: "waffle-spinach-trout", section: "waffles", name: "Сырно-шпинатная вафля с форелью", price: 670, size: "230 г",
    text: "Шпинатная вафля с форелью, авокадо и яйцом пашот: свежий вкус и яркий цвет.",
    art: { type: "food", dish: "plate", ingredients: ["waffle", "spinach", "trout", "avocado", "egg"] },
    kcal: 580, allergens: ["gluten", "eggs", "lactose", "fish"], real: true,
  },
  {
    id: "syrniki", section: "waffles", name: "Сырники из творога", price: 370, size: "135 г",
    text: "Творожные сырники с румяной корочкой и мягкой серединкой; сметана рядом.",
    art: { type: "food", dish: "plate", ingredients: ["curd", "cream"] },
    kcal: 380, allergens: ["gluten", "eggs", "lactose"], real: true,
  },
  {
    id: "syrniki-berry", section: "waffles", name: "Сырники с ягодным соусом", price: 410, size: "195 г",
    text: "Румяные сырники под ягодным соусом: кислинка ягод уравновешивает сладкий творог.",
    art: { type: "food", dish: "plate", ingredients: ["curd", "berries"] },
    kcal: 430, allergens: ["gluten", "eggs", "lactose"], real: true,
  },

  // ───────── Супы ─────────
  {
    id: "soup-chicken-noodles", section: "soups", name: "Куриный бульон с лапшой", price: 350, size: "250 г",
    text: "Горячий бульон на курице с лапшой и варёным яйцом, сверху зелень: просто и по-домашнему.",
    art: { type: "food", dish: "bowl", ingredients: ["chicken", "pasta", "egg", "greens"] },
    kcal: 210, allergens: ["gluten", "eggs"], real: true,
  },
  {
    id: "soup-chicken-egg", section: "soups", name: "Куриный бульон с яйцом", price: 350, size: "350 г",
    text: "Бульон с кусочками курицы и яйцом, отдельно хрустят гренки; сверху щепотка зелени.",
    art: { type: "food", dish: "bowl", ingredients: ["chicken", "egg", "crouton", "greens"] },
    kcal: 230, allergens: ["gluten", "eggs"], real: true,
  },
  {
    id: "soup-pumpkin", section: "soups", name: "Тыквенный крем-суп", price: 360, size: "300 г",
    text: "Сладковатый тыквенный крем-суп со сливками, сверху хрустящие гренки и зелень.",
    art: { type: "food", dish: "bowl", ingredients: ["pumpkin", "cream", "crouton", "greens"] },
    kcal: 260, allergens: ["lactose", "gluten"], real: false,
  },
  {
    id: "soup-mushroom", section: "soups", name: "Грибной крем-суп", price: 380, size: "300 г",
    text: "Густой суп-пюре из шампиньонов и белых грибов со сливками, к нему гренки.",
    art: { type: "food", dish: "bowl", ingredients: ["mushroom", "cream", "crouton", "greens"] },
    kcal: 290, allergens: ["lactose", "gluten"], real: false,
  },

  // ───────── Паста и вок ─────────
  {
    id: "wok-shrimp", section: "pasta", name: "Вок с креветками", price: 590, size: "250 г",
    text: "Лингвини, тигровые креветки, хрустящие овощи и сливочный соус унаги — сладковатый и пряный.",
    art: { type: "food", dish: "deep", ingredients: ["pasta", "shrimp", "pepper", "mushroom", "greens"] },
    kcal: 640, allergens: ["gluten", "seafood", "lactose"], real: true,
  },
  {
    id: "carbonara", section: "pasta", name: "Карбонара", price: 510, size: "250 г",
    text: "Паста в густом яично-сливочном соусе с хрустящим беконом и пармезаном.",
    art: { type: "food", dish: "plate", ingredients: ["pasta", "bacon", "egg", "cheese"] },
    kcal: 720, allergens: ["gluten", "eggs", "lactose"], real: true,
  },
  {
    id: "penne-chicken-mushrooms", section: "pasta", name: "Пенне с куриной грудкой, белыми грибами, шампиньонами в сливочном соусе", price: 560, size: "280 г",
    text: "Пенне с курицей и двумя видами грибов под сливочным соусом, сверху пармезан.",
    art: { type: "food", dish: "plate", ingredients: ["pasta", "chicken", "mushroom", "cream", "cheese"] },
    kcal: 690, allergens: ["gluten", "lactose"], real: true,
  },
  {
    id: "wok-chicken", section: "pasta", name: "Вок с курицей", price: 540, size: "250 г",
    text: "Лапша с курицей и овощами в соевом соусе, быстро обжаренная на сильном огне.",
    art: { type: "food", dish: "deep", ingredients: ["pasta", "chicken", "pepper", "greens"] },
    kcal: 560, allergens: ["gluten"], real: false,
  },

  // ───────── Салаты ─────────
  {
    id: "salad-green", section: "salads", name: "Зелёный салат", price: 510, size: "150 г",
    text: "Микс листьев, огурец и свежая зелень под лёгкой заправкой: хрустит и освежает.",
    art: { type: "food", dish: "bowl", ingredients: ["greens", "cucumber"] },
    kcal: 110, allergens: [], real: true,
  },
  {
    id: "salad-caesar", section: "salads", name: "Салат «Цезарь» с курицей", price: 510, size: "190 г",
    text: "Курица, хрустящие гренки и пармезан на салатных листьях под густой заправкой «Цезарь».",
    art: { type: "food", dish: "bowl", ingredients: ["greens", "chicken", "crouton", "cheese", "egg", "tomato"] },
    kcal: 420, allergens: ["gluten", "eggs", "lactose"], real: true,
  },
  {
    id: "salad-chicken-veg", section: "salads", name: "Салат с цыплёнком на гриле и печёными овощами", price: 540, size: "185 г",
    text: "Курица с огня, запечённые овощи и листья салата: тёплый салат с лёгким дымком.",
    art: { type: "food", dish: "bowl", ingredients: ["chicken", "greens", "pepper", "tomato"] },
    kcal: 330, allergens: [], real: true,
  },
  {
    id: "salad-tuna-quinoa", section: "salads", name: "Салат с тунцом и киноа", price: 550, size: "200 г",
    text: "Тунец, киноа, томаты и зелень с лимонной заправкой: лёгкий и при этом сытный.",
    art: { type: "food", dish: "bowl", ingredients: ["tuna", "quinoa", "tomato", "greens", "lemon"] },
    kcal: 340, allergens: ["fish"], real: false,
  },

  // ───────── Десерты ─────────
  {
    id: "wafer-rolls", section: "desserts", name: "Вафельные трубочки с варёной сгущёнкой", price: 200, size: "90 г",
    text: "Хрустящие вафельные трубочки с начинкой из варёной сгущёнки — сладкая пара к кофе.",
    art: { type: "food", dish: "pastry", ingredients: ["waffle", "caramel"] },
    kcal: 420, allergens: ["gluten", "lactose"], real: true,
  },
  {
    id: "dessert-raspberry-pistachio", section: "desserts", name: "Десерт «Малина-фисташка»", price: 430, size: "130 г",
    text: "Лёгкий бисквит на миндале, малиновая прослойка и фисташковый мусс сверху: кисло-сладко.",
    art: { type: "food", dish: "slice", ingredients: ["berries", "pistachio", "nut"] },
    kcal: 380, allergens: ["nuts", "lactose", "eggs"], real: true,
  },
  {
    id: "dessert-curd-blueberry", section: "desserts", name: "Десерт творожно-черничный", price: 380, size: "150 г",
    text: "Мусс из творога и лимона со слоем черники внутри: свежая кислинка, сливочная сладость.",
    art: { type: "food", dish: "slice", ingredients: ["curd", "berries", "lemon"] },
    kcal: 320, allergens: ["lactose"], real: true,
  },
  {
    id: "choux-ring", section: "desserts", name: "Кольцо заварное с сырно-сливочным кремом", price: 220, size: "110 г",
    text: "Заварное кольцо, внутри крем из сливок и сыра: сытное и не слишком сладкое.",
    art: { type: "food", dish: "pastry", ingredients: ["cream"] },
    kcal: 380, allergens: ["gluten", "eggs", "lactose"], real: true,
  },
  {
    id: "croissant-napoleon", section: "desserts", name: "Круассан «Наполеон»", price: 180, size: "75 г",
    text: "«Наполеон» в формате круассана: заварной крем внутри и хрусткая песочная посыпка сверху.",
    art: { type: "food", dish: "pastry", ingredients: ["croissant", "cream"] },
    kcal: 320, allergens: ["gluten", "eggs", "lactose"], real: true,
  },
  {
    id: "croissant-lemon", section: "desserts", name: "Круассан с лимонной начинкой", price: 180, size: "75 г",
    text: "Круассан с лимонным кремом и воздушной меренгой: кислинка и сладость поровну.",
    art: { type: "food", dish: "pastry", ingredients: ["croissant", "lemon"] },
    kcal: 310, allergens: ["gluten", "eggs", "lactose"], real: true,
  },
  {
    id: "macaron", section: "desserts", name: "Макарон", price: 130, size: "25 г",
    text: "Хрупкое миндальное печенье с кремовой серединкой: пара укусов к эспрессо.",
    art: { type: "food", dish: "pastry", ingredients: ["macaron"] },
    kcal: 110, allergens: ["nuts", "eggs", "lactose"], real: true,
  },
  {
    id: "cake-penka", section: "desserts", name: "Торт «Пенка»", price: 410, size: "110 г",
    text: "Фирменный торт кофейни: миндальная основа, шоколадный крем, ликёр и кофейная нотка.",
    art: { type: "food", dish: "slice", ingredients: ["chocolate", "nut", "cream"] },
    kcal: 460, allergens: ["nuts", "lactose", "eggs", "gluten"], real: true,
  },
  {
    id: "cake-hausmann", section: "desserts", name: "Торт «Хаусман»", price: 380, size: "115 г",
    text: "Бисквит с кешью и черносливом, а сверху крем из двух шоколадов — белого и тёмного.",
    art: { type: "food", dish: "slice", ingredients: ["nut", "chocolate", "cream"] },
    kcal: 480, allergens: ["nuts", "gluten", "eggs", "lactose"], real: true,
  },
  {
    id: "cheesecake", section: "desserts", name: "Чизкейк «Сырный»", price: 430, size: "150 г",
    text: "Сливочный сыр на хрустящей песочной основе: плотный, насыщенный и не приторный.",
    art: { type: "food", dish: "slice", ingredients: ["cheese", "cream"] },
    kcal: 480, allergens: ["gluten", "eggs", "lactose"], real: true,
  },
  {
    id: "eclair-lemon", section: "desserts", name: "Эклер лимонный с меренгой", price: 260, size: "110 г",
    text: "Эклер с лимонным кремом и меренгой сверху: кисло-сладкий и воздушный.",
    art: { type: "food", dish: "pastry", ingredients: ["lemon", "cream"] },
    kcal: 300, allergens: ["gluten", "eggs", "lactose"], real: true,
  },
  {
    id: "eclair-pistachio", section: "desserts", name: "Эклер фисташковый", price: 260, size: "95 г",
    text: "Эклер, начинённый сливочным заварным кремом с фисташкой: сладкий, ореховый, мягкий.",
    art: { type: "food", dish: "pastry", ingredients: ["pistachio", "cream"] },
    kcal: 320, allergens: ["nuts", "gluten", "eggs", "lactose"], real: true,
  },
];
