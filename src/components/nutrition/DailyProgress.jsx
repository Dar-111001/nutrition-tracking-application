import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function DailyProgress({ todayFoods, goals }) {
    const { t } = useTranslation();

    const calculateTotalPortions = () => {
        if (!todayFoods || todayFoods.length === 0) return { protein: 0, carbs: 0, fat: 0 };
        return todayFoods.reduce((totals, food) => ({
            protein: totals.protein + (food.protein_portions || 0),
            carbs:   totals.carbs   + (food.carbs_portions   || 0),
            fat:     totals.fat     + (food.fat_portions      || 0),
        }), { protein: 0, carbs: 0, fat: 0 });
    };

    const totals       = calculateTotalPortions();
    const currentGoals = goals || { protein_goal: 6, carbs_goal: 6.5, fat_goal: 2 };

    const progressData = [
        {
            name: t("progress_protein"),
            current: Math.round(totals.protein * 10) / 10,
            goal: currentGoals.protein_goal,
            bgColor: "bg-emerald-100",
            textColor: "text-emerald-700",
        },
        {
            name: t("progress_carbs"),
            current: Math.round(totals.carbs * 10) / 10,
            goal: currentGoals.carbs_goal,
            bgColor: "bg-amber-100",
            textColor: "text-amber-700",
        },
        {
            name: t("progress_fat"),
            current: Math.round(totals.fat * 10) / 10,
            goal: currentGoals.fat_goal,
            bgColor: "bg-orange-100",
            textColor: "text-orange-700",
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8"
        >
            <Card className="backdrop-blur-sm bg-white/90 border-0 shadow-xl rounded-3xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white pb-8">
                    <CardTitle className="text-2xl font-light flex items-center gap-3">
                        <Target className="w-6 h-6" />
                        {t("progress_title")}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {progressData.map((item, index) => {
                            const percentage = Math.min((item.current / item.goal) * 100, 100);
                            const remaining  = Math.max(item.goal - item.current, 0);
                            return (
                                <motion.div
                                    key={item.name}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className={`${item.bgColor} rounded-2xl p-6 space-y-4`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className={`text-lg font-semibold ${item.textColor}`}>{item.name}</span>
                                        <TrendingUp className={`w-5 h-5 ${item.textColor}`} />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className={`text-3xl font-bold ${item.textColor}`}>{item.current}</span>
                                            <span className={`text-lg ${item.textColor} opacity-75`}>/ {item.goal}</span>
                                        </div>
                                        <Progress value={percentage} className="h-3 bg-white/50" />
                                        <div className="text-center">
                                            {remaining > 0 ? (
                                                <span className={`text-sm ${item.textColor} opacity-75`}>
                                                    {t("progress_remaining", { count: Math.round(remaining * 10) / 10 })}
                                                </span>
                                            ) : (
                                                <span className={`text-sm ${item.textColor} font-medium`}>
                                                    {t("progress_goal_achieved")}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
