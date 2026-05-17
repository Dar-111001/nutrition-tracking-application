import React, { useState, useEffect } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator } from "lucide-react";
import { FoodItem } from "@/api/entities";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function QuickAddFoodDialog({ isOpen, onOpenChange, onSubmit, isLoading }) {
    const { t } = useTranslation();
    const [foodItems, setFoodItems] = useState([]);
    const [selectedFoodItemId, setSelectedFoodItemId] = useState("");
    const [gramsConsumed, setGramsConsumed] = useState("");
    const [calculatedMacros, setCalculatedMacros] = useState(null);

    useEffect(() => {
        if (isOpen) {
            FoodItem.list().then(setFoodItems);
        }
    }, [isOpen]);

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
            await onSubmit({
                name: `${selectedItem.name} (${gramsConsumed}g)`,
                ...calculatedMacros,
                date: new Date().toISOString().split('T')[0],
            });
            resetForm();
        }
    };

    const resetForm = () => {
        setSelectedFoodItemId("");
        setGramsConsumed("");
        setCalculatedMacros(null);
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) resetForm(); onOpenChange(open); }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-xl">{t("quick_title")}</DialogTitle>
                    <DialogDescription>{t("quick_desc")}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="foodItem">{t("quick_select_label")}</Label>
                        <Select value={selectedFoodItemId} onValueChange={setSelectedFoodItemId}>
                            <SelectTrigger id="foodItem">
                                <SelectValue placeholder={t("quick_select_placeholder")} />
                            </SelectTrigger>
                            <SelectContent>
                                {foodItems.map(item => (
                                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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
                <DialogFooter>
                    <Button onClick={handleSubmit} disabled={isLoading || !calculatedMacros} className="w-full">
                        {isLoading ? t("quick_submitting") : t("quick_submit")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
