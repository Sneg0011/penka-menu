import type { Habit, Review } from "./types";

// Привычки — вход «Что вы обычно пьёте?». Порядок и формулировки фиксированы.
export const habits: Habit[] = [
  { id: "instant-milk", label: "Растворимый с молоком" },
  { id: "chain-cappuccino", label: "Капучино из сетевых кофеен" },
  { id: "black", label: "Чёрный без сахара" },
  { id: "tea", label: "Чай" },
  { id: "sweet-syrup", label: "Сладкое с сиропом" },
  { id: "energy", label: "Энергетики" },
  { id: "no-coffee", label: "Вообще не пью кофе" },
];

// Демо-отзывы (в интерфейсе — с пометкой «пример»): «обычно пью habit → здесь понравилось item → nuance».
// Один напиток может встретиться у привычки несколько раз — это его «голоса» в подборке.
export const reviews: Review[] = [
  // Растворимый с молоком
  { habit: "instant-milk", item: "latte", nuance: "Ближе всего к привычному вкусу, только без растворимой «химии»: молоко и мягкий кофе." },
  { habit: "instant-milk", item: "latte", nuance: "Сахар попросила отдельно — так сама подобрала сладость под себя." },
  { habit: "instant-milk", item: "cappuccino", nuance: "Кофе слышно сильнее, чем в растворимом, зато пена смягчает вкус. Для первого раза в самый раз." },
  { habit: "instant-milk", item: "latte-salted-caramel", nuance: "Если любите послаще — берите с карамелью, остальное как привычное «кофе с молоком»." },
  { habit: "instant-milk", item: "raf-classic", nuance: "Самый молочный вкус, почти как со сгущёнкой. Я бы попросил поменьше сахара." },

  // Капучино из сетевых кофеен
  { habit: "chain-cappuccino", item: "cappuccino", nuance: "Пена плотная и не оседает, горчинка заметнее, чем в сетевом: мне понравилось." },
  { habit: "chain-cappuccino", item: "cappuccino", nuance: "Берите обычный размер: в большом стакане кофе только разбавляется." },
  { habit: "chain-cappuccino", item: "flat-white", nuance: "Если в сетевых кофе не хватает — берите флэт уайт, он заметно крепче." },
  { habit: "chain-cappuccino", item: "raf-pistachio", nuance: "Хотелось сладкого, как в сетях, но поинтереснее: фисташка чувствуется, приторности нет." },
  { habit: "chain-cappuccino", item: "cortado", nuance: "Молока и пены мало, зато кофе настоящий. Беру, когда есть пять минут." },

  // Чёрный без сахара
  { habit: "black", item: "americano", nuance: "Горечь мягкая, без пригара: сахар не нужен, лимон тоже." },
  { habit: "black", item: "espresso", nuance: "Крепкий, с кислинкой и золотистой кремой. Пейте сразу, пока не остыл." },
  { habit: "black", item: "cortado", nuance: "Нужен крепкий кофе без жжения во рту: пары ложек молока как раз хватает." },
  { habit: "black", item: "americano", nuance: "Попросите воду отдельно — так сами решите, насколько крепко." },

  // Чай
  { habit: "tea", item: "tea-black", nuance: "Заваривают в чайнике и не торопят: пил долго, горечи нет." },
  { habit: "tea", item: "tea-green", nuance: "Не вяжет и лёгкий. Я попросила без сахара, так вкуснее." },
  { habit: "tea", item: "tea-seabuckthorn", nuance: "Кисловатый. Если любите послаще — просите мёд отдельно." },
  { habit: "tea", item: "tea-ginger", nuance: "Согрел после улицы лучше любого кофе. Острый, для тех, кому нравится жгучее." },
  { habit: "tea", item: "mors-currant", nuance: "Горячего не хотелось — взяла холодный морс, тоже по-чайному." },

  // Сладкое с сиропом
  { habit: "sweet-syrup", item: "latte-salted-caramel", nuance: "Только попросите поменьше сиропа, иначе слишком сладко." },
  { habit: "sweet-syrup", item: "raf-lavender", nuance: "Лавандой пахнет сильнее, чем на вкус. Тем, кто не любит цветочное, не зайдёт." },
  { habit: "sweet-syrup", item: "raf-pistachio", nuance: "Сладкий, но не липкий: фисташка добавляет ореховости." },
  { habit: "sweet-syrup", item: "raf-classic", nuance: "Вкус как сливочная помадка. Если любите послаще — ваш выбор." },
  { habit: "sweet-syrup", item: "iced-latte", nuance: "Попросите карамельный сироп в холодный — получится десерт в стакане." },

  // Энергетики
  { habit: "energy", item: "iced-latte", nuance: "Холодный и бодрит. Сахара нет, так что без «сахарного удара»." },
  { habit: "energy", item: "espresso", nuance: "Один глоток — и вы в строю. Если ночь была короткой, просите двойной." },
  { habit: "energy", item: "flat-white", nuance: "Крепче латте и мягче эспрессо, хватает надолго." },
  { habit: "energy", item: "americano", nuance: "Большая чашка на час работы. Я беру без молока." },

  // Вообще не пью кофе
  { habit: "no-coffee", item: "tea-seabuckthorn", nuance: "Кисло-сладкий и горячий, пил вместо кофе и не скучал." },
  { habit: "no-coffee", item: "mors-cranberry", nuance: "Холодный и кислый, бодрит не хуже кофе. Сахара ровно столько, сколько нужно." },
  { habit: "no-coffee", item: "fresh-orange", nuance: "Дорогой, зато как порция витаминов. Хорошо с утра." },
  { habit: "no-coffee", item: "mors-currant", nuance: "Спокойный ягодный вкус, не кислый. Мой выбор, когда кофе не хочется." },
  { habit: "no-coffee", item: "fresh-carrot", nuance: "Необычно, но сладковатый вкус нравится даже детям." },
];
