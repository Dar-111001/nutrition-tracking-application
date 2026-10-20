// Daily goals. The goal is calories; protein, carbs and fat (in portions) are
// only a suggested split. A macro set to 0 means "suggest one for me", worked
// out from the calorie goal.
import { KCAL_PER_GRAM, PORTION_GRAMS } from "@/lib/foods";

export const DEFAULT_CALORIE_GOAL = 2000;

// The share of calories each macro gets in the automatic suggestion
// (inside the usual healthy ranges: protein 10-35%, carbs 45-65%, fat 20-35%).
const SUGGESTED_SPLIT = { protein: 0.25, carbs: 0.45, fat: 0.3 };

// A day is on target when its calories land within 10% of the goal
export const CALORIE_TOLERANCE = 0.1;

const round1 = (n) => Math.round(n * 10) / 10;

// { protein: 4.2, carbs: 7.5, fat: 6.7 } portions for 2000 kcal
export function suggestedPortions(calorieGoal) {
    return Object.fromEntries(Object.entries(SUGGESTED_SPLIT).map(([macro, share]) => [
        macro, round1((calorieGoal * share) / KCAL_PER_GRAM[macro] / PORTION_GRAMS[macro]),
    ]));
}

// The goals from the API (or null before any are saved), with every gap filled:
// { calories, macros: { protein: { portions, custom }, ... } }
export function resolveGoals(goals) {
    const calories = goals?.calorie_goal || DEFAULT_CALORIE_GOAL;
    const suggested = suggestedPortions(calories);
    const macros = {};
    for (const macro of Object.keys(SUGGESTED_SPLIT)) {
        const own = goals?.[`${macro}_goal`] || 0;
        macros[macro] = own > 0 ? { portions: own, custom: true } : { portions: suggested[macro], custom: false };
    }
    return { calories, macros };
}

// "on" (within 10% of the goal), "under", "over", or "empty" when nothing was logged
export function calorieStatus(eatenKcal, calorieGoal, foodCount) {
    if (!foodCount) return "empty";
    if (eatenKcal < calorieGoal * (1 - CALORIE_TOLERANCE)) return "under";
    if (eatenKcal > calorieGoal * (1 + CALORIE_TOLERANCE)) return "over";
    return "on";
}

// Totals of a list of logged foods: { kcal, protein, carbs, fat } (macros in portions)
export function dayTotals(foods) {
    return (foods || []).reduce((totals, food) => ({
        kcal: totals.kcal + (food.kcal || 0),
        protein: totals.protein + (food.protein_portions || 0),
        carbs: totals.carbs + (food.carbs_portions || 0),
        fat: totals.fat + (food.fat_portions || 0),
    }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
}
