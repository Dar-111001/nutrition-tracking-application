
import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "./utils";
import { Home as HomeIcon, CalendarDays, Library } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Layout({ children, currentPageName }) {
    return (
        <div dir="rtl" className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            <header className="py-6 px-4 md:px-8 bg-white/80 backdrop-blur-sm shadow-md sticky top-0 z-50">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="text-3xl font-light text-gray-800">
                            <Link to={createPageUrl("Home")}>
                                יומן אוכל יומי של דר
                            </Link>
                        </h1>
                    </div>
                    
                    <nav className="flex items-center gap-2">
                        <Button 
                            asChild 
                            variant={currentPageName === "Home" ? "default" : "ghost"}
                            className="rounded-xl"
                        >
                            <Link to={createPageUrl("Home")} className="flex items-center gap-2">
                                <HomeIcon className="w-5 h-5" />
                                יומן יומי
                            </Link>
                        </Button>
                        <Button 
                            asChild 
                            variant={currentPageName === "MonthlyTracker" ? "default" : "ghost"}
                            className="rounded-xl"
                        >
                            <Link to={createPageUrl("MonthlyTracker")} className="flex items-center gap-2">
                                <CalendarDays className="w-5 h-5" />
                                מעקב חודשי
                            </Link>
                        </Button>
                        <Button 
                            asChild 
                            variant={currentPageName === "FoodLibrary" ? "default" : "ghost"}
                            className="rounded-xl"
                        >
                            <Link to={createPageUrl("FoodLibrary")} className="flex items-center gap-2">
                                <Library className="w-5 h-5" />
                                ספריית מזון
                            </Link>
                        </Button>
                    </nav>
                </div>
            </header>
            <main className="p-4 md:p-8">
                <div className="max-w-6xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
