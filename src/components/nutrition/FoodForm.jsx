import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Calculator, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { searchFood } from "@/api/entities";
import { useTranslation } from "react-i18next";
import InlineError from "@/components/InlineError";
import LogoSpinner from "@/components/LogoSpinner";

export default function FoodForm({ onSubmit, isLoading }) {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({ name: "", protein_grams: "", carbs_grams: "", fat_grams: "" });
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [searchError, setSearchError] = useState(null);
    const [searchNotFound, setSearchNotFound] = useState(false);
    const [submitError, setSubmitError] = useState(null);

    const calculatePortions = (proteinGrams, carbsGrams, fatGrams) => ({
        protein_portions: Math.round((proteinGrams / 30) * 10) / 10,
        carbs_portions:   Math.round((carbsGrams   / 30) * 10) / 10,
        fat_portions:     Math.round((fatGrams      / 10) * 10) / 10,
    });

    const handleAutoSearch = async () => {
        if (!formData.name.trim()) {
            setSearchError(t("form_alert_no_name"));
            return;
        }
        setIsSearching(true);
        setSearchResults([]);
        setSearchError(null);
        setSearchNotFound(false);
        const result = await searchFood(formData.name.trim());
        setIsSearching(false);
        if (!result.ok) {
            setSearchError(result.error);
        } else if (result.data.length === 0) {
            setSearchNotFound(true);
        } else {
            setSearchResults(result.data);
        }
    };

    const selectResult = (result) => {
        setFormData({
            ...formData,
            protein_grams: result.protein_per_100g.toString(),
            carbs_grams:   result.carbs_per_100g.toString(),
            fat_grams:     result.fat_per_100g.toString(),
        });
        setSearchResults([]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim() || formData.protein_grams === "" || formData.carbs_grams === "" || formData.fat_grams === "") {
            setSubmitError(t("form_fields_required"));
            return;
        }
        setSubmitError(null);

        const proteinGrams = parseFloat(formData.protein_grams) || 0;
        const carbsGrams   = parseFloat(formData.carbs_grams)   || 0;
        const fatGrams     = parseFloat(formData.fat_grams)      || 0;
        const portions     = calculatePortions(proteinGrams, carbsGrams, fatGrams);

        const result = await onSubmit({
            name: formData.name.trim(),
            protein_grams: proteinGrams,
            carbs_grams:   carbsGrams,
            fat_grams:     fatGrams,
            ...portions,
        });

        // Keep what the user typed if saving failed, so they can retry.
        if (!result.ok) {
            setSubmitError(result.error);
            return;
        }
        setFormData({ name: "", protein_grams: "", carbs_grams: "", fat_grams: "" });
        setSearchResults([]);
        setSearchNotFound(false);
    };

    const currentPortions = calculatePortions(
        parseFloat(formData.protein_grams) || 0,
        parseFloat(formData.carbs_grams)   || 0,
        parseFloat(formData.fat_grams)     || 0,
    );

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <Card className="backdrop-blur-sm bg-white/90 border-0 shadow-xl rounded-3xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white pb-8">
                    <CardTitle className="text-2xl font-light flex items-center gap-3">
                        <Plus className="w-6 h-6" />
                        {t("form_title")}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-lg font-medium text-gray-700">
                                {t("form_name_label")}
                            </Label>
                            <div className="flex gap-3">
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => {
                                        setFormData({ ...formData, name: e.target.value });
                                        setSearchResults([]);
                                        setSearchError(null);
                                        setSearchNotFound(false);
                                    }}
                                    placeholder={t("form_name_placeholder")}
                                    className="h-12 text-lg border-2 border-gray-200 focus:border-emerald-400 rounded-xl flex-1"
                                />
                                <Button
                                    type="button"
                                    onClick={handleAutoSearch}
                                    disabled={isSearching || !formData.name.trim()}
                                    className="h-12 px-6 bg-blue-500 hover:bg-blue-600 text-white rounded-xl"
                                >
                                    {isSearching
                                        ? <LogoSpinner size="sm" inline />
                                        : <Search className="w-5 h-5" />}
                                    <span className="ms-2">
                                        {isSearching ? t("form_searching") : t("form_auto_search")}
                                    </span>
                                </Button>
                            </div>
                            <InlineError error={searchError} onRetry={typeof searchError === "string" ? undefined : handleAutoSearch} />
                            {searchNotFound && <p className="text-sm text-gray-600">{t("form_alert_not_found")}</p>}
                            <p className="text-sm text-gray-500">{t("form_name_hint")}</p>

                            {/* Search results picker */}
                            <AnimatePresence>
                                {searchResults.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        className="rounded-xl border border-blue-200 bg-white shadow-lg overflow-hidden"
                                    >
                                        <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 text-sm font-medium text-blue-700">
                                            {t("form_select_result")}
                                        </div>
                                        {searchResults.map((result, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => selectResult(result)}
                                                className="w-full text-start px-4 py-3 hover:bg-blue-50 transition-colors border-b last:border-b-0 flex items-center justify-between gap-4"
                                            >
                                                <span className="font-medium text-gray-800 truncate">{result.name}</span>
                                                <span className="text-xs text-gray-500 whitespace-nowrap shrink-0">
                                                    P {result.protein_per_100g}g · C {result.carbs_per_100g}g · F {result.fat_per_100g}g
                                                </span>
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { id: "protein", label: t("form_protein"), field: "protein_grams", border: "border-emerald-200 focus:border-emerald-400" },
                                { id: "carbs",   label: t("form_carbs"),   field: "carbs_grams",   border: "border-amber-200 focus:border-amber-400" },
                                { id: "fat",     label: t("form_fat"),     field: "fat_grams",     border: "border-orange-200 focus:border-orange-400" },
                            ].map(({ id, label, field, border }) => (
                                <div key={id} className="space-y-2">
                                    <Label htmlFor={id} className="text-lg font-medium text-gray-700">{label}</Label>
                                    <Input
                                        id={id}
                                        type="number"
                                        step="0.1"
                                        value={formData[field]}
                                        onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                                        placeholder="0"
                                        className={`h-12 text-lg border-2 ${border} rounded-xl text-center`}
                                    />
                                </div>
                            ))}
                        </div>

                        {(currentPortions.protein_portions > 0 || currentPortions.carbs_portions > 0 || currentPortions.fat_portions > 0) && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6"
                            >
                                <div className="flex items-center gap-2 mb-4">
                                    <Calculator className="w-5 h-5 text-gray-600" />
                                    <span className="font-medium text-gray-700">{t("form_portions_calc")}</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="text-center p-4 bg-emerald-100 rounded-xl">
                                        <div className="text-2xl font-bold text-emerald-700">{currentPortions.protein_portions}</div>
                                        <div className="text-sm text-emerald-600">{t("form_protein_portions")}</div>
                                    </div>
                                    <div className="text-center p-4 bg-amber-100 rounded-xl">
                                        <div className="text-2xl font-bold text-amber-700">{currentPortions.carbs_portions}</div>
                                        <div className="text-sm text-amber-600">{t("form_carbs_portions")}</div>
                                    </div>
                                    <div className="text-center p-4 bg-orange-100 rounded-xl">
                                        <div className="text-2xl font-bold text-orange-700">{currentPortions.fat_portions}</div>
                                        <div className="text-sm text-orange-600">{t("form_fat_portions")}</div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-14 text-lg font-medium bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl transition-all duration-300 transform hover:scale-[1.02]"
                        >
                            {isLoading && <LogoSpinner size="sm" inline className="me-2" />}
                            {isLoading ? t("form_submitting") : t("form_submit")}
                        </Button>
                        <InlineError error={submitError} />
                    </form>
                </CardContent>
            </Card>
        </motion.div>
    );
}
