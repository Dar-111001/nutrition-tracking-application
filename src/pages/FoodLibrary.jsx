import React, { useState, useEffect } from "react";
import { FoodItem } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Pencil, Trash2, Upload } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function FoodLibrary() {
    const { t } = useTranslation();
    const [foodItems, setFoodItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showDialog, setShowDialog] = useState(false);
    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [currentItem, setCurrentItem] = useState({
        id: null,
        name: "",
        protein_per_100g: "",
        carbs_per_100g: "",
        fat_per_100g: ""
    });

    useEffect(() => {
        loadFoodItems();
    }, []);

    const loadFoodItems = async () => {
        setIsLoading(true);
        try {
            const items = await FoodItem.list();
            setFoodItems(items);
        } catch (error) {
            console.error("Error loading food items:", error);
        }
        setIsLoading(false);
    };

    const handleAddNew = () => {
        setIsEditing(false);
        setCurrentItem({ id: null, name: "", protein_per_100g: "", carbs_per_100g: "", fat_per_100g: "" });
        setShowDialog(true);
    };

    const handleEdit = (item) => {
        setIsEditing(true);
        setCurrentItem(item);
        setShowDialog(true);
    };

    const handleDelete = async (itemId) => {
        if (confirm(t("library_confirm_delete"))) {
            await FoodItem.delete(itemId);
            await loadFoodItems();
        }
    };

    const handleSave = async () => {
        if (!currentItem.name.trim()) {
            alert(t("library_alert_no_name"));
            return;
        }
        const dataToSave = {
            name: currentItem.name,
            protein_per_100g: parseFloat(currentItem.protein_per_100g) || 0,
            carbs_per_100g:   parseFloat(currentItem.carbs_per_100g)   || 0,
            fat_per_100g:     parseFloat(currentItem.fat_per_100g)      || 0,
        };
        try {
            if (isEditing) {
                await FoodItem.update(currentItem.id, dataToSave);
            } else {
                await FoodItem.create(dataToSave);
            }
            setShowDialog(false);
            await loadFoodItems();
        } catch (error) {
            console.error("Error saving food item:", error);
            alert(t("library_alert_save_error"));
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const text = await file.text();
            const lines = text.trim().split(/\r?\n/);
            const header = lines[0].toLowerCase().split(",").map(h => h.trim());

            const nameIdx    = header.indexOf("name");
            const proteinIdx = header.indexOf("protein_per_100g");
            const carbsIdx   = header.indexOf("carbs_per_100g");
            const fatIdx     = header.indexOf("fat_per_100g");

            if (nameIdx === -1 || proteinIdx === -1 || carbsIdx === -1 || fatIdx === -1) {
                alert(t("library_alert_bad_csv"));
                setIsUploading(false);
                return;
            }

            const items = [];
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(",").map(c => c.trim());
                if (!cols[nameIdx]) continue;
                items.push({
                    name:             cols[nameIdx],
                    protein_per_100g: parseFloat(cols[proteinIdx]) || 0,
                    carbs_per_100g:   parseFloat(cols[carbsIdx])   || 0,
                    fat_per_100g:     parseFloat(cols[fatIdx])      || 0,
                });
            }

            for (const item of items) {
                await FoodItem.create(item);
            }
            await loadFoodItems();
            setShowUploadDialog(false);
            alert(t("library_alert_upload_success", { count: items.length }));
        } catch (error) {
            console.error("Error uploading file:", error);
            alert(t("library_alert_upload_error"));
        }
        setIsUploading(false);
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
                                <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
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
                                            {isUploading && <p className="text-blue-600">{t("library_uploading")}</p>}
                                        </div>
                                    </DialogContent>
                                </Dialog>
                                <Button onClick={handleAddNew}>
                                    <PlusCircle className="w-4 h-4 mr-2" />
                                    {t("library_add_btn")}
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="text-center py-8">{t("library_loading")}</div>
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
                                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                                                        <Pencil className="w-4 h-4 text-blue-600" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
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
                                <Input id="protein" type="number" value={currentItem.protein_per_100g} onChange={(e) => setCurrentItem({ ...currentItem, protein_per_100g: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="carbs">{t("library_carbs_label")}</Label>
                                <Input id="carbs" type="number" value={currentItem.carbs_per_100g} onChange={(e) => setCurrentItem({ ...currentItem, carbs_per_100g: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="fat">{t("library_fat_label")}</Label>
                                <Input id="fat" type="number" value={currentItem.fat_per_100g} onChange={(e) => setCurrentItem({ ...currentItem, fat_per_100g: e.target.value })} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSave} className="w-full">
                                {isEditing ? t("library_save_btn") : t("library_add_to_library_btn")}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
