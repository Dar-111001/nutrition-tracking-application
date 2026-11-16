import { useEffect, useRef } from "react";
import { NavLink, Outlet, useLocation, useMatches } from "react-router-dom";
import { Home as HomeIcon, CalendarDays, Library, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button, buttonVariants } from "@/components/ui/button";
import Logo from "@/components/brand/Logo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import OfflineBanner from "@/components/OfflineBanner";
import { logout } from "@/api/auth";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
    { to: "/", label: "nav_daily", Icon: HomeIcon },
    { to: "/monthlytracker", label: "nav_monthly", Icon: CalendarDays },
    { to: "/foodlibrary", label: "nav_library", Icon: Library },
];

// "Daily Journal | Dar's Daily Food Journal": a unique, front-loaded tab title per page
function usePageTitle() {
    const { t, i18n } = useTranslation();
    const matches = useMatches();
    const titleKey = matches.findLast((m) => m.handle?.title)?.handle.title;

    useEffect(() => {
        document.title = titleKey ? `${t(titleKey)} | ${t("nav_title")}` : t("nav_title");
    }, [titleKey, t, i18n.resolvedLanguage]);
}

// After a client-side navigation, nothing tells a screen reader that the page
// changed, and focus would stay on the clicked link. Move it to the new page's
// <h1> (PageHeader gives it tabIndex={-1}) and start at the top.
function useFocusOnNavigate(mainRef) {
    const { pathname } = useLocation();
    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        window.scrollTo({ top: 0 });
        mainRef.current?.querySelector("h1")?.focus({ preventScroll: true });
    }, [pathname, mainRef]);
}

export default function Layout() {
    const { t } = useTranslation();
    const mainRef = useRef(null);
    usePageTitle();
    useFocusOnNavigate(mainRef);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            {/* First stop for keyboard users: jump past the header straight to the page */}
            <a
                href="#main"
                className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-[60] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg"
            >
                {t("nav_skip_to_content")}
            </a>

            {/* Header always ltr so the switcher stays on the visual right regardless of language */}
            <header dir="ltr" className="app-header py-4 md:py-6 px-4 md:px-8 bg-white/80 backdrop-blur-sm shadow-md sticky top-0 z-50">
                <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                    {/* The page's own <h1> is the main heading, so the app name is a plain link */}
                    <NavLink to="/" viewTransition className="flex items-center gap-2 text-xl md:text-3xl font-light text-gray-800">
                        <Logo className="w-8 h-8 md:w-9 md:h-9 shrink-0" />
                        <span>{t("nav_title")}</span>
                    </NavLink>

                    <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                        <nav aria-label={t("nav_main")}>
                            <ul className="flex items-center gap-1 md:gap-2">
                                {NAV_ITEMS.map(({ to, label, Icon }) => (
                                    <li key={to}>
                                        {/* NavLink sets aria-current="page" on the active link, and the style keys off it */}
                                        <NavLink
                                            to={to}
                                            end
                                            viewTransition
                                            className={cn(
                                                buttonVariants({ variant: "ghost" }),
                                                "rounded-xl px-3 sm:px-4 aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground",
                                            )}
                                        >
                                            <Icon className="w-5 h-5" aria-hidden="true" />
                                            {/* Icon-only on small phones; the text stays for screen readers */}
                                            <span className="sr-only sm:not-sr-only">{t(label)}</span>
                                        </NavLink>
                                    </li>
                                ))}
                            </ul>
                        </nav>

                        <div className="w-px h-6 bg-gray-200 mx-1" aria-hidden="true" />
                        <LanguageSwitcher />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-xl"
                            onClick={logout}
                            title={t("login_logout")}
                            aria-label={t("login_logout")}
                        >
                            <LogOut className="w-5 h-5" aria-hidden="true" />
                        </Button>
                    </div>
                </div>
            </header>
            <OfflineBanner />
            <main id="main" ref={mainRef} className="app-page p-4 md:p-8">
                <div className="max-w-6xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
