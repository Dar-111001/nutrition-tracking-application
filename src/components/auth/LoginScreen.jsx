import { Component, Suspense, lazy, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { AlertCircle, Eye, EyeOff, ArrowRight } from "lucide-react";
import Logo from "@/components/brand/Logo";
import LanguageSwitcher from "@/components/LanguageSwitcher";

// three.js is large; load it after the form is already on screen
const LoginScene = lazy(() => import("./LoginScene"));

const LOGIN_TIMEOUT_MS = 15000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Rejects if the sign-in request hangs, so the button never spins forever
function withTimeout(promise, ms) {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(Object.assign(new Error("timeout"), { name: "TimeoutError" })), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Maps any failure (thrown error or a { ok: false } result) to a translation key
function loginErrorKey(err) {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return "login_error_offline";
    if (err?.name === "TimeoutError") return "login_error_timeout";
    const status = err?.status ?? err?.error?.status;
    if (status === 400 || status === 401) return "login_error_credentials";
    if (status === 429) return "login_error_rate_limited";
    return "login_error_server";
}

// If WebGL is unavailable the login still works; only the 3D backdrop is skipped
class SceneBoundary extends Component {
    state = { failed: false };
    static getDerivedStateFromError() {
        return { failed: true };
    }
    render() {
        return this.state.failed ? null : this.props.children;
    }
}

/**
 * Full-screen sign-in page.
 * @param {(email: string, password: string) => Promise<unknown>} onLogin
 *   Performs the sign-in. It may throw, or resolve to { ok: false, error } on failure.
 */
export default function LoginScreen({ onLogin }) {
    const { t } = useTranslation();
    const reduceMotion = useReducedMotion();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const [submitError, setSubmitError] = useState("");
    const [loading, setLoading] = useState(false);
    const [attempt, setAttempt] = useState(0); // bumps on each failure to replay the shake

    const validate = () => {
        const errors = {};
        if (!EMAIL_PATTERN.test(email.trim())) errors.email = t("login_error_email_invalid");
        if (!password) errors.password = t("login_error_password_required");
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;
        setSubmitError("");
        if (!validate()) {
            setAttempt((n) => n + 1);
            return;
        }

        setLoading(true);
        try {
            const result = await withTimeout(Promise.resolve(onLogin(email.trim(), password)), LOGIN_TIMEOUT_MS);
            if (result && result.ok === false) throw result.error ?? result;
            // On success the session changes and AuthGate swaps this screen out
        } catch (err) {
            setSubmitError(t(loginErrorKey(err)));
            setAttempt((n) => n + 1);
        } finally {
            setLoading(false);
        }
    };

    const clearFieldError = (name) => {
        if (fieldErrors[name]) setFieldErrors((errors) => ({ ...errors, [name]: undefined }));
        if (submitError) setSubmitError("");
    };

    const reveal = (delay) =>
        reduceMotion
            ? {}
            : {
                  initial: { opacity: 0, y: 16 },
                  animate: { opacity: 1, y: 0 },
                  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
              };

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#0b1020] text-white">
            {/* Ambient glows (also the fallback when WebGL isn't available) */}
            <div aria-hidden className="pointer-events-none absolute -top-40 -start-40 h-[32rem] w-[32rem] rounded-full bg-indigo-600/30 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-48 end-0 h-[28rem] w-[28rem] rounded-full bg-fuchsia-600/20 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute top-1/3 start-1/3 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

            {/* 3D: full-screen backdrop on phones, the hero half on desktop */}
            <div aria-hidden className="absolute inset-0 opacity-50 lg:opacity-100 lg:end-1/2">
                <SceneBoundary>
                    <Suspense fallback={null}>
                        <LoginScene still={reduceMotion} />
                    </Suspense>
                </SceneBoundary>
            </div>

            <div dir="ltr" className="absolute top-4 end-4 z-20 rounded-xl bg-white/10 backdrop-blur-md ring-1 ring-white/15">
                <LanguageSwitcher />
            </div>

            <div className="relative z-10 grid min-h-screen lg:grid-cols-2">
                {/* Hero copy, desktop only */}
                <div className="hidden lg:flex flex-col justify-end p-12 xl:p-16 pointer-events-none">
                    <motion.h2 {...reveal(0.2)} className="text-4xl xl:text-5xl font-semibold tracking-tight leading-tight max-w-md">
                        {t("login_hero_title")}
                    </motion.h2>
                    <motion.p {...reveal(0.3)} className="mt-4 text-lg text-indigo-100/70 max-w-md">
                        {t("login_hero_text")}
                    </motion.p>
                    <motion.ul {...reveal(0.4)} className="mt-8 flex flex-wrap gap-2">
                        {[
                            ["#f43f5e", "login_feature_daily"],
                            ["#f59e0b", "login_feature_monthly"],
                            ["#10b981", "login_feature_library"],
                        ].map(([color, key]) => (
                            <li key={key} className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm text-indigo-50 ring-1 ring-white/15 backdrop-blur-md">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                                {t(key)}
                            </li>
                        ))}
                    </motion.ul>
                </div>

                {/* Sign-in card */}
                <div className="flex items-center justify-center px-4 py-20 sm:px-8">
                    <motion.div
                        key={attempt}
                        animate={attempt > 0 && !reduceMotion ? { x: [0, -10, 10, -6, 6, 0] } : undefined}
                        transition={{ duration: 0.4 }}
                        className="w-full max-w-md"
                    >
                        <motion.form
                            {...reveal(0.1)}
                            onSubmit={handleSubmit}
                            noValidate
                            className="rounded-3xl bg-white/[0.07] p-8 sm:p-10 shadow-2xl shadow-black/40 ring-1 ring-white/15 backdrop-blur-2xl"
                        >
                            <div className="flex items-center gap-3">
                                <Logo className="h-12 w-12" />
                                <span className="text-sm font-medium text-indigo-100/80">{t("nav_title")}</span>
                            </div>

                            <h1 className="mt-8 text-3xl font-semibold tracking-tight">{t("login_title")}</h1>
                            <p className="mt-2 text-sm text-indigo-100/60">{t("login_subtitle")}</p>

                            <div className="mt-8 space-y-5">
                                <Field
                                    id="login-email"
                                    label={t("login_email")}
                                    error={fieldErrors.email}
                                    input={{
                                        type: "email",
                                        autoComplete: "username",
                                        inputMode: "email",
                                        autoFocus: true,
                                        value: email,
                                        onChange: (e) => {
                                            setEmail(e.target.value);
                                            clearFieldError("email");
                                        },
                                    }}
                                />
                                <Field
                                    id="login-password"
                                    label={t("login_password")}
                                    error={fieldErrors.password}
                                    input={{
                                        type: showPassword ? "text" : "password",
                                        autoComplete: "current-password",
                                        value: password,
                                        onChange: (e) => {
                                            setPassword(e.target.value);
                                            clearFieldError("password");
                                        },
                                    }}
                                    trailing={
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((v) => !v)}
                                            className="rounded-lg p-1.5 text-indigo-100/60 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                                            aria-label={t(showPassword ? "login_hide_password" : "login_show_password")}
                                            title={t(showPassword ? "login_hide_password" : "login_show_password")}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    }
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                aria-describedby={submitError ? "login-submit-error" : undefined}
                                className="group mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-4 py-3 font-medium text-white shadow-lg shadow-indigo-900/40 transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-wait disabled:opacity-80"
                            >
                                {loading ? (
                                    <>
                                        <Logo className="h-5 w-5" spinning />
                                        {t("login_loading")}
                                    </>
                                ) : (
                                    <>
                                        {t("login_submit")}
                                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
                                    </>
                                )}
                            </button>

                            {/* Request errors sit right under the button that triggered them */}
                            <div aria-live="polite">
                                {submitError && (
                                    <p id="login-submit-error" role="alert" className="mt-3 flex items-start gap-2 text-sm text-red-400">
                                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                        {submitError}
                                    </p>
                                )}
                            </div>
                        </motion.form>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

function Field({ id, label, error, input, trailing }) {
    const errorId = `${id}-error`;
    return (
        <div>
            <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-indigo-50/90">
                {label}
            </label>
            <div
                className={`flex items-center rounded-xl bg-white/[0.06] ring-1 transition focus-within:bg-white/10 focus-within:ring-2 ${
                    error ? "ring-red-400/80 focus-within:ring-red-400" : "ring-white/15 focus-within:ring-indigo-400"
                }`}
            >
                <input
                    id={id}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
                    className="w-full bg-transparent px-4 py-3 text-white placeholder:text-indigo-100/30 focus:outline-none"
                    {...input}
                />
                {trailing && <div className="pe-2">{trailing}</div>}
            </div>
            {error && (
                <p id={errorId} className="mt-1.5 text-sm text-red-400">
                    {error}
                </p>
            )}
        </div>
    );
}
