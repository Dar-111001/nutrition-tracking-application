import React from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { errorText } from "@/lib/errors";

/**
 * Red text placed right under (or beside) the control whose action failed.
 * Renders nothing when there is no error, so it can sit in the layout permanently.
 *
 *   <Button onClick={save}>Save</Button>
 *   <InlineError error={saveError} onRetry={save} />
 *
 * `error` is the envelope's error object, or a plain string for local
 * validation messages ("Enter a name").
 */
export default function InlineError({ error, onRetry, id, className }) {
    const { t } = useTranslation();
    if (!error) return null;

    return (
        <p
            id={id}
            role="alert"
            className={cn("flex items-start gap-1.5 text-sm text-red-600 mt-1.5", className)}
        >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span>
                {errorText(error, t)}
                {onRetry && (
                    <>
                        {" "}
                        <button
                            type="button"
                            onClick={onRetry}
                            className="font-medium underline underline-offset-2 hover:text-red-700"
                        >
                            {t("common_retry")}
                        </button>
                    </>
                )}
            </span>
        </p>
    );
}
