import { useTranslation } from "react-i18next";
import { applyLanguage } from "@/multi-language/i18n";

// Each language is named in its own language (with a matching lang attribute),
// so a screen reader says "עברית" in Hebrew, not "flag: Israel".
const LANGUAGES = [
    { code: "he", flag: "🇮🇱", name: "עברית" },
    { code: "en", flag: "🇺🇸", name: "English" },
    { code: "es", flag: "🇦🇷", name: "Español" },
];

export default function LanguageSwitcher() {
    const { i18n } = useTranslation();

    return (
        <div role="group" aria-label="Language / שפה / Idioma" className="flex items-center gap-1">
            {LANGUAGES.map(({ code, flag, name }) => {
                const active = i18n.resolvedLanguage === code;
                return (
                    <button
                        key={code}
                        type="button"
                        lang={code}
                        aria-pressed={active}
                        onClick={() => applyLanguage(code)}
                        className={`text-xl sm:text-2xl rounded-lg px-1.5 sm:px-2 py-1 transition-all duration-200 ${
                            active
                                ? "bg-gray-200 shadow-inner scale-110"
                                : "opacity-40 hover:opacity-90 hover:bg-gray-100"
                        }`}
                        title={name}
                    >
                        <span aria-hidden="true">{flag}</span>
                        <span className="sr-only">{name}</span>
                    </button>
                );
            })}
        </div>
    );
}
