import React, { useState, useEffect } from "react";
import { Food, DailyGoals } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Target, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { toLocalDateString, parseLocalDate, lastNDays } from "@/lib/dates";
import InlineError from "@/components/InlineError";
import LogoSpinner from "@/components/LogoSpinner";
import PageHeader from "@/components/PageHeader";
import { resolveGoals, dayTotals, calorieStatus } from "@/lib/goals";

export default function MonthlyTracker() {
    const { t } = useTranslation();
    const [dailyData, setDailyData] = useState({});
    const [stats, setStats] = useState({ green: 0, red: 0, total: 0 });
    const [load, setLoad] = useState({ status: "loading", error: null });
    const last30Days = lastNDays(30);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoad({ status: "loading", error: null });
        const days = lastNDays(30);
        const [foodsResult, goalsResult] = await Promise.all([
            Food.listRange(days[0], days[days.length - 1]),
            DailyGoals.get(),
        ]);
        const failed = !foodsResult.ok ? foodsResult : !goalsResult.ok ? goalsResult : null;
        if (failed) {
            setLoad({ status: "error", error: failed.error });
            return;
        }

        // A day is on target when its calories land within 10% of the calorie goal
        // (see calorieStatus); the macros are only a suggestion, so they don't count.
        const allFoods = foodsResult.data;
        const { calories: calorieGoal } = resolveGoals(goalsResult.data);
        const processedData = {};

        days.forEach(date => {
            const dayFoods = allFoods.filter(food => food.date === date);
            const totals = dayTotals(dayFoods);
            const status = calorieStatus(totals.kcal, calorieGoal, dayFoods.length);
            processedData[date] = { totals, status, isOnTarget: status === "on", foodCount: dayFoods.length };
        });

        setDailyData(processedData);

        const greenDays = Object.values(processedData).filter(d => d.isOnTarget).length;
        const redDays   = Object.values(processedData).filter(d => !d.isOnTarget && d.foodCount > 0).length;
        setStats({ green: greenDays, red: redDays, total: 30 });
        setLoad({ status: "ready", error: null });
    };

    const formatDate = (dateString) => {
        if (dateString === toLocalDateString()) return t("monthly_today");
        const date   = parseLocalDate(dateString);
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

    const header = <PageHeader title={t("monthly_title")} subtitle={t("monthly_subtitle")} />;

    // The heading stays on screen while loading, so focus has somewhere to land after navigating here
    if (load.status !== "ready") {
        return (
            <>
                {header}
                <div className="flex justify-center items-center min-h-64">
                    {load.status === "loading"
                        ? <LogoSpinner size="lg" label={t("monthly_loading")} />
                        : <InlineError error={load.error} onRetry={loadData} className="text-base" />}
                </div>
            </>
        );
    }

    const hasAnyData = Object.values(dailyData).some(d => d.foodCount > 0);

    const dayNames = t("monthly_day_names", { returnObjects: true });

    return (
        <>
            {header}

            {!hasAnyData && (
                <p className="text-center text-gray-600 mb-6">{t("monthly_empty")}</p>
            )}

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
                        <CalendarDays className="w-6 h-6" aria-hidden="true" />
                        {t("monthly_calendar_title")}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                    {/* Weekday headers are visual only: each day below names its own date */}
                    <div className="grid grid-cols-7 gap-1 sm:gap-3 mb-3 sm:mb-6" dir="ltr" aria-hidden="true">
                        {dayNames.map(day => (
                            <div key={day} className="text-center text-xs sm:text-base font-medium text-gray-500 p-1 sm:p-2">{day}</div>
                        ))}
                    </div>

                    {/* A list of days: screen readers get the count and read each day's status in words,
                        not only as a color. The first day starts under its own weekday. */}
                    <ol className="grid grid-cols-7 gap-1 sm:gap-3" dir="ltr">
                        {last30Days.map((date, index) => {
                            const dayData = dailyData[date];
                            const hasFood = dayData?.foodCount > 0;
                            const status = hasFood
                                ? `${dayData.totals.kcal} ${t("library_kcal")}, ${t(`monthly_status_${dayData.status}`)}`
                                : t("monthly_no_data");
                            return (
                                <motion.li
                                    key={date}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.02 }}
                                    style={index === 0 ? { gridColumnStart: parseLocalDate(date).getDay() + 1 } : undefined}
                                    className={`min-h-14 sm:aspect-square rounded-lg sm:rounded-xl border-2 p-1 sm:p-3 text-center ${getDayColor(date)}`}
                                    title={`${formatDate(date)} — ${status}`}
                                >
                                    <div className="text-xs sm:text-sm font-semibold">{formatDate(date)}</div>
                                    {hasFood && (
                                        <div className="text-xs mt-1 tabular-nums" aria-hidden="true">{dayData.totals.kcal}</div>
                                    )}
                                    <span className="sr-only">{status}</span>
                                </motion.li>
                            );
                        })}
                    </ol>

                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-8">
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
        </>
    );
}
