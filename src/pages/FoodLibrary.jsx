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

export default function FoodLibrary() {
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
        setCurrentItem({
            id: null,
            name: "",
            protein_per_100g: "",
            carbs_per_100g: "",
            fat_per_100g: ""
        });
        setShowDialog(true);
    };

    const handleEdit = (item) => {
        setIsEditing(true);
        setCurrentItem(item);
        setShowDialog(true);
    };

    const handleDelete = async (itemId) => {
        if (confirm("האם אתה בטוח שברצונך למחוק פריט זה מהספרייה?")) {
            await FoodItem.delete(itemId);
            await loadFoodItems();
        }
    };

    const handleSave = async () => {
        if (!currentItem.name.trim()) {
            alert("אנא הזן שם לפריט המזון");
            return;
        }
        const dataToSave = {
            name: currentItem.name,
            protein_per_100g: parseFloat(currentItem.protein_per_100g) || 0,
            carbs_per_100g: parseFloat(currentItem.carbs_per_100g) || 0,
            fat_per_100g: parseFloat(currentItem.fat_per_100g) || 0,
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
            alert("שגיאה בשמירה. ודא שהשרת פועל ונסה שוב.");
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
                alert("הקובץ חייב להכיל את העמודות: name, protein_per_100g, carbs_per_100g, fat_per_100g");
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
            alert(`הועלו בהצלחה ${items.length} פריטי מזון!`);
        } catch (error) {
            console.error("Error uploading file:", error);
            alert("שגיאה בקריאת הקובץ");
        }
        setIsUploading(false);
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
                        ספריית המזון שלי
                        <span className="block text-2xl md:text-3xl text-gray-500 font-normal mt-2">
                            נהל את פריטי המזון הנפוצים שלך
                        </span>
                    </h1>
                </motion.div>

                <Card className="backdrop-blur-sm bg-white/90 border-0 shadow-xl rounded-3xl overflow-hidden">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-2xl font-light">רשימת פריטים</CardTitle>
                            <div className="flex gap-2">
                                <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline">
                                            <Upload className="w-4 h-4 mr-2" />
                                            העלה CSV
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent dir="rtl">
                                        <DialogHeader>
                                            <DialogTitle>העלאת קובץ CSV</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                            <p className="text-sm text-gray-600">
                                                העלה קובץ CSV עם העמודות הבאות: name, protein_per_100g, carbs_per_100g, fat_per_100g
                                            </p>
                                            <Input 
                                                type="file" 
                                                accept=".csv"
                                                onChange={handleFileUpload}
                                                disabled={isUploading}
                                            />
                                            {isUploading && <p className="text-blue-600">מעלה קובץ...</p>}
                                        </div>
                                    </DialogContent>
                                </Dialog>
                                <Button onClick={handleAddNew}>
                                    <PlusCircle className="w-4 h-4 mr-2" />
                                    הוסף פריט חדש
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="text-center py-8">טוען...</div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>שם המזון</TableHead>
                                        <TableHead className="text-center">חלבון (ל-100 גרם)</TableHead>
                                        <TableHead className="text-center">פחמימה (ל-100 גרם)</TableHead>
                                        <TableHead className="text-center">שומן (ל-100 גרם)</TableHead>
                                        <TableHead className="text-right">פעולות</TableHead>
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
                    <DialogContent dir="rtl">
                        <DialogHeader>
                            <DialogTitle>{isEditing ? "עריכת פריט מזון" : "הוספת פריט מזון חדש"}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">שם הפריט</Label>
                                <Input id="name" value={currentItem.name} onChange={(e) => setCurrentItem({...currentItem, name: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="protein">חלבון (ל-100 גרם)</Label>
                                <Input id="protein" type="number" value={currentItem.protein_per_100g} onChange={(e) => setCurrentItem({...currentItem, protein_per_100g: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="carbs">פחמימה (ל-100 גרם)</Label>
                                <Input id="carbs" type="number" value={currentItem.carbs_per_100g} onChange={(e) => setCurrentItem({...currentItem, carbs_per_100g: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="fat">שומן (ל-100 גרם)</Label>
                                <Input id="fat" type="number" value={currentItem.fat_per_100g} onChange={(e) => setCurrentItem({...currentItem, fat_per_100g: e.target.value})} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSave} className="w-full">{isEditing ? "שמור שינויים" : "הוסף לספרייה"}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}