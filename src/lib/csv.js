// Food library CSV import: parsing and per-row validation.
// Expected header: name, protein_per_100g, carbs_per_100g, fat_per_100g (any order).

export const REQUIRED_COLUMNS = ["name", "protein_per_100g", "carbs_per_100g", "fat_per_100g"];
const NUMBER_COLUMNS = REQUIRED_COLUMNS.slice(1);

/**
 * Split CSV text into rows of fields (RFC 4180): quoted fields may contain
 * commas, newlines and "" for a literal quote. Strips a UTF-8 BOM.
 */
export function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    const src = text.replace(/^\uFEFF/, "");

    for (let i = 0; i < src.length; i++) {
        const ch = src[i];
        if (inQuotes) {
            if (ch === '"') {
                if (src[i + 1] === '"') { field += '"'; i++; }
                else inQuotes = false;
            } else {
                field += ch;
            }
        } else if (ch === '"') {
            inQuotes = true;
        } else if (ch === ",") {
            row.push(field); field = "";
        } else if (ch === "\n" || ch === "\r") {
            if (ch === "\r" && src[i + 1] === "\n") i++;
            row.push(field); rows.push(row);
            row = []; field = "";
        } else {
            field += ch;
        }
    }
    if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
    return rows;
}

/** Accepts "12", "12.5" and "12,5"; returns NaN for anything else. */
function toNumber(raw) {
    const value = (raw ?? "").trim().replace(",", ".");
    if (!/^\d+(\.\d+)?$/.test(value)) return NaN;
    return Number(value);
}

/**
 * Turn CSV text into food items plus a list of rows that were skipped.
 *
 * Returns { missingColumns, items, invalid }:
 *  - missingColumns: required header names not found (import should stop)
 *  - items:   [{ line, name, protein_per_100g, carbs_per_100g, fat_per_100g }]
 *  - invalid: [{ line, reason, column? }]   line numbers are 1-based, header = 1
 */
export function parseFoodItemsCsv(text) {
    const rows = parseCsv(text);
    const header = (rows[0] || []).map((h) => h.trim().toLowerCase());
    const missingColumns = REQUIRED_COLUMNS.filter((c) => !header.includes(c));
    if (missingColumns.length > 0) return { missingColumns, items: [], invalid: [] };

    const index = Object.fromEntries(REQUIRED_COLUMNS.map((c) => [c, header.indexOf(c)]));
    const items = [];
    const invalid = [];

    rows.slice(1).forEach((cols, i) => {
        const line = i + 2;
        if (cols.every((c) => c.trim() === "")) return; // blank line

        const name = (cols[index.name] || "").trim();
        if (!name) {
            invalid.push({ line, reason: "missing_name" });
            return;
        }

        const item = { line, name };
        for (const column of NUMBER_COLUMNS) {
            const value = toNumber(cols[index[column]]);
            if (Number.isNaN(value)) {
                invalid.push({ line, reason: "invalid_number", column });
                return;
            }
            item[column] = value;
        }
        items.push(item);
    });

    return { missingColumns: [], items, invalid };
}
