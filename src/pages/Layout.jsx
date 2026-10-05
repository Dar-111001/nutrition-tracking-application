import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home as HomeIcon, CalendarDays, Library, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { logout } from "@/api/auth";

export default function Layout({ children, currentPageName }) {
    const { t } = useTranslation();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            {/* Header always ltr so switcher stays on the visual right regardless of language */}
            <header dir="ltr" className="py-6 px-4 md:px-8 bg-white/80 backdrop-blur-sm shadow-md sticky top-0 z-50">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <h1 className="text-3xl font-light text-gray-800">
                        <Link to={createPageUrl("Home")}>{t("nav_title")}</Link>
                    </h1>

                    <nav className="flex items-center gap-2">
                        <Button
                            asChild
                            variant={currentPageName === "Home" ? "default" : "ghost"}
                            className="rounded-xl"
                        >
                            <Link to={createPageUrl("Home")} className="flex items-center gap-2">
                                <HomeIcon className="w-5 h-5" />
                                {t("nav_daily")}
                            </Link>
                        </Button>
                        <Button
                            asChild
                            variant={currentPageName === "MonthlyTracker" ? "default" : "ghost"}
                            className="rounded-xl"
                        >
                            <Link to={createPageUrl("MonthlyTracker")} className="flex items-center gap-2">
                                <CalendarDays className="w-5 h-5" />
                                {t("nav_monthly")}
                            </Link>
                        </Button>
                        <Button
                            asChild
                            variant={currentPageName === "FoodLibrary" ? "default" : "ghost"}
                            className="rounded-xl"
                        >
                            <Link to={createPageUrl("FoodLibrary")} className="flex items-center gap-2">
                                <Library className="w-5 h-5" />
                                {t("nav_library")}
                            </Link>
                        </Button>

                        <div className="w-px h-6 bg-gray-200 mx-1" />
                        <LanguageSwitcher />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-xl"
                            onClick={logout}
                            title={t("login_logout")}
                            aria-label={t("login_logout")}
                        >
                            <LogOut className="w-5 h-5" />
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
