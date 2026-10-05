// Error codes from the API envelope { ok: false, error: { code, message, details } }
// (see src/api/client.js for the list).
// Codes the user can act on get a translated sentence; for the rest the
// server's own message is more useful, so it is shown when there is one.
const TRANSLATED_CODES = ["network", "timeout", "rate_limited", "unauthorized", "server"];

/** Turn an envelope error into one sentence for the user. */
export function errorText(error, t) {
    if (!error) return "";
    if (typeof error === "string") return error;
    const { code, message } = error;
    if (TRANSLATED_CODES.includes(code)) return t(`error_${code}`);
    if (message) return message;
    return t(`error_${code}`, { defaultValue: t("error_unknown") });
}
