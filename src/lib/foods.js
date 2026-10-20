// Food library helpers shared by the Food Library page and Quick Add.
// A food from the API looks like:
//   { id, name, names: { en, es, he }, category, builtin, protein_per_100g, carbs_per_100g, fat_per_100g,
//     alcohol_per_100g, kcal_per_100g, serving: { unit: "shot", grams: 40 } | null }
// `name` is the fallback for a language that has no name of its own. Values are
// always per 100 g; `serving` only says how much a typical shot or glass weighs.

// Same keys and order as CATEGORIES in api/src/routes/foodItems.js
export const CATEGORIES = [
    "protein", "dairy_eggs", "grains", "legumes", "vegetables",
    "fruit", "nuts_seeds", "fats_oils", "snacks_sweets", "drinks", "alcohol", "other",
];

// The languages a food can be named in. Labels are written in their own language.
export const NAME_LANGUAGES = [
    { code: "en", label: "English", dir: "ltr" },
    { code: "es", label: "Español", dir: "ltr" },
    { code: "he", label: "עברית", dir: "rtl" },
];

export const foodName = (item, lang) => item.names?.[lang] || item.name;

// Energy per gram, as in api/src/lib/energy.js. Alcohol has no protein, carbs
// or fat but still counts: 7 kcal per gram.
export const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9, alcohol: 7 };

// kcal({ protein: 12, carbs: 1, fat: 10 }) -> 142. Missing values count as 0.
export const kcal = (grams) => Math.round(
    Object.entries(KCAL_PER_GRAM).reduce((sum, [macro, perGram]) => sum + (Number(grams[macro]) || 0) * perGram, 0),
);

// The API sends kcal_per_100g; a form being filled in works it out itself
export const kcalPer100g = (item) => item.kcal_per_100g ?? kcal({
    protein: item.protein_per_100g, carbs: item.carbs_per_100g, fat: item.fat_per_100g, alcohol: item.alcohol_per_100g,
});

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

// One macro portion = 30 g protein, 30 g carbs or 10 g fat (same as
// PORTION_GRAMS in api/src/lib/energy.js; the API stores the real numbers).
export const PORTION_GRAMS = { protein: 30, carbs: 30, fat: 10 };
const round1 = (n) => Math.round(n * 10) / 10;

// Grams, portions and calories eaten, from values per 100 g and the amount eaten.
// macrosForAmount({ protein_per_100g: 12.6, carbs_per_100g: 1.1, fat_per_100g: 10.6 }, 150)
//   -> { protein_grams: 18.9, ..., fat_grams: 15.9, fat_portions: 1.6, alcohol_grams: 0, kcal: 230 }
export function macrosForAmount(per100g, grams) {
    const out = {};
    for (const [macro, size] of Object.entries(PORTION_GRAMS)) {
        const eaten = ((Number(per100g[`${macro}_per_100g`]) || 0) / 100) * grams;
        out[`${macro}_grams`] = round1(eaten);
        out[`${macro}_portions`] = round1(eaten / size);
    }
    out.alcohol_grams = round1(((Number(per100g.alcohol_per_100g) || 0) / 100) * grams);
    out.kcal = kcal({ protein: out.protein_grams, carbs: out.carbs_grams, fat: out.fat_grams, alcohol: out.alcohol_grams });
    return out;
}
