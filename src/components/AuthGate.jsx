import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import * as auth from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LanguageSwitcher from "@/components/LanguageSwitcher";

// The data collections only allow signed-in users, so the app is shown
// only with a valid session; otherwise the login form.
export default function AuthGate({ children }) {
    const [isValid, setIsValid] = useState(auth.isLoggedIn());

    useEffect(() => {
        const unsubscribe = auth.onChange(() => setIsValid(auth.isLoggedIn()));
        // A stored token may have been revoked (password change, wiped DB): verify it once.
        // A rejected token signs the user out; a network failure keeps the session.
        auth.refresh();
        return unsubscribe;
    }, []);

    return isValid ? children : <LoginForm />;
}

function LoginForm() {
    const { t } = useTranslation();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        const result = await auth.login(email.trim(), password);
        if (!result.ok) {
            setError(result.error.code === "unauthorized" ? t("login_error_credentials") : t("login_error_server"));
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white/90 rounded-2xl shadow-lg p-6 space-y-4">
                <div dir="ltr" className="flex justify-end">
                    <LanguageSwitcher />
                </div>
                <div>
                    <h1 className="text-2xl font-semibold text-gray-800">{t("login_title")}</h1>
                    <p className="text-sm text-gray-500 mt-1">{t("login_subtitle")}</p>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="login-email">{t("login_email")}</Label>
                    <Input id="login-email" type="email" autoComplete="username" required
                        value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="login-password">{t("login_password")}</Label>
                    <Input id="login-password" type="password" autoComplete="current-password" required
                        value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
                <Button type="submit" className="w-full rounded-xl" disabled={loading}>
                    {loading ? t("login_loading") : t("login_submit")}
                </Button>
            </form>
        </div>
    );
}
