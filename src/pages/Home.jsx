import React, { useState, useEffect } from "react";
import { Food, DailyGoals } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Settings, Info } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
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
    const { t } = useTranslation();
    const [todayFoods, setTodayFoods] = useState([]);
    const [goals, setGoals] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showGoalsDialog, setShowGoalsDialog] = useState(false);
    const [tempGoals, setTempGoals] = useState({ protein_goal: 6, carbs_goal: 6.5, fat_goal: 2 });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const today = new Date().toISOString().split('T')[0];
        const [foodsResult, goalsResult] = await Promise.all([Food.listByDate(today), DailyGoals.get()]);
        if (foodsResult.ok) setTodayFoods(foodsResult.data);
        else console.error("Error loading foods:", foodsResult.error);

        if (goalsResult.ok && goalsResult.data) {
            setGoals(goalsResult.data);
            setTempGoals(goalsResult.data);
        } else if (!goalsResult.ok) {
            console.error("Error loading goals:", goalsResult.error);
        }
    };

    const handleAddFood = async (foodData) => {
        setIsLoading(true);
        const result = await Food.create(foodData);
        if (result.ok) await loadData();
        else console.error("Error adding food:", result.error);
        setIsLoading(false);
    };

    const handleDeleteFood = async (foodId) => {
        const result = await Food.delete(foodId);
        if (!result.ok) console.error("Error deleting food:", result.error);
        await loadData();
    };

    const handleClearAll = async () => {
        if (confirm(t("home_confirm_clear"))) {
            const today = new Date().toISOString().split('T')[0];
            const result = await Food.clearDay(today);
            if (!result.ok) console.error("Error clearing foods:", result.error);
            await loadData();
        }
    };

    const handleSaveGoals = async () => {
        const result = await DailyGoals.save(tempGoals);
        if (!result.ok) {
            console.error("Error saving goals:", result.error);
            return;
        }
        await loadData();
        setShowGoalsDialog(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-4xl md:text-6xl font-light text-gray-800 mb-4">
                        {t("home_title")}
                        <span className="block text-2xl md:text-3xl text-gray-500 font-normal mt-2">
                            {t("home_subtitle")}
                        </span>
                    </h1>

                    <div className="flex justify-center gap-4 mt-8">
                        <Dialog open={showGoalsDialog} onOpenChange={setShowGoalsDialog}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="rounded-2xl border-2 hover:bg-gray-50">
                                    <Settings className="w-4 h-4 mr-2" />
                                    {t("home_set_goals")}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>{t("home_goals_dialog_title")}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="protein_goal">{t("home_protein_portions")}</Label>
                                        <Input
                                            id="protein_goal"
                                            type="number"
                                            step="0.1"
                                            value={tempGoals.protein_goal}
                                            onChange={(e) => setTempGoals({ ...tempGoals, protein_goal: parseFloat(e.target.value) })}
                                            className="text-center"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="carbs_goal">{t("home_carbs_portions")}</Label>
                                        <Input
                                            id="carbs_goal"
                                            type="number"
                                            step="0.1"
                                            value={tempGoals.carbs_goal}
                                            onChange={(e) => setTempGoals({ ...tempGoals, carbs_goal: parseFloat(e.target.value) })}
                                            className="text-center"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="fat_goal">{t("home_fat_portions")}</Label>
                                        <Input
                                            id="fat_goal"
                                            type="number"
                                            step="0.1"
                                            value={tempGoals.fat_goal}
                                            onChange={(e) => setTempGoals({ ...tempGoals, fat_goal: parseFloat(e.target.value) })}
                                            className="text-center"
                                        />
                                    </div>
                                    <Button onClick={handleSaveGoals} className="w-full">
                                        {t("home_save_goals")}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>

                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="rounded-2xl border-2 hover:bg-gray-50">
                                    <Info className="w-4 h-4 mr-2" />
                                    {t("home_portion_info")}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-lg">
                                <DialogHeader>
                                    <DialogTitle>{t("home_macro_title")}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div className="bg-emerald-50 p-4 rounded-xl">
                                        <h3 className="font-semibold text-emerald-700 mb-2">{t("home_protein_portion_title")}</h3>
                                        <p className="text-emerald-600">{t("home_protein_portion_desc")}</p>
                                    </div>
                                    <div className="bg-amber-50 p-4 rounded-xl">
                                        <h3 className="font-semibold text-amber-700 mb-2">{t("home_carbs_portion_title")}</h3>
                                        <p className="text-amber-600">{t("home_carbs_portion_desc")}</p>
                                    </div>
                                    <div className="bg-orange-50 p-4 rounded-xl">
                                        <h3 className="font-semibold text-orange-700 mb-2">{t("home_fat_portion_title")}</h3>
                                        <p className="text-orange-600">{t("home_fat_portion_desc")}</p>
                                    </div>
                                    <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                                        <h4 className="font-medium mb-3">{t("home_examples")}</h4>
                                        <ul className="text-sm space-y-2 text-gray-600">
                                            <li>• {t("home_example_bread")}</li>
                                            <li>• {t("home_example_rice")}</li>
                                            <li>• {t("home_example_almonds")}</li>
                                            <li>• {t("home_example_avocado")}</li>
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
