/**
 * Minimal RFC 4180 CSV parser: quoted fields, escaped quotes (""), CRLF/LF line endings.
 * Detects ";" as the delimiter when the first line has more semicolons than commas (European Excel exports).
 */
export function parseCsv(text: string): string[][] {
    const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
    const lineEnd = source.search(/\r?\n/);
    const firstLine = lineEnd === -1 ? source : source.slice(0, lineEnd);
    const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";

    const rows: string[][] = [];
    let row: string[] = [];
    let field = "";
    let quoted = false;

    for (let i = 0; i < source.length; i++) {
        const ch = source[i];
        if (quoted) {
            if (ch === '"') {
                if (source[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    quoted = false;
                }
            } else {
                field += ch;
            }
        } else if (ch === '"') {
            quoted = true;
        } else if (ch === delimiter) {
            row.push(field);
            field = "";
        } else if (ch === "\n" || ch === "\r") {
            if (ch === "\r" && source[i + 1] === "\n") {
                i++;
            }
            row.push(field);
            rows.push(row);
            row = [];
            field = "";
        } else {
            field += ch;
        }
    }
    if (field !== "" || row.length > 0) {
        row.push(field);
        rows.push(row);
    }
    return rows;
}
