import React, { useState, useEffect, useCallback } from "react";
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
import { toLocalDateString } from "@/lib/dates";
import InlineError from "@/components/InlineError";
import LogoSpinner from "@/components/LogoSpinner";
import ConfirmDialog from "@/components/ConfirmDialog";

import FoodForm from "../components/nutrition/FoodForm";
import DailyProgress from "../components/nutrition/DailyProgress";
import FoodList from "../components/nutrition/FoodList";

const DEFAULT_GOALS = { protein_goal: 6, carbs_goal: 6.5, fat_goal: 2 };
const GOAL_FIELDS = [
    { field: "protein_goal", label: "home_protein_portions" },
    { field: "carbs_goal",   label: "home_carbs_portions" },
    { field: "fat_goal",     label: "home_fat_portions" },
];

// Goals are edited as strings so an empty field stays empty instead of becoming NaN.
const goalsToForm = (goals) =>
    Object.fromEntries(GOAL_FIELDS.map(({ field }) => [field, String(goals[field] ?? "")]));

export default function Home() {
    const { t } = useTranslation();
    const [todayFoods, setTodayFoods] = useState([]);
    const [goals, setGoals] = useState(null);
    const [load, setLoad] = useState({ status: "loading", error: null });
    const [isAdding, setIsAdding] = useState(false);

    const [showGoalsDialog, setShowGoalsDialog] = useState(false);
    const [goalsForm, setGoalsForm] = useState(goalsToForm(DEFAULT_GOALS));
    const [goalsError, setGoalsError] = useState(null);
    const [isSavingGoals, setIsSavingGoals] = useState(false);

    const [showClearDialog, setShowClearDialog] = useState(false);

    const loadData = useCallback(async () => {
        setLoad((prev) => ({ status: prev.status === "ready" ? "ready" : "loading", error: null }));
        const today = toLocalDateString();
        const [foodsResult, goalsResult] = await Promise.all([
            Food.listByDate(today),
            DailyGoals.get(),
        ]);

        if (foodsResult.ok) setTodayFoods(foodsResult.data);
        if (goalsResult.ok && goalsResult.data) setGoals(goalsResult.data);

        const failed = !foodsResult.ok ? foodsResult : !goalsResult.ok ? goalsResult : null;
        setLoad(failed ? { status: "error", error: failed.error } : { status: "ready", error: null });
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Returns the envelope so the form that called it can show the error next to its own button.
    const handleAddFood = async (foodData) => {
        setIsAdding(true);
        const result = await Food.create({ ...foodData, date: toLocalDateString() });
        setIsAdding(false);
        if (result.ok) setTodayFoods((foods) => [result.data, ...foods]);
        return result;
    };

    const handleDeleteFood = async (foodId) => {
        const result = await Food.delete(foodId);
        if (result.ok) setTodayFoods((foods) => foods.filter((f) => f.id !== foodId));
        return result;
    };

    // Deletes every meal of the day. If some fail, the API lists them in
    // details.failed: those stay on screen and the dialog says how many.
    const handleClearAll = async () => {
        const total = todayFoods.length;
        const result = await Food.clearDay(toLocalDateString());
        if (result.ok) {
            setTodayFoods([]);
            return result;
        }
        const failedIds = result.error.details?.failed;
        if (!Array.isArray(failedIds)) return result;
        setTodayFoods((foods) => foods.filter((f) => failedIds.includes(f.id)));
        return {
            ok: false,
            error: { ...result.error, code: "partial", message: t("home_clear_partial", { failed: failedIds.length, total }) },
        };
    };

    const openGoalsDialog = (open) => {
        if (open) {
            setGoalsForm(goalsToForm(goals || DEFAULT_GOALS));
            setGoalsError(null);
        }
        setShowGoalsDialog(open);
    };

    const handleSaveGoals = async () => {
        const values = {};
        for (const { field } of GOAL_FIELDS) {
            const raw = goalsForm[field].trim();
            const value = Number(raw);
            if (raw === "" || !Number.isFinite(value) || value < 0) {
                setGoalsError(t("goals_invalid"));
                return;
            }
            values[field] = value;
        }

        setIsSavingGoals(true);
        setGoalsError(null);
        const result = await DailyGoals.save(values);
        setIsSavingGoals(false);

        if (!result.ok) {
            setGoalsError(result.error);
            return;
        }
        setGoals(result.data);
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
                        <Dialog open={showGoalsDialog} onOpenChange={openGoalsDialog}>
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
                                <form
                                    className="space-y-4"
                                    onSubmit={(e) => { e.preventDefault(); handleSaveGoals(); }}
                                >
                                    {GOAL_FIELDS.map(({ field, label }) => (
                                        <div key={field}>
                                            <Label htmlFor={field}>{t(label)}</Label>
                                            <Input
                                                id={field}
                                                type="number"
                                                inputMode="decimal"
                                                min="0"
                                                step="0.1"
                                                value={goalsForm[field]}
                                                onChange={(e) => setGoalsForm({ ...goalsForm, [field]: e.target.value })}
                                                className="text-center"
                                            />
                                        </div>
                                    ))}
                                    <div>
                                        <Button type="submit" className="w-full" disabled={isSavingGoals}>
                                            {isSavingGoals && <LogoSpinner size="sm" inline className="me-2" />}
                                            {t("home_save_goals")}
                                        </Button>
                                        <InlineError error={goalsError} />
                                    </div>
                                </form>
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

                {load.status === "loading" ? (
                    <LogoSpinner size="lg" className="mb-16" />
                ) : (
                    <>
                        <InlineError error={load.error} onRetry={loadData} className="justify-center mb-6 text-base" />

                        <DailyProgress todayFoods={todayFoods} goals={goals} />

                        <div className="mb-16">
                            <FoodList
                                foods={todayFoods}
                                onDeleteFood={handleDeleteFood}
                                onClearAll={() => setShowClearDialog(true)}
                                onAddFood={handleAddFood}
                                isLoading={isAdding}
                            />
                        </div>
                    </>
                )}

                <FoodForm onSubmit={handleAddFood} isLoading={isAdding} />

                <ConfirmDialog
                    open={showClearDialog}
                    onOpenChange={setShowClearDialog}
                    title={t("home_clear_title")}
                    description={t("home_confirm_clear")}
                    confirmLabel={t("home_clear_btn")}
                    onConfirm={handleClearAll}
                />
            </div>
        </div>
    );
}
