import React, { useState, useEffect } from "react";
import { Food, DailyGoals } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Target, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function MonthlyTracker() {
    const { t } = useTranslation();
    const [dailyData, setDailyData] = useState({});
    const [stats, setStats] = useState({ green: 0, red: 0, total: 0 });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const allFoods = await Food.list("-created");
            const goalsData = await DailyGoals.list();
            const currentGoals = goalsData && goalsData.length > 0
                ? goalsData[0]
                : { protein_goal: 6, carbs_goal: 6.5, fat_goal: 2 };

            const last30Days = getLast30Days();
            const processedData = {};

            last30Days.forEach(date => {
                const dayFoods = allFoods.filter(food => food.date === date);
                const dayTotals = calculateDayTotals(dayFoods);
                const isOnTarget = checkIfOnTarget(dayTotals, currentGoals);
                processedData[date] = { totals: dayTotals, isOnTarget, foodCount: dayFoods.length };
            });

            setDailyData(processedData);

            const greenDays = Object.values(processedData).filter(d => d.isOnTarget).length;
            const redDays   = Object.values(processedData).filter(d => !d.isOnTarget && d.foodCount > 0).length;
            setStats({ green: greenDays, red: redDays, total: 30 });
        } catch (error) {
            console.error("Error loading data:", error);
        }
        setIsLoading(false);
    };

    const getLast30Days = () => {
        const dates = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            dates.push(date.toISOString().split('T')[0]);
        }
        return dates;
    };

    const calculateDayTotals = (dayFoods) =>
        dayFoods.reduce((totals, food) => ({
            protein: totals.protein + (food.protein_portions || 0),
            carbs:   totals.carbs   + (food.carbs_portions   || 0),
            fat:     totals.fat     + (food.fat_portions      || 0),
        }), { protein: 0, carbs: 0, fat: 0 });

    const checkIfOnTarget = (totals, goals) =>
        totals.protein >= goals.protein_goal &&
        totals.carbs   >= goals.carbs_goal   &&
        totals.fat     >= goals.fat_goal;

    const formatDate = (dateString) => {
        const today = new Date().toISOString().split('T')[0];
        if (dateString === today) return t("monthly_today");
        const date   = new Date(dateString);
        const locale = t("monthly_locale");
        return date.toLocaleDateString(locale, { day: "numeric", month: "short" });
    };

    const getDayColor = (date) => {
        const dayData = dailyData[date];
        if (!dayData || dayData.foodCount === 0) return "bg-gray-100 border-gray-200 text-gray-400";
        return dayData.isOnTarget
            ? "bg-green-100 border-green-300 text-green-700"
            : "bg-red-100 border-red-300 text-red-700";
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
                <div className="flex justify-center items-center h-64">
                    <div className="text-xl text-gray-500">{t("monthly_loading")}</div>
                </div>
            </div>
        );
    }

    const dayNames = t("monthly_day_names", { returnObjects: true });

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-4xl md:text-6xl font-light text-gray-800 mb-4">
                        {t("monthly_title")}
                        <span className="block text-2xl md:text-3xl text-gray-500 font-normal mt-2">
                            {t("monthly_subtitle")}
                        </span>
                    </h1>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="bg-green-50 border-green-200">
                        <CardContent className="p-6 text-center">
                            <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
                            <div className="text-3xl font-bold text-green-700">{stats.green}</div>
                            <div className="text-green-600">{t("monthly_green_days")}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-red-50 border-red-200">
                        <CardContent className="p-6 text-center">
                            <TrendingDown className="w-8 h-8 text-red-600 mx-auto mb-2" />
                            <div className="text-3xl font-bold text-red-700">{stats.red}</div>
                            <div className="text-red-600">{t("monthly_red_days")}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="p-6 text-center">
                            <Target className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                            <div className="text-3xl font-bold text-blue-700">
                                {Math.round((stats.green / stats.total) * 100)}%
                            </div>
                            <div className="text-blue-600">{t("monthly_success_rate")}</div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="backdrop-blur-sm bg-white/90 border-0 shadow-xl rounded-3xl overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white pb-8">
                        <CardTitle className="text-2xl font-light flex items-center gap-3">
                            <CalendarDays className="w-6 h-6" />
                            {t("monthly_calendar_title")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8">
                        <div className="grid grid-cols-7 gap-3 mb-6" dir="ltr">
                            {dayNames.map(day => (
                                <div key={day} className="text-center font-medium text-gray-500 p-2">{day}</div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-3" dir="ltr">
                            {getLast30Days().map((date, index) => {
                                const dayData = dailyData[date];
                                return (
                                    <motion.div
                                        key={date}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: index * 0.02 }}
                                        className={`aspect-square rounded-xl border-2 p-3 text-center cursor-pointer hover:scale-105 transition-all duration-200 ${getDayColor(date)}`}
                                        title={`${formatDate(date)} — ${dayData?.isOnTarget ? t("monthly_achieved") : dayData?.foodCount > 0 ? t("monthly_not_achieved") : t("monthly_no_data")}`}
                                    >
                                        <div className="text-sm font-semibold">{formatDate(date)}</div>
                                        {dayData && dayData.foodCount > 0 && (
                                            <div className="text-xs mt-1">{dayData.isOnTarget ? "✓" : "✗"}</div>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>

                        <div className="flex justify-center gap-6 mt-8">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded" />
                                <span className="text-sm text-gray-600">{t("monthly_achieved")}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded" />
                                <span className="text-sm text-gray-600">{t("monthly_not_achieved")}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-gray-100 border-2 border-gray-200 rounded" />
                                <span className="text-sm text-gray-600">{t("monthly_no_data")}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
