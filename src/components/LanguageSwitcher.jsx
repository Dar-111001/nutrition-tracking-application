import React from "react";
import { useTranslation } from "react-i18next";

const LANGUAGES = [
    { code: "he", flag: "🇮🇱" },
    { code: "en", flag: "🇺🇸" },
    { code: "es", flag: "🇦🇷" },
];

export default function LanguageSwitcher() {
    const { i18n } = useTranslation();

    const changeLanguage = (code) => {
        i18n.changeLanguage(code);
        document.documentElement.dir  = code === "he" ? "rtl" : "ltr";
        document.documentElement.lang = code;
        localStorage.setItem("lang", code);
    };

    return (
        <div className="flex items-center gap-1">
            {LANGUAGES.map(({ code, flag }) => (
                <button
                    key={code}
                    onClick={() => changeLanguage(code)}
                    className={`text-2xl rounded-lg px-2 py-1 transition-all duration-200 ${
                        i18n.language === code
                            ? "bg-gray-200 shadow-inner scale-110"
                            : "opacity-40 hover:opacity-90 hover:bg-gray-100"
                    }`}
                    title={code.toUpperCase()}
                >
                    {flag}
                </button>
            ))}
        </div>
    );
}
