// Calories and portions, in one place so every route counts the same way.

// Energy per gram (the standard Atwater factors). Alcohol has no protein,
// carbs or fat but still counts: 7 kcal per gram.
export const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9, alcohol: 7 };

// One macro portion = 30 g protein, 30 g carbs or 10 g fat.
export const PORTION_GRAMS = { protein: 30, carbs: 30, fat: 10 };

// kcal({ protein: 12, carbs: 1, fat: 10 }) -> 142. Missing values count as 0.
export const kcal = (grams) => Math.round(
  Object.entries(KCAL_PER_GRAM).reduce((sum, [macro, perGram]) => sum + (Number(grams[macro]) || 0) * perGram, 0),
);

// The calories a set of macro portions adds up to (for goals saved before
// the app had a calorie goal).
export const kcalFromPortions = (portions) => kcal(Object.fromEntries(
  Object.entries(PORTION_GRAMS).map(([macro, size]) => [macro, (Number(portions[macro]) || 0) * size]),
));
