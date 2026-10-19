// Food library helpers shared by the Food Library page and Quick Add.
// A food from the API looks like:
//   { id, name, names: { en, es, he }, category, builtin, protein_per_100g, carbs_per_100g, fat_per_100g }
// `name` is the fallback for a language that has no name of its own.

// Same keys and order as CATEGORIES in api/src/routes/foodItems.js
export const CATEGORIES = [
    "protein", "dairy_eggs", "grains", "legumes", "vegetables",
    "fruit", "nuts_seeds", "fats_oils", "snacks_sweets", "drinks", "other",
];

// The languages a food can be named in. Labels are written in their own language.
export const NAME_LANGUAGES = [
    { code: "en", label: "English", dir: "ltr" },
    { code: "es", label: "Español", dir: "ltr" },
    { code: "he", label: "עברית", dir: "rtl" },
];

export const foodName = (item, lang) => item.names?.[lang] || item.name;

// Energy from the macros (4 kcal per g of protein or carbs, 9 per g of fat)
export const kcalPer100g = (item) =>
    Math.round(item.protein_per_100g * 4 + item.carbs_per_100g * 4 + item.fat_per_100g * 9);

// Lowercase and drop accents and Hebrew vowel marks, so "brocoli" finds "Brócoli"
const normalize = (text) => (text || "").normalize("NFD").replace(/[̀-֑ͯ-ׇ]/g, "").toLowerCase().trim();

// A search matches a food's name in any language, so typing English while the
// app is in Hebrew still finds it.
export function matchesSearch(item, query) {
    const q = normalize(query);
    if (!q) return true;
    return [item.name, ...Object.values(item.names || {})].some((name) => normalize(name).includes(q));
}

export function sortByName(items, lang) {
    const collator = new Intl.Collator(lang, { sensitivity: "base", numeric: true });
    return [...items].sort((a, b) => collator.compare(foodName(a, lang), foodName(b, lang)));
}

// { protein: 10, fruit: 4, ... } for the category chips
export function countByCategory(items) {
    const counts = {};
    for (const item of items) counts[item.category] = (counts[item.category] || 0) + 1;
    return counts;
}

// [{ category, items }] in menu order, leaving out empty categories
export function groupByCategory(items) {
    return CATEGORIES
        .map((category) => ({ category, items: items.filter((item) => item.category === category) }))
        .filter((group) => group.items.length > 0);
}
