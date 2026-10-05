import React, { useState, useEffect } from "react";
import { FoodItem } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Pencil, Trash2, Upload, Library } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { parseFoodItemsCsv } from "@/lib/csv";
import InlineError from "@/components/InlineError";
import LogoSpinner from "@/components/LogoSpinner";
import ConfirmDialog from "@/components/ConfirmDialog";

const NUMBER_FIELDS = ["protein_per_100g", "carbs_per_100g", "fat_per_100g"];
const EMPTY_ITEM = { id: null, name: "", protein_per_100g: "", carbs_per_100g: "", fat_per_100g: "" };

export default function FoodLibrary() {
    const { t } = useTranslation();
    const [foodItems, setFoodItems] = useState([]);
    const [load, setLoad] = useState({ status: "loading", error: null });

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
        setCurrentItem(item
            ? { ...item, ...Object.fromEntries(NUMBER_FIELDS.map((f) => [f, String(item[f] ?? "")])) }
            : EMPTY_ITEM);
        setSaveError(null);
        setShowDialog(true);
    };

    const handleSave = async () => {
        if (!currentItem.name.trim()) {
            setSaveError(t("library_alert_no_name"));
            return;
        }
        const dataToSave = { name: currentItem.name.trim() };
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
        const items = parsed.items.map(({ name, protein_per_100g, carbs_per_100g, fat_per_100g }) =>
            ({ name, protein_per_100g, carbs_per_100g, fat_per_100g }));
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
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("library_col_name")}</TableHead>
                                        <TableHead className="text-center">{t("library_col_protein")}</TableHead>
                                        <TableHead className="text-center">{t("library_col_carbs")}</TableHead>
                                        <TableHead className="text-center">{t("library_col_fat")}</TableHead>
                                        <TableHead className="text-right">{t("library_col_actions")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {foodItems.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            <TableCell className="text-center">{item.protein_per_100g}g</TableCell>
                                            <TableCell className="text-center">{item.carbs_per_100g}g</TableCell>
                                            <TableCell className="text-center">{item.fat_per_100g}g</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex gap-2 justify-end">
                                                    <Button variant="ghost" size="icon" onClick={() => openItemDialog(item)} aria-label={t("library_edit_title")}>
                                                        <Pencil className="w-4 h-4 text-blue-600" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => setItemToDelete(item)} aria-label={t("library_delete_btn")}>
                                                        <Trash2 className="w-4 h-4 text-red-600" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                <Dialog open={showDialog} onOpenChange={setShowDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{isEditing ? t("library_edit_title") : t("library_add_title")}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">{t("library_name_label")}</Label>
                                <Input id="name" value={currentItem.name} onChange={(e) => setCurrentItem({ ...currentItem, name: e.target.value })} />
                            </div>
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
                    description={itemToDelete ? `${itemToDelete.name}: ${t("library_confirm_delete")}` : ""}
                    confirmLabel={t("library_delete_btn")}
                    onConfirm={handleDelete}
                />
            </div>
        </div>
    );
}
