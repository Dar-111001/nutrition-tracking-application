// Dates are stored as "YYYY-MM-DD" strings in the user's local day.
// Never use toISOString() for this: it converts to UTC, so food logged
// just after midnight in Israel would land on the previous day.

const pad = (n) => String(n).padStart(2, "0");

/** "YYYY-MM-DD" for the given moment in the browser's time zone. */
export function toLocalDateString(date = new Date()) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parse "YYYY-MM-DD" as local midnight (new Date("YYYY-MM-DD") would be UTC). */
export function parseLocalDate(dateString) {
    const [y, m, d] = dateString.split("-").map(Number);
    return new Date(y, m - 1, d);
}

/** The last `count` local days, oldest first, ending today. */
export function lastNDays(count, today = new Date()) {
    const days = [];
    for (let i = count - 1; i >= 0; i--) {
        days.push(toLocalDateString(new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)));
    }
    return days;
}
