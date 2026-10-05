import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import InlineError from "@/components/InlineError";
import LogoSpinner from "@/components/LogoSpinner";

/**
 * In-app replacement for window.confirm() that also runs the action.
 *
 * `onConfirm` must return an API envelope ({ ok, data } / { ok, error }).
 * On success the dialog closes; on failure it stays open and shows the
 * error right under the confirm button, so the user can retry or cancel.
 */
export default function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel,
    onConfirm,
    destructive = true,
}) {
    const { t } = useTranslation();
    const [isWorking, setIsWorking] = useState(false);
    const [error, setError] = useState(null);

    const close = (next) => {
        if (isWorking) return;
        if (!next) setError(null);
        onOpenChange(next);
    };

    const handleConfirm = async () => {
        setIsWorking(true);
        setError(null);
        const result = await onConfirm();
        setIsWorking(false);
        if (result?.ok === false) {
            setError(result.error);
        } else {
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={close}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>
                <DialogFooter className="flex-col gap-2 sm:flex-row">
                    <Button variant="outline" onClick={() => close(false)} disabled={isWorking}>
                        {t("common_cancel")}
                    </Button>
                    <Button
                        variant={destructive ? "destructive" : "default"}
                        onClick={handleConfirm}
                        disabled={isWorking}
                    >
                        {isWorking && <LogoSpinner size="sm" inline className="me-2" />}
                        {confirmLabel || t("common_confirm")}
                    </Button>
                </DialogFooter>
                <InlineError error={error} className="justify-end" />
            </DialogContent>
        </Dialog>
    );
}
