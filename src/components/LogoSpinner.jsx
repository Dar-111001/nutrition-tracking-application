import React from "react";
import { useTranslation } from "react-i18next";
import Logo from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

const SIZES = {
    sm: "w-5 h-5",   // inside a button
    md: "w-10 h-10", // inside a card or dialog
    lg: "w-16 h-16", // full page
};

/**
 * The app's only loading indicator: the logo with its macro ring spinning.
 *
 *   <LogoSpinner />                     // centered block with "Loading..."
 *   <LogoSpinner size="sm" inline />    // inside a button, no visible label
 *   <LogoSpinner size="lg" label={t("monthly_loading")} />
 */
export default function LogoSpinner({ size = "md", inline = false, label, className }) {
    const { t } = useTranslation();
    const text = label ?? t("common_loading");
    const mark = <Logo spinning className={cn(SIZES[size], "shrink-0 motion-reduce:[&_*]:animate-none")} />;

    if (inline) {
        return (
            <span role="status" className={cn("inline-flex items-center", className)}>
                {mark}
                <span className="sr-only">{text}</span>
            </span>
        );
    }

    return (
        <div role="status" className={cn("flex flex-col items-center justify-center gap-3 py-10 text-gray-500", className)}>
            {mark}
            {text && <span className="text-sm">{text}</span>}
        </div>
    );
}
