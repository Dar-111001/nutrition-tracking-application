import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, Flame, Lightbulb } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { resolveGoals, dayTotals, calorieStatus } from "@/lib/goals";

const round1 = (n) => Math.round(n * 10) / 10;

const MACROS = [
    { key: "protein", label: "progress_protein", bgColor: "bg-emerald-50", textColor: "text-emerald-700" },
    { key: "carbs",   label: "progress_carbs",   bgColor: "bg-amber-50",   textColor: "text-amber-700" },
    { key: "fat",     label: "progress_fat",     bgColor: "bg-orange-50",  textColor: "text-orange-700" },
];

// Ring colour per calorie status (see calorieStatus in lib/goals.js)
const RING_COLORS = { empty: "#c7d2fe", under: "#6366f1", on: "#10b981", over: "#ef4444" };

// The day at a glance: calories against the calorie goal (the goal), then
// protein, carbs and fat against their suggested portions (only a guide).
export default function DailyProgress({ todayFoods, goals }) {
    const { t } = useTranslation();
    const totals = dayTotals(todayFoods);
    const { calories: calorieGoal, macros } = resolveGoals(goals);
    const status = calorieStatus(totals.kcal, calorieGoal, todayFoods?.length);
    const left = calorieGoal - totals.kcal;

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
                    <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8 items-center">
                        <CalorieRing eaten={totals.kcal} goal={calorieGoal} color={RING_COLORS[status]}>
                            <Flame className="w-6 h-6 text-orange-500 mb-1" aria-hidden="true" />
                            <span className="text-4xl font-bold text-gray-900 tabular-nums">{totals.kcal}</span>
                            <span className="text-sm text-gray-500">{t("progress_kcal_of", { goal: calorieGoal })}</span>
                            <span className={`mt-2 text-sm font-medium ${status === "over" ? "text-red-600" : status === "on" ? "text-emerald-600" : "text-indigo-600"}`}>
                                {left >= 0
                                    ? t("progress_kcal_left", { count: left })
                                    : t("progress_kcal_over", { count: -left })}
                            </span>
                        </CalorieRing>

                        <div>
                            <div className="flex items-center gap-2 mb-1 text-gray-700">
                                <Lightbulb className="w-4 h-4 text-amber-500" aria-hidden="true" />
                                <span className="font-medium">{t("progress_suggested_title")}</span>
                            </div>
                            <p className="text-sm text-gray-500 mb-4">{t("progress_suggested_hint")}</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {MACROS.map(({ key, label, bgColor, textColor }, index) => {
                                    const current = round1(totals[key]);
                                    const suggested = macros[key].portions;
                                    return (
                                        <motion.div
                                            key={key}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            className={`${bgColor} rounded-2xl p-4 space-y-2`}
                                        >
                                            <div className={`text-sm font-semibold ${textColor}`}>{t(label)}</div>
                                            <div className="flex items-baseline justify-between">
                                                <span className={`text-2xl font-bold ${textColor} tabular-nums`}>{current}</span>
                                                <span className={`text-sm ${textColor} opacity-75`}>
                                                    {t("progress_suggested_portions", { count: suggested })}
                                                </span>
                                            </div>
                                            <Progress value={suggested > 0 ? Math.min((current / suggested) * 100, 100) : 0} className="h-2 bg-white/70" />
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

// A ring that fills as the day's calories approach the goal
function CalorieRing({ eaten, goal, color, children }) {
    const size = 208;
    const stroke = 16;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const fraction = goal > 0 ? Math.min(eaten / goal, 1) : 0;

    return (
        <div className="relative mx-auto" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#eef2ff" strokeWidth={stroke} />
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: circumference * (1 - fraction) }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                {children}
            </div>
        </div>
    );
}
