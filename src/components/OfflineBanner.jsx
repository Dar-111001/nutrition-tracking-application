import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { WifiOff } from "lucide-react";

// Shown under the header while the browser reports no network connection.
export default function OfflineBanner() {
    const { t } = useTranslation();
    const [isOnline, setIsOnline] = useState(() => navigator.onLine);

    useEffect(() => {
        const update = () => setIsOnline(navigator.onLine);
        window.addEventListener("online", update);
        window.addEventListener("offline", update);
        return () => {
            window.removeEventListener("online", update);
            window.removeEventListener("offline", update);
        };
    }, []);

    if (isOnline) return null;
    return (
        <div role="status" className="bg-amber-100 text-amber-900 text-sm px-4 py-2 flex items-center justify-center gap-2">
            <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
            {t("common_offline")}
        </div>
    );
}
