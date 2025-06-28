import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Calculator } from "lucide-react";
import { motion } from "framer-motion";

export default function FoodForm({ onSubmit, isLoading }) {
    const [formData, setFormData] = useState({
        name: "",
        protein_grams: "",
        carbs_grams: "",
        fat_grams: ""
    });

    const calculatePortions = (proteinGrams, carbsGrams, fatGrams) => {
        return {
            protein_portions: Math.round((proteinGrams / 30) * 10) / 10,
            carbs_portions: Math.round((carbsGrams / 30) * 10) / 10,
            fat_portions: Math.round((fatGrams / 10) * 10) / 10
        };
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name || formData.protein_grams === "" || formData.carbs_grams === "" || formData.fat_grams === "") {
            return;
        }

        const proteinGrams = parseFloat(formData.protein_grams) || 0;
        const carbsGrams = parseFloat(formData.carbs_grams) || 0;
        const fatGrams = parseFloat(formData.fat_grams) || 0;
        
        const portions = calculatePortions(proteinGrams, carbsGrams, fatGrams);
        
        onSubmit({
            ...formData,
            protein_grams: proteinGrams,
            carbs_grams: carbsGrams,
            fat_grams: fatGrams,
            ...portions,
            date: new Date().toISOString().split('T')[0]
        });

        setFormData({
            name: "",
            protein_grams: "",
            carbs_grams: "",
            fat_grams: ""
        });
    };

    const currentPortions = calculatePortions(
        parseFloat(formData.protein_grams) || 0,
        parseFloat(formData.carbs_grams) || 0,
        parseFloat(formData.fat_grams) || 0
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
        >
            <Card className="backdrop-blur-sm bg-white/90 border-0 shadow-xl rounded-3xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white pb-8">
                    <CardTitle className="text-2xl font-light flex items-center gap-3">
                        <Plus className="w-6 h-6" />
                        הוספת מזון חדש
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-lg font-medium text-gray-700">
                                שם המזון
                            </Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                placeholder="לדוגמה: חזה עוף מבושל"
                                className="h-12 text-lg border-2 border-gray-200 focus:border-emerald-400 rounded-xl"
                                dir="rtl"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="protein" className="text-lg font-medium text-emerald-700">
                                    חלבון (גרם)
                                </Label>
                                <Input
                                    id="protein"
                                    type="number"
                                    step="0.1"
                                    value={formData.protein_grams}
                                    onChange={(e) => setFormData({...formData, protein_grams: e.target.value})}
                                    placeholder="0"
                                    className="h-12 text-lg border-2 border-emerald-200 focus:border-emerald-400 rounded-xl text-center"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="carbs" className="text-lg font-medium text-amber-700">
                                    פחמימה (גרם)
                                </Label>
                                <Input
                                    id="carbs"
                                    type="number"
                                    step="0.1"
                                    value={formData.carbs_grams}
                                    onChange={(e) => setFormData({...formData, carbs_grams: e.target.value})}
                                    placeholder="0"
                                    className="h-12 text-lg border-2 border-amber-200 focus:border-amber-400 rounded-xl text-center"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="fat" className="text-lg font-medium text-orange-700">
                                    שומן (גרם)
                                </Label>
                                <Input
                                    id="fat"
                                    type="number"
                                    step="0.1"
                                    value={formData.fat_grams}
                                    onChange={(e) => setFormData({...formData, fat_grams: e.target.value})}
                                    placeholder="0"
                                    className="h-12 text-lg border-2 border-orange-200 focus:border-orange-400 rounded-xl text-center"
                                />
                            </div>
                        </div>

                        {(currentPortions.protein_portions > 0 || currentPortions.carbs_portions > 0 || currentPortions.fat_portions > 0) && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6"
                            >
                                <div className="flex items-center gap-2 mb-4">
                                    <Calculator className="w-5 h-5 text-gray-600" />
                                    <span className="font-medium text-gray-700">חישוב מנות:</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="text-center p-4 bg-emerald-100 rounded-xl">
                                        <div className="text-2xl font-bold text-emerald-700">
                                            {currentPortions.protein_portions}
                                        </div>
                                        <div className="text-sm text-emerald-600">מנות חלבון</div>
                                    </div>
                                    <div className="text-center p-4 bg-amber-100 rounded-xl">
                                        <div className="text-2xl font-bold text-amber-700">
                                            {currentPortions.carbs_portions}
                                        </div>
                                        <div className="text-sm text-amber-600">מנות פחמימה</div>
                                    </div>
                                    <div className="text-center p-4 bg-orange-100 rounded-xl">
                                        <div className="text-2xl font-bold text-orange-700">
                                            {currentPortions.fat_portions}
                                        </div>
                                        <div className="text-sm text-orange-600">מנות שומן</div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        <Button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full h-14 text-lg font-medium bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl transition-all duration-300 transform hover:scale-[1.02]"
                        >
                            {isLoading ? "מוסיף..." : "הוסף לרשימה"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </motion.div>
    );
}