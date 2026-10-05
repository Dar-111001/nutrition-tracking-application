import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { pb } from "@/api/pocketbaseClient";
import LoginScreen from "@/components/auth/LoginScreen";

const signIn = (email, password) => pb.collection("users").authWithPassword(email, password);

// The data collections only allow signed-in users, so the app is shown
// only with a valid session; otherwise the login screen.
export default function AuthGate({ children }) {
    const [isValid, setIsValid] = useState(pb.authStore.isValid);

    useEffect(() => {
        const unsubscribe = pb.authStore.onChange(() => setIsValid(pb.authStore.isValid));
        // A stored token may have been revoked (password change, wiped DB): verify it once
        if (pb.authStore.isValid) {
            pb.collection("users").authRefresh().catch((err) => {
                if (err?.status === 401 || err?.status === 403 || err?.status === 404) pb.authStore.clear();
            });
        }
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
                {isValid ? children : <LoginScreen onLogin={signIn} />}
            </motion.div>
        </AnimatePresence>
    );
}
