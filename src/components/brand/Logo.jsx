import { useId } from "react";

// The app mark: a ring split into the three macros (protein, carbs, fat)
// around a leaf. With `spinning`, only the ring turns, so the same mark
// doubles as the loading indicator.
export default function Logo({ className = "w-10 h-10", spinning = false, title }) {
    const id = useId();

    return (
        <svg
            viewBox="0 0 48 48"
            className={className}
            role={title ? "img" : undefined}
            aria-hidden={title ? undefined : true}
            aria-label={title}
        >
            <defs>
                <linearGradient id={`${id}-leaf`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#059669" />
                </linearGradient>
            </defs>

            <g
                className={spinning ? "animate-spin" : undefined}
                style={{ transformOrigin: "24px 24px", animationDuration: "1.1s" }}
                fill="none"
                strokeWidth="5"
                strokeLinecap="round"
            >
                {/* r=19 → circumference ≈ 119.4; three arcs of ~33 with gaps */}
                <circle cx="24" cy="24" r="19" stroke="#f43f5e" strokeDasharray="33 86.4" strokeDashoffset="0" />
                <circle cx="24" cy="24" r="19" stroke="#f59e0b" strokeDasharray="33 86.4" strokeDashoffset="-39.8" />
                <circle cx="24" cy="24" r="19" stroke="#6366f1" strokeDasharray="33 86.4" strokeDashoffset="-79.6" />
            </g>

            <path
                d="M17 30c0-8 5.5-13 14-13 0 8.5-5 14-12.5 14-.6 0-1.1 0-1.5-.1z"
                fill={`url(#${id}-leaf)`}
            />
            <path d="M18.5 29.5c3-3.5 6-5.8 9.5-7.5" stroke="#ecfdf5" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        </svg>
    );
}
