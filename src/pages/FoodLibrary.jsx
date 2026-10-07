import { useState, useEffect, useMemo } from "react";
import { FoodItem } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Pencil, Trash2, Upload, Library, Search, SearchX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { parseFoodItemsCsv } from "@/lib/csv";
import InlineError from "@/components/InlineError";
import LogoSpinner from "@/components/LogoSpinner";
import ConfirmDialog from "@/components/ConfirmDialog";
import CategoryChips, { CATEGORY_ICONS } from "@/components/nutrition/CategoryChips";
import {
    CATEGORIES, NAME_LANGUAGES, foodName, kcalPer100g, matchesSearch, sortByName, countByCategory, groupByCategory,
} from "@/lib/foods";

const NUMBER_FIELDS = ["protein_per_100g", "carbs_per_100g", "fat_per_100g"];
const EMPTY_NAMES = { en: "", es: "", he: "" };
const EMPTY_ITEM = { id: null, names: EMPTY_NAMES, category: "other", protein_per_100g: "", carbs_per_100g: "", fat_per_100g: "" };

export default function FoodLibrary() {
    const { t, i18n } = useTranslation();
    const lang = i18n.resolvedLanguage;
    const [foodItems, setFoodItems] = useState([]);
    const [load, setLoad] = useState({ status: "loading", error: null });
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("all");

    const [showDialog, setShowDialog] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentItem, setCurrentItem] = useState(EMPTY_ITEM);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);

    const [itemToDelete, setItemToDelete] = useState(null);

    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadReport, setUploadReport] = useState(null); // { error } or { created, total, problems }

    useEffect(() => {
        loadFoodItems();
    }, []);

    // Search narrows the chips' counts; the chosen chip then narrows the list
    const searched = useMemo(() => foodItems.filter((item) => matchesSearch(item, search)), [foodItems, search]);
    const groups = useMemo(() => groupByCategory(sortByName(
        category === "all" ? searched : searched.filter((item) => item.category === category), lang,
    )), [searched, category, lang]);

    const loadFoodItems = async () => {
        setLoad((prev) => ({ status: prev.status === "ready" ? "ready" : "loading", error: null }));
        const result = await FoodItem.list();
        if (result.ok) {
            setFoodItems(result.data);
            setLoad({ status: "ready", error: null });
        } else {
            setLoad({ status: "error", error: result.error });
        }
    };

    const openItemDialog = (item) => {
        setIsEditing(Boolean(item));
        if (!item) {
            setCurrentItem({ ...EMPTY_ITEM, category: category === "all" ? "other" : category });
        } else {
            // Foods saved before names per language only have `name`: start it in the current language
            const names = Object.values(item.names).some(Boolean) ? item.names : { ...EMPTY_NAMES, [lang]: item.name };
            setCurrentItem({ ...item, names, ...Object.fromEntries(NUMBER_FIELDS.map((f) => [f, String(item[f] ?? "")])) });
        }
        setSaveError(null);
        setShowDialog(true);
    };

    const handleSave = async () => {
        const names = Object.fromEntries(Object.entries(currentItem.names).map(([code, name]) => [code, name.trim()]));
        if (!Object.values(names).some(Boolean)) {
            setSaveError(t("library_alert_no_name"));
            return;
        }
        const dataToSave = { names, category: currentItem.category };
        for (const field of NUMBER_FIELDS) {
            const raw = String(currentItem[field]).trim();
            const value = raw === "" ? 0 : Number(raw);
            if (!Number.isFinite(value) || value < 0) {
                setSaveError(t("library_number_invalid"));
                return;
            }
            dataToSave[field] = value;
        }

        setIsSaving(true);
        setSaveError(null);
        const result = isEditing
            ? await FoodItem.update(currentItem.id, dataToSave)
            : await FoodItem.create(dataToSave);
        setIsSaving(false);

        if (!result.ok) {
            setSaveError(result.error);
            return;
        }
        setFoodItems((items) => isEditing
            ? items.map((i) => (i.id === result.data.id ? result.data : i))
            : [result.data, ...items]);
        setShowDialog(false);
    };

    const handleDelete = async () => {
        const result = await FoodItem.delete(itemToDelete.id);
        if (result.ok) setFoodItems((items) => items.filter((i) => i.id !== itemToDelete.id));
        return result;
    };

    const openUploadDialog = (open) => {
        if (open) setUploadReport(null);
        setShowUploadDialog(open);
    };

    // CSV import: invalid rows are skipped and listed; valid rows are sent in one
    // request, and the server reports per-row failures, so one bad row never
    // stops the rest.
    const handleFileUpload = async (event) => {
        const input = event.target;
        const file = input.files[0];
        if (!file) return;
        setUploadReport(null);

        let parsed;
        try {
            parsed = parseFoodItemsCsv(await file.text());
        } catch {
            setUploadReport({ error: t("library_alert_upload_error") });
            input.value = "";
            return;
        }

        if (parsed.missingColumns.length > 0) {
            setUploadReport({ error: t("library_csv_missing_columns", { columns: parsed.missingColumns.join(", ") }) });
            input.value = "";
            return;
        }

        const problems = parsed.invalid.map((row) =>
            row.reason === "missing_name"
                ? t("library_csv_row_missing_name", { line: row.line })
                : t("library_csv_row_invalid_number", { line: row.line, column: row.column }));
        const total = parsed.items.length + parsed.invalid.length;

        if (parsed.items.length === 0) {
            setUploadReport({ error: t("library_csv_no_rows"), problems });
            input.value = "";
            return;
        }

        setIsUploading(true);
        // `line` is only used for the error list, so it is not sent to the API
        const items = parsed.items.map(({ name, names, category, protein_per_100g, carbs_per_100g, fat_per_100g }) =>
            ({ name, names, category, protein_per_100g, carbs_per_100g, fat_per_100g }));
        const result = await FoodItem.importMany(items);
        setIsUploading(false);
        input.value = "";

        if (!result.ok) {
            setUploadReport({ error: result.error, problems });
            return;
        }

        for (const failed of result.data.failed) {
            const source = parsed.items[failed.index];
            problems.push(t("library_csv_row_failed", {
                line: source?.line ?? "?",
                name: failed.name ?? source?.name ?? "",
                message: failed.message,
            }));
        }
        setUploadReport({ created: result.data.created, total, problems });
        if (result.data.created > 0) loadFoodItems();
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
                        {t("library_title")}
                        <span className="block text-2xl md:text-3xl text-gray-500 font-normal mt-2">
                            {t("library_subtitle")}
                        </span>
                    </h1>
                </motion.div>

                <Card className="backdrop-blur-sm bg-white/90 border-0 shadow-xl rounded-3xl overflow-hidden">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-2xl font-light">{t("library_list_title")}</CardTitle>
                            <div className="flex gap-2">
                                <Dialog open={showUploadDialog} onOpenChange={openUploadDialog}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline">
                                            <Upload className="w-4 h-4 mr-2" />
                                            {t("library_upload_btn")}
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>{t("library_upload_dialog_title")}</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                            <p className="text-sm text-gray-600">{t("library_upload_hint")}</p>
                                            <Input
                                                type="file"
                                                accept=".csv"
                                                onChange={handleFileUpload}
                                                disabled={isUploading}
                                            />
                                            {isUploading && <LogoSpinner size="sm" label={t("library_uploading")} className="py-2 flex-row" />}
                                            {uploadReport?.error && <InlineError error={uploadReport.error} />}
                                            {uploadReport && !uploadReport.error && (
                                                <p className={uploadReport.problems.length ? "text-sm text-gray-700" : "text-sm text-emerald-700"}>
                                                    {t("library_csv_summary", { created: uploadReport.created, total: uploadReport.total })}
                                                </p>
                                            )}
                                            {uploadReport?.problems?.length > 0 && (
                                                <ul className="max-h-40 overflow-y-auto text-sm text-red-600 space-y-1 list-disc ps-5" role="alert">
                                                    {uploadReport.problems.map((p, i) => <li key={i}>{p}</li>)}
                                                </ul>
                                            )}
                                        </div>
                                    </DialogContent>
                                </Dialog>
                                <Button onClick={() => openItemDialog(null)}>
                                    <PlusCircle className="w-4 h-4 mr-2" />
                                    {t("library_add_btn")}
                                </Button>
                            </div>
                        </div>
                        {load.status === "ready" && foodItems.length > 0 && (
                            <div className="space-y-4 pt-4">
                                <div className="relative">
                                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
                                    <Input
                                        type="search"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder={t("library_search_placeholder")}
                                        aria-label={t("library_search_placeholder")}
                                        className="ps-9 rounded-full bg-white"
                                    />
                                </div>
                                <CategoryChips value={category} onChange={setCategory} counts={countByCategory(searched)} total={searched.length} />
                            </div>
                        )}
                    </CardHeader>
                    <CardContent>
                        {load.status === "loading" ? (
                            <LogoSpinner label={t("library_loading")} />
                        ) : load.status === "error" ? (
                            <InlineError error={load.error} onRetry={loadFoodItems} className="justify-center py-8 text-base" />
                        ) : foodItems.length === 0 ? (
                            <div className="text-center py-12">
                                <Library className="w-14 h-14 mx-auto text-gray-300 mb-4" />
                                <p className="text-xl text-gray-500">{t("library_empty")}</p>
                                <p className="text-gray-400 mt-2">{t("library_empty_hint")}</p>
                            </div>
                        ) : groups.length === 0 ? (
                            <div className="text-center py-12">
                                <SearchX className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                                <p className="text-lg text-gray-500">{t("library_no_matches")}</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                <AnimatePresence initial={false}>
                                    {groups.map(({ category: key, items }) => {
                                        const Icon = CATEGORY_ICONS[key];
                                        return (
                                            <motion.section
                                                key={key}
                                                layout
                                                initial={{ opacity: 0, y: 12 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0 }}
                                                aria-labelledby={`category-${key}`}
                                            >
                                                <h2 id={`category-${key}`} className="flex items-center gap-2 text-lg font-medium text-gray-800 mb-3">
                                                    <Icon className="w-5 h-5 text-gray-500" aria-hidden="true" />
                                                    {t(`category_${key}`)}
                                                    <span className="text-sm font-normal text-gray-400">{items.length}</span>
                                                </h2>
                                                <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white/70">
                                                    {items.map((item) => (
                                                        <FoodRow
                                                            key={item.id}
                                                            item={item}
                                                            lang={lang}
                                                            onEdit={() => openItemDialog(item)}
                                                            onDelete={() => setItemToDelete(item)}
                                                        />
                                                    ))}
                                                </ul>
                                            </motion.section>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Dialog open={showDialog} onOpenChange={setShowDialog}>
                    <DialogContent className="max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{isEditing ? t("library_edit_title") : t("library_add_title")}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <fieldset className="space-y-3">
                                <legend className="text-sm font-medium">{t("library_names_label")}</legend>
                                <p className="text-xs text-gray-500">{t("library_names_hint")}</p>
                                {NAME_LANGUAGES.map(({ code, label, dir }) => (
                                    <div key={code} className="grid grid-cols-[5rem_1fr] items-center gap-3">
                                        <Label htmlFor={`name-${code}`} className="text-gray-600">{label}</Label>
                                        <Input
                                            id={`name-${code}`}
                                            dir={dir}
                                            lang={code}
                                            value={currentItem.names[code]}
                                            onChange={(e) => setCurrentItem({ ...currentItem, names: { ...currentItem.names, [code]: e.target.value } })}
                                        />
                                    </div>
                                ))}
                            </fieldset>
                            <div className="space-y-2">
                                <Label htmlFor="category">{t("library_category_label")}</Label>
                                <Select value={currentItem.category} onValueChange={(value) => setCurrentItem({ ...currentItem, category: value })}>
                                    <SelectTrigger id="category">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map((key) => (
                                            <SelectItem key={key} value={key}>{t(`category_${key}`)}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="protein">{t("library_protein_label")}</Label>
                                    <Input id="protein" type="number" inputMode="decimal" min="0" step="0.1" value={currentItem.protein_per_100g} onChange={(e) => setCurrentItem({ ...currentItem, protein_per_100g: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="carbs">{t("library_carbs_label")}</Label>
                                    <Input id="carbs" type="number" inputMode="decimal" min="0" step="0.1" value={currentItem.carbs_per_100g} onChange={(e) => setCurrentItem({ ...currentItem, carbs_per_100g: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="fat">{t("library_fat_label")}</Label>
                                    <Input id="fat" type="number" inputMode="decimal" min="0" step="0.1" value={currentItem.fat_per_100g} onChange={(e) => setCurrentItem({ ...currentItem, fat_per_100g: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="flex-col sm:flex-col">
                            <Button onClick={handleSave} className="w-full" disabled={isSaving}>
                                {isSaving && <LogoSpinner size="sm" inline className="me-2" />}
                                {isEditing ? t("library_save_btn") : t("library_add_to_library_btn")}
                            </Button>
                            <InlineError error={saveError} />
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <ConfirmDialog
                    open={Boolean(itemToDelete)}
                    onOpenChange={(open) => { if (!open) setItemToDelete(null); }}
                    title={t("library_delete_title")}
                    description={itemToDelete ? `${foodName(itemToDelete, lang)}: ${t("library_confirm_delete")}` : ""}
                    confirmLabel={t("library_delete_btn")}
                    onConfirm={handleDelete}
                />
            </div>
        </div>
    );
}

// One food: its name in the current language (other languages underneath),
// a built-in or "mine" tag, macros and energy per 100 g, and actions.
function FoodRow({ item, lang, onEdit, onDelete }) {
    const { t } = useTranslation();
    const name = foodName(item, lang);
    const otherNames = [...new Set(Object.values(item.names).filter((n) => n && n !== name))];

    return (
        <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
            <div className="min-w-0 flex-1 basis-48">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 truncate">{name}</span>
                    <span className={item.builtin
                        ? "shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700"
                        : "shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700"}>
                        {item.builtin ? t("library_tag_builtin") : t("library_tag_mine")}
                    </span>
                </div>
                {otherNames.length > 0 && <p className="text-xs text-gray-400 truncate">{otherNames.join(" · ")}</p>}
            </div>
            <div className="flex items-center gap-2 text-xs" aria-label={t("library_per_100g")}>
                <span className="rounded-lg bg-emerald-50 px-2 py-1 text-emerald-700">{t("quick_protein")} {item.protein_per_100g}g</span>
                <span className="rounded-lg bg-amber-50 px-2 py-1 text-amber-700">{t("quick_carbs")} {item.carbs_per_100g}g</span>
                <span className="rounded-lg bg-orange-50 px-2 py-1 text-orange-700">{t("quick_fat")} {item.fat_per_100g}g</span>
                <span className="w-16 text-end text-gray-500">{kcalPer100g(item)} {t("library_kcal")}</span>
            </div>
            <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={onEdit} aria-label={t("library_edit_title")}>
                    <Pencil className="w-4 h-4 text-blue-600" />
                </Button>
                <Button variant="ghost" size="icon" onClick={onDelete} aria-label={t("library_delete_btn")}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
            </div>
        </li>
    );
}
