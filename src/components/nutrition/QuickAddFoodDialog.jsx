import React, { useState, useEffect, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calculator, Search, Check } from "lucide-react";
import { FoodItem } from "@/api/entities";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import InlineError from "@/components/InlineError";
import LogoSpinner from "@/components/LogoSpinner";
import CategoryChips from "@/components/nutrition/CategoryChips";
import { foodName, kcalPer100g, matchesSearch, sortByName, countByCategory } from "@/lib/foods";
import { cn } from "@/lib/utils";

export default function QuickAddFoodDialog({ isOpen, onOpenChange, onSubmit, isLoading }) {
    const { t, i18n } = useTranslation();
    const lang = i18n.resolvedLanguage;
    const [foodItems, setFoodItems] = useState([]);
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("all");
    const [selectedFoodItemId, setSelectedFoodItemId] = useState("");
    const [gramsConsumed, setGramsConsumed] = useState("");
    const [calculatedMacros, setCalculatedMacros] = useState(null);
    const [libraryLoad, setLibraryLoad] = useState({ status: "loading", error: null });
    const [submitError, setSubmitError] = useState(null);

    const loadLibrary = async () => {
        setLibraryLoad({ status: "loading", error: null });
        const result = await FoodItem.list();
        if (result.ok) {
            setFoodItems(result.data);
            setLibraryLoad({ status: "ready", error: null });
        } else {
            setLibraryLoad({ status: "error", error: result.error });
        }
    };

    useEffect(() => {
        if (isOpen) loadLibrary();
    }, [isOpen]);

    const searched = useMemo(() => foodItems.filter((item) => matchesSearch(item, search)), [foodItems, search]);
    const visible = useMemo(() => sortByName(
        category === "all" ? searched : searched.filter((item) => item.category === category), lang,
    ), [searched, category, lang]);

    useEffect(() => {
        if (selectedFoodItemId && gramsConsumed > 0) {
            const selectedItem = foodItems.find(item => item.id === selectedFoodItemId);
            if (selectedItem) {
                const proteinGrams = (selectedItem.protein_per_100g / 100) * parseFloat(gramsConsumed);
                const carbsGrams   = (selectedItem.carbs_per_100g   / 100) * parseFloat(gramsConsumed);
                const fatGrams     = (selectedItem.fat_per_100g     / 100) * parseFloat(gramsConsumed);
                setCalculatedMacros({
                    protein_grams:    Math.round(proteinGrams * 10) / 10,
                    carbs_grams:      Math.round(carbsGrams   * 10) / 10,
                    fat_grams:        Math.round(fatGrams     * 10) / 10,
                    protein_portions: Math.round((proteinGrams / 30) * 10) / 10,
                    carbs_portions:   Math.round((carbsGrams   / 30) * 10) / 10,
                    fat_portions:     Math.round((fatGrams     / 10) * 10) / 10,
                });
            }
        } else {
            setCalculatedMacros(null);
        }
    }, [selectedFoodItemId, gramsConsumed, foodItems]);

    const handleSubmit = async () => {
        if (selectedFoodItemId && gramsConsumed > 0 && calculatedMacros) {
            const selectedItem = foodItems.find(item => item.id === selectedFoodItemId);
            setSubmitError(null);
            const result = await onSubmit({
                name: `${foodName(selectedItem, lang)} (${gramsConsumed}g)`,
                ...calculatedMacros,
            });
            // On failure the dialog stays open with the user's choice, and the error shows under the button.
            if (result.ok) resetForm();
            else setSubmitError(result.error);
        }
    };

    const resetForm = () => {
        setSelectedFoodItemId("");
        setSearch("");
        setCategory("all");
        setGramsConsumed("");
        setCalculatedMacros(null);
        setSubmitError(null);
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) resetForm(); onOpenChange(open); }}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl">{t("quick_title")}</DialogTitle>
                    <DialogDescription>{t("quick_desc")}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="foodItem" id="foodItem-label">{t("quick_select_label")}</Label>
                        {libraryLoad.status === "loading" ? (
                            <LogoSpinner size="sm" className="py-2 flex-row" />
                        ) : libraryLoad.status === "error" ? (
                            <InlineError error={libraryLoad.error} onRetry={loadLibrary} />
                        ) : foodItems.length === 0 ? (
                            <p className="text-sm text-gray-600">{t("quick_library_empty")}</p>
                        ) : (
                            <div className="space-y-3">
                                <div className="relative">
                                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
                                    <Input
                                        id="foodItem"
                                        type="search"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder={t("quick_search_placeholder")}
                                        className="ps-9 rounded-full"
                                        autoComplete="off"
                                    />
                                </div>
                                <CategoryChips value={category} onChange={setCategory} counts={countByCategory(searched)} total={searched.length} compact />
                                <ul role="listbox" aria-labelledby="foodItem-label" className="max-h-56 overflow-y-auto rounded-xl border border-gray-100 divide-y divide-gray-50">
                                    {visible.length === 0 ? (
                                        <li className="px-3 py-6 text-center text-sm text-gray-500">{t("library_no_matches")}</li>
                                    ) : visible.map((item) => {
                                        const selected = item.id === selectedFoodItemId;
                                        return (
                                            <li key={item.id} role="option" aria-selected={selected}>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedFoodItemId(item.id)}
                                                    className={cn(
                                                        "flex w-full items-center gap-2 px-3 py-2 text-start text-sm transition-colors",
                                                        selected ? "bg-gray-900 text-white" : "hover:bg-gray-50",
                                                    )}
                                                >
                                                    <span className="flex-1 truncate">{foodName(item, lang)}</span>
                                                    <span className={cn("text-xs", selected ? "text-white/70" : "text-gray-400")}>
                                                        {kcalPer100g(item)} {t("library_kcal")}
                                                    </span>
                                                    {selected && <Check className="h-4 w-4" aria-hidden="true" />}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="grams">{t("quick_grams_label")}</Label>
                        <Input
                            id="grams"
                            type="number"
                            placeholder="0"
                            value={gramsConsumed}
                            onChange={(e) => setGramsConsumed(e.target.value)}
                        />
                    </div>

                    {calculatedMacros && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-4 mt-2"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <Calculator className="w-5 h-5 text-gray-600" />
                                <span className="font-medium text-gray-700">{t("quick_summary")}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="text-center p-2 bg-emerald-100 rounded-xl">
                                    <div className="text-lg font-bold text-emerald-700">{calculatedMacros.protein_portions}</div>
                                    <div className="text-xs text-emerald-600">{t("quick_protein")}</div>
                                </div>
                                <div className="text-center p-2 bg-amber-100 rounded-xl">
                                    <div className="text-lg font-bold text-amber-700">{calculatedMacros.carbs_portions}</div>
                                    <div className="text-xs text-amber-600">{t("quick_carbs")}</div>
                                </div>
                                <div className="text-center p-2 bg-orange-100 rounded-xl">
                                    <div className="text-lg font-bold text-orange-700">{calculatedMacros.fat_portions}</div>
                                    <div className="text-xs text-orange-600">{t("quick_fat")}</div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
                <DialogFooter className="flex-col sm:flex-col">
                    <Button onClick={handleSubmit} disabled={isLoading || !calculatedMacros} className="w-full">
                        {isLoading && <LogoSpinner size="sm" inline className="me-2" />}
                        {isLoading ? t("quick_submitting") : t("quick_submit")}
                    </Button>
                    <InlineError error={submitError} />
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
