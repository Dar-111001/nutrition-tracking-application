import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import * as auth from "@/api/auth";
import LoginScreen from "@/components/auth/LoginScreen";

// The data collections only allow signed-in users, so the app is shown
// only with a valid session; otherwise the login screen.
export default function AuthGate({ children }) {
    const [isValid, setIsValid] = useState(auth.isLoggedIn());

    useEffect(() => {
        const unsubscribe = auth.onChange(() => setIsValid(auth.isLoggedIn()));
        // A stored token may have been revoked (password change, wiped DB): verify it once.
        // A rejected token signs the user out; a network failure keeps the session.
        auth.refresh();
        return unsubscribe;
    }, []);

    // Cross-fade between the login screen and the app instead of a hard swap
    return (
        <AnimatePresence mode="wait" initial={false}>
            <motion.div
                key={isValid ? "app" : "login"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
                {isValid ? children : <LoginScreen onLogin={auth.login} />}
            </motion.div>
        </AnimatePresence>
    );
}
