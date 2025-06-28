
import React, { useState, useEffect } from "react";
import { Food, DailyGoals } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Settings, Info } from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import FoodForm from "../components/nutrition/FoodForm";
import DailyProgress from "../components/nutrition/DailyProgress";
import FoodList from "../components/nutrition/FoodList";

export default function Home() {
    const [foods, setFoods] = useState([]);
    const [todayFoods, setTodayFoods] = useState([]);
    const [goals, setGoals] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showGoalsDialog, setShowGoalsDialog] = useState(false);
    const [tempGoals, setTempGoals] = useState({ protein_goal: 6, carbs_goal: 6.5, fat_goal: 2 });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const allFoods = await Food.list("-created_date");
            setFoods(allFoods);
            
            const today = new Date().toISOString().split('T')[0];
            const todaysFoods = allFoods.filter(food => food.date === today);
            setTodayFoods(todaysFoods);

            const goalsData = await DailyGoals.list();
            if (goalsData && goalsData.length > 0) {
                setGoals(goalsData[0]);
                setTempGoals(goalsData[0]);
            }
        } catch (error) {
            console.error("Error loading data:", error);
        }
    };

    const handleAddFood = async (foodData) => {
        setIsLoading(true);
        try {
            await Food.create(foodData);
            await loadData();
        } catch (error) {
            console.error("Error adding food:", error);
        } finally { // Ensure isLoading is set to false regardless of success or failure
            setIsLoading(false);
        }
    };

    const handleDeleteFood = async (foodId) => {
        try {
            await Food.delete(foodId);
            await loadData();
        } catch (error) {
            console.error("Error deleting food:", error);
        }
    };

    const handleClearAll = async () => {
        if (confirm("האם אתה בטוח שברצונך למחוק את כל הארוחות של היום?")) {
            try {
                for (const food of todayFoods) {
                    await Food.delete(food.id);
                }
                await loadData();
            } catch (error) {
                console.error("Error clearing foods:", error);
            }
        }
    };

    const handleSaveGoals = async () => {
        try {
            if (goals) {
                await DailyGoals.update(goals.id, tempGoals);
            } else {
                await DailyGoals.create(tempGoals);
            }
            await loadData();
            setShowGoalsDialog(false);
        } catch (error) {
            console.error("Error saving goals:", error);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-8" dir="rtl">
            <div className="max-w-6xl mx-auto">
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-4xl md:text-6xl font-light text-gray-800 mb-4">
                        מעקב תזונה
                        <span className="block text-2xl md:text-3xl text-gray-500 font-normal mt-2">
                            חיפוש אוטומטי לערכים תזונתיים עם AI | בשיטת מנות מאקרו
                        </span>
                    </h1>
                    
                    <div className="flex justify-center gap-4 mt-8">
                        <Dialog open={showGoalsDialog} onOpenChange={setShowGoalsDialog}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="rounded-2xl border-2 hover:bg-gray-50">
                                    <Settings className="w-4 h-4 mr-2" />
                                    הגדרת יעדים
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md" dir="rtl">
                                <DialogHeader>
                                    <DialogTitle>הגדרת יעדים יומיים</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="protein_goal">מנות חלבון</Label>
                                        <Input
                                            id="protein_goal"
                                            type="number"
                                            step="0.1"
                                            value={tempGoals.protein_goal}
                                            onChange={(e) => setTempGoals({...tempGoals, protein_goal: parseFloat(e.target.value)})}
                                            className="text-center"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="carbs_goal">מנות פחמימה</Label>
                                        <Input
                                            id="carbs_goal"
                                            type="number"
                                            step="0.1"
                                            value={tempGoals.carbs_goal}
                                            onChange={(e) => setTempGoals({...tempGoals, carbs_goal: parseFloat(e.target.value)})}
                                            className="text-center"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="fat_goal">מנות שומן</Label>
                                        <Input
                                            id="fat_goal"
                                            type="number"
                                            step="0.1"
                                            value={tempGoals.fat_goal}
                                            onChange={(e) => setTempGoals({...tempGoals, fat_goal: parseFloat(e.target.value)})}
                                            className="text-center"
                                        />
                                    </div>
                                    <Button onClick={handleSaveGoals} className="w-full">
                                        שמור יעדים
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>

                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="rounded-2xl border-2 hover:bg-gray-50">
                                    <Info className="w-4 h-4 mr-2" />
                                    מידע על המנות
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-lg" dir="rtl">
                                <DialogHeader>
                                    <DialogTitle>הגדרות מנות מאקרו</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div className="bg-emerald-50 p-4 rounded-xl">
                                        <h3 className="font-semibold text-emerald-700 mb-2">מנת חלבון</h3>
                                        <p className="text-emerald-600">30 גרם חלבון = 1 מנה</p>
                                    </div>
                                    <div className="bg-amber-50 p-4 rounded-xl">
                                        <h3 className="font-semibold text-amber-700 mb-2">מנת פחמימה</h3>
                                        <p className="text-amber-600">30 גרם פחמימה = 1 מנה</p>
                                    </div>
                                    <div className="bg-orange-50 p-4 rounded-xl">
                                        <h3 className="font-semibold text-orange-700 mb-2">מנת שומן</h3>
                                        <p className="text-orange-600">10 גרם שומן = 1 מנה</p>
                                    </div>
                                    <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                                        <h4 className="font-medium mb-3">דוגמאות נפוצות:</h4>
                                        <ul className="text-sm space-y-2 text-gray-600">
                                            <li>• לחם (65 גרם) = 1 מנת פחמימה</li>
                                            <li>• אורז מבושל (125 גרם) = 1 מנת פחמימה</li>
                                            <li>• שקדים (31 גרם) ≈ 1.6 מנות שומן</li>
                                            <li>• אבוקדו (112 גרם) ≈ 1.8 מנות שומן</li>
                                        </ul>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </motion.div>

                <DailyProgress todayFoods={todayFoods} goals={goals} />

                <div className="mb-16">
                    <FoodList 
                        foods={todayFoods} 
                        onDeleteFood={handleDeleteFood}
                        onClearAll={handleClearAll}
                        onAddFood={handleAddFood}
                        isLoading={isLoading}
                    />
                </div>

                <FoodForm onSubmit={handleAddFood} isLoading={isLoading} />
            </div>
        </div>
    );
}
