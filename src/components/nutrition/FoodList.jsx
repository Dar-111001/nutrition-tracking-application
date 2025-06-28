import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Utensils, RotateCcw, PlusCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import QuickAddFoodDialog from "./QuickAddFoodDialog";

export default function FoodList({ foods, onDeleteFood, onClearAll, onAddFood, isLoading }) {
    const [showQuickAddDialog, setShowQuickAddDialog] = useState(false);

    if (!foods || foods.length === 0) {
        return (
            <>
                <Card className="backdrop-blur-sm bg-white/90 border-0 shadow-xl rounded-3xl overflow-hidden mb-12">
                    <CardHeader className="bg-gradient-to-r from-gray-400 to-gray-500 text-white pb-8">
                        <CardTitle className="text-2xl font-light flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                <Utensils className="w-6 h-6" />
                                הארוחות שלי היום
                            </div>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setShowQuickAddDialog(true)}
                                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                            >
                                <PlusCircle className="w-4 h-4 mr-2" />
                                הוספה מהירה
                            </Button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8">
                        <div className="text-center py-12">
                            <Utensils className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                            <p className="text-xl text-gray-500">עדיין לא הוספת ארוחות היום</p>
                            <p className="text-gray-400 mt-2">התחל בהוספת המזון הראשון שלך!</p>
                        </div>
                    </CardContent>
                </Card>
                 <QuickAddFoodDialog 
                    isOpen={showQuickAddDialog} 
                    onOpenChange={setShowQuickAddDialog} 
                    onSubmit={onAddFood}
                    isLoading={isLoading}
                />
            </>
        );
    }

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-12"
            >
                <Card className="backdrop-blur-sm bg-white/90 border-0 shadow-xl rounded-3xl overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white pb-8">
                        <CardTitle className="text-2xl font-light flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Utensils className="w-6 h-6" />
                                הארוחות שלי היום
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setShowQuickAddDialog(true)}
                                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                                >
                                    <PlusCircle className="w-4 h-4 mr-2" />
                                    הוספה מהירה
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={onClearAll}
                                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                                >
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    אפס יום
                                </Button>
                            </div>
                        </CardTitle>
                    </CardHeader>
                <CardContent className="p-8">
                    <div className="space-y-4">
                        <AnimatePresence>
                            {foods.map((food, index) => (
                                <motion.div
                                    key={food.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="bg-gradient-to-r from-gray-50 to-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all duration-300"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <h3 className="text-xl font-semibold text-gray-800" dir="rtl">
                                            {food.name}
                                        </h3>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onDeleteFood(food.id)}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                                        <div className="text-center p-3 bg-emerald-50 rounded-xl">
                                            <div className="text-sm text-emerald-600 mb-1">חלבון</div>
                                            <div className="text-lg font-bold text-emerald-700">
                                                {food.protein_grams}g
                                            </div>
                                        </div>
                                        <div className="text-center p-3 bg-amber-50 rounded-xl">
                                            <div className="text-sm text-amber-600 mb-1">פחמימה</div>
                                            <div className="text-lg font-bold text-amber-700">
                                                {food.carbs_grams}g
                                            </div>
                                        </div>
                                        <div className="text-center p-3 bg-orange-50 rounded-xl">
                                            <div className="text-sm text-orange-600 mb-1">שומן</div>
                                            <div className="text-lg font-bold text-orange-700">
                                                {food.fat_grams}g
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-3">
                                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 px-3 py-1">
                                            {food.protein_portions} מנות חלבון
                                        </Badge>
                                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 px-3 py-1">
                                            {food.carbs_portions} מנות פחמימה
                                        </Badge>
                                        <Badge className="bg-orange-100 text-orange-700 border-orange-200 px-3 py-1">
                                            {food.fat_portions} מנות שומן
                                        </Badge>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </CardContent>
                </Card>
            </motion.div>
            <QuickAddFoodDialog 
                isOpen={showQuickAddDialog} 
                onOpenChange={setShowQuickAddDialog} 
                onSubmit={onAddFood}
                isLoading={isLoading}
            />
        </>
    );
}