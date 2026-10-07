import React from "react";
import { Drumstick, Egg, Wheat, Bean, Carrot, Apple, Nut, Droplet, Cookie, CupSoda, Utensils, LayoutGrid } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CATEGORIES } from "@/lib/foods";
import { cn } from "@/lib/utils";

export const CATEGORY_ICONS = {
    protein: Drumstick,
    dairy_eggs: Egg,
    grains: Wheat,
    legumes: Bean,
    vegetables: Carrot,
    fruit: Apple,
    nuts_seeds: Nut,
    fats_oils: Droplet,
    snacks_sweets: Cookie,
    drinks: CupSoda,
    other: Utensils,
};

/**
 * A row of filter chips: "All" plus every category that has foods.
 * value is a category key or "all"; counts is { category: number }.
 */
export default function CategoryChips({ value, onChange, counts, total, compact = false }) {
    const { t } = useTranslation();
    const chips = [
        { key: "all", Icon: LayoutGrid, count: total },
        ...CATEGORIES.filter((c) => counts[c] > 0).map((c) => ({ key: c, Icon: CATEGORY_ICONS[c], count: counts[c] })),
    ];

    return (
        <div
            role="tablist"
            aria-label={t("library_categories")}
            className={cn("flex gap-2", compact ? "overflow-x-auto pb-1 -mx-1 px-1" : "flex-wrap")}
        >
            {chips.map(({ key, Icon, count }) => {
                const active = value === key;
                return (
                    <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(key)}
                        className={cn(
                            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all",
                            active
                                ? "border-transparent bg-gray-900 text-white shadow-md"
                                : "border-gray-200 bg-white/80 text-gray-700 hover:border-gray-300 hover:bg-white",
                        )}
                    >
                        <Icon className="h-4 w-4" />
                        <span>{key === "all" ? t("library_category_all") : t(`category_${key}`)}</span>
                        <span className={cn("text-xs", active ? "text-white/70" : "text-gray-400")}>{count}</span>
                    </button>
                );
            })}
        </div>
    );
}
