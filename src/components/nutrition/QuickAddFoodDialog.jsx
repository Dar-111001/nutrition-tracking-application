import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator } from "lucide-react";
import { FoodItem } from "@/api/entities";
import { motion } from "framer-motion";

export default function QuickAddFoodDialog({ isOpen, onOpenChange, onSubmit, isLoading }) {
    const [foodItems, setFoodItems] = useState([]);
    const [selectedFoodItemId, setSelectedFoodItemId] = useState("");
    const [gramsConsumed, setGramsConsumed] = useState("");
    const [calculatedMacros, setCalculatedMacros] = useState(null);

    useEffect(() => {
        if (isOpen) {
            const loadFoodItems = async () => {
                const items = await FoodItem.list();
                setFoodItems(items);
            };
            loadFoodItems();
        }
    }, [isOpen]);

    useEffect(() => {
        if (selectedFoodItemId && gramsConsumed > 0) {
            const selectedItem = foodItems.find(item => item.id === selectedFoodItemId);
            if (selectedItem) {
                const proteinGrams = (selectedItem.protein_per_100g / 100) * parseFloat(gramsConsumed);
                const carbsGrams = (selectedItem.carbs_per_100g / 100) * parseFloat(gramsConsumed);
                const fatGrams = (selectedItem.fat_per_100g / 100) * parseFloat(gramsConsumed);

                const proteinPortions = Math.round((proteinGrams / 30) * 10) / 10;
                const carbsPortions = Math.round((carbsGrams / 30) * 10) / 10;
                const fatPortions = Math.round((fatGrams / 10) * 10) / 10;

                setCalculatedMacros({
                    protein_grams: Math.round(proteinGrams * 10) / 10,
                    carbs_grams: Math.round(carbsGrams * 10) / 10,
                    fat_grams: Math.round(fatGrams * 10) / 10,
                    protein_portions: proteinPortions,
                    carbs_portions: carbsPortions,
                    fat_portions: fatPortions
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
                date: new Date().toISOString().split('T')[0]
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
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) resetForm();
            onOpenChange(open);
        }}>
            <DialogContent className="sm:max-w-md" dir="rtl">
                <DialogHeader>
                    <DialogTitle className="text-xl">הוספה מהירה מהספרייה</DialogTitle>
                    <DialogDescription>בחר פריט מהספרייה, הזן משקל, והארוחה תתווסף ליומן.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="foodItem">בחר מזון</Label>
                        <Select value={selectedFoodItemId} onValueChange={setSelectedFoodItemId}>
                            <SelectTrigger id="foodItem">
                                <SelectValue placeholder="בחר מתוך ספריית המזון שלך..." />
                            </SelectTrigger>
                            <SelectContent>
                                {foodItems.map(item => (
                                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="grams">כמות (גרם)</Label>
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
                                <span className="font-medium text-gray-700">סיכום מנות:</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="text-center p-2 bg-emerald-100 rounded-xl">
                                    <div className="text-lg font-bold text-emerald-700">{calculatedMacros.protein_portions}</div>
                                    <div className="text-xs text-emerald-600">חלבון</div>
                                </div>
                                <div className="text-center p-2 bg-amber-100 rounded-xl">
                                    <div className="text-lg font-bold text-amber-700">{calculatedMacros.carbs_portions}</div>
                                    <div className="text-xs text-amber-600">פחמימה</div>
                                </div>
                                <div className="text-center p-2 bg-orange-100 rounded-xl">
                                    <div className="text-lg font-bold text-orange-700">{calculatedMacros.fat_portions}</div>
                                    <div className="text-xs text-orange-600">שומן</div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
                <DialogFooter>
                    <Button 
                        onClick={handleSubmit} 
                        disabled={isLoading || !calculatedMacros}
                        className="w-full"
                    >
                        {isLoading ? "מוסיף..." : "הוסף ליומן"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}