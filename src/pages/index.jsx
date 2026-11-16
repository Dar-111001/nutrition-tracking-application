import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import Layout from "./Layout";
import Home from "./Home";
import FoodLibrary from "./FoodLibrary";
import MonthlyTracker from "./MonthlyTracker";

// One route per page, all inside the shared Layout (header + <Outlet />).
// A data router (createBrowserRouter) is what lets <Link viewTransition>
// animate navigations with the browser's View Transitions API.
// `handle.title` is the translation key for the browser tab title.
const router = createBrowserRouter([
    {
        element: <Layout />,
        children: [
            { path: "/", element: <Home />, handle: { title: "nav_daily" } },
            { path: "/monthlytracker", element: <MonthlyTracker />, handle: { title: "nav_monthly" } },
            { path: "/foodlibrary", element: <FoodLibrary />, handle: { title: "nav_library" } },
            // Unknown paths (and the old /Home) go to the daily journal instead of a blank page
            { path: "*", element: <Navigate to="/" replace /> },
        ],
    },
]);

export default function Pages() {
    return <RouterProvider router={router} />;
}
