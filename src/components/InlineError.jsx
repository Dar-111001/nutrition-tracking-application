import { useTranslation } from "react-i18next";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { errorText } from "@/lib/errors";

/**
 * Red text placed right under (or beside) the control whose action failed.
 *
 *   <Button onClick={save} aria-describedby="save-error">Save</Button>
 *   <InlineError id="save-error" error={saveError} onRetry={save} />
 *
 * `error` is the envelope's error object, or a plain string for local
 * validation messages ("Enter a name").
 *
 * The outer element is a live region that is always in the page, even with no
 * error. Screen readers announce text that changes inside a live region, but
 * not reliably a live region that was just inserted, so only the message
 * inside it comes and goes.
 */
export default function InlineError({ error, onRetry, id, className }) {
    const { t } = useTranslation();

    return (
        <div aria-live="polite" aria-atomic="true">
            {error && (
                <p id={id} className={cn("flex items-start gap-1.5 text-sm text-red-600 mt-1.5", className)}>
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
            )}
        </div>
    );
}
