import { ReactElement, useEffect, useState } from "react";
import classNames from "classnames";
import readXlsxFile from "read-excel-file/browser";
import { parseCsv } from "../utils/csv";

/** Rendering more than this is slow and not useful in a preview. */
const MAX_ROWS = 200;
const MAX_COLUMNS = 50;

type Cell = string | number | boolean | Date | null;

interface SheetView {
    name: string;
    rows: Cell[][];
    totalRows: number;
    totalColumns: number;
}

type LoadState =
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; sheets: SheetView[] };

export interface SpreadsheetPreviewProps {
    /** The locally selected file, when previewing before upload. */
    file?: File;
    /** URL of the stored file, when previewing an uploaded file. */
    url?: string;
    name: string;
}

function trim(name: string, data: Cell[][]): SheetView {
    const totalColumns = data.reduce((max, row) => Math.max(max, row.length), 0);
    return {
        name,
        rows: data.slice(0, MAX_ROWS).map(row => row.slice(0, MAX_COLUMNS)),
        totalRows: data.length,
        totalColumns
    };
}

async function loadSheets(input: Blob, name: string): Promise<SheetView[]> {
    if (/\.csv$/i.test(name) || input.type === "text/csv") {
        return [trim(name.replace(/\.csv$/i, ""), parseCsv(await input.text()))];
    }
    const sheets = await readXlsxFile(input);
    return sheets.map(s => trim(s.sheet, s.data as unknown as Cell[][]));
}

/** Excel-style column letters: 0 → A, 25 → Z, 26 → AA. */
function columnName(index: number): string {
    let name = "";
    for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
        name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
    }
    return name;
}

function formatCell(value: Cell): string {
    if (value === null || value === undefined) {
        return "";
    }
    if (value instanceof Date) {
        const hasTime = value.getUTCHours() || value.getUTCMinutes() || value.getUTCSeconds();
        return hasTime ? value.toLocaleString() : value.toLocaleDateString(undefined, { timeZone: "UTC" });
    }
    if (typeof value === "number") {
        return value.toLocaleString(undefined, { maximumFractionDigits: 10 });
    }
    if (typeof value === "boolean") {
        return value ? "TRUE" : "FALSE";
    }
    return value;
}

/**
 * Read-only table preview of .xlsx and .csv files. Cell values are shown as React text, so
 * spreadsheet content can never inject markup.
 */
export function SpreadsheetPreview(props: SpreadsheetPreviewProps): ReactElement {
    const { file, url, name } = props;
    const [state, setState] = useState<LoadState>({ status: "loading" });
    const [active, setActive] = useState(0);
    const [loadedFor, setLoadedFor] = useState<File | string | undefined>(undefined);

    // Reset when the previewed file changes (adjusting state while rendering).
    const source = file ?? url;
    if (source !== loadedFor) {
        setLoadedFor(source);
        setState({ status: "loading" });
        setActive(0);
    }

    useEffect(() => {
        let cancelled = false;
        const controller = new AbortController();
        (async () => {
            try {
                let blob: Blob;
                if (file) {
                    blob = file;
                } else if (url) {
                    const response = await fetch(url, { credentials: "same-origin", signal: controller.signal });
                    if (!response.ok) {
                        throw new Error(`The file could not be loaded (${response.status}).`);
                    }
                    blob = await response.blob();
                } else {
                    return;
                }
                const sheets = await loadSheets(blob, name);
                if (!cancelled) {
                    setState({ status: "ready", sheets });
                }
            } catch (e) {
                if (!cancelled) {
                    setState({
                        status: "error",
                        message:
                            e instanceof Error && e.message.startsWith("The file")
                                ? e.message
                                : "This spreadsheet could not be previewed. It may be damaged, password-protected or in an unsupported format."
                    });
                }
            }
        })();
        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [file, url, name]);

    if (state.status === "loading") {
        return <div className="fup__sheet-message">Loading preview…</div>;
    }
    if (state.status === "error") {
        return <div className="fup__sheet-message fup__sheet-message--error">{state.message}</div>;
    }

    const sheet = state.sheets[Math.min(active, state.sheets.length - 1)];
    const columns = Math.min(sheet?.totalColumns ?? 0, MAX_COLUMNS);
    const truncated = sheet && (sheet.totalRows > MAX_ROWS || sheet.totalColumns > MAX_COLUMNS);

    return (
        <div className="fup__sheet">
            <div className="fup__sheet-scroll">
                {sheet && sheet.totalRows > 0 ? (
                    <table className="fup__sheet-table">
                        <thead>
                            <tr>
                                <th className="fup__sheet-corner" />
                                {Array.from({ length: columns }, (_, c) => (
                                    <th key={c}>{columnName(c)}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sheet.rows.map((row, r) => (
                                <tr key={r}>
                                    <th>{r + 1}</th>
                                    {Array.from({ length: columns }, (_, c) => {
                                        const value = row[c] ?? null;
                                        return (
                                            <td
                                                key={c}
                                                className={classNames({
                                                    "fup__sheet-num": typeof value === "number" || value instanceof Date
                                                })}
                                            >
                                                {formatCell(value)}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="fup__sheet-message">This sheet is empty.</div>
                )}
            </div>
            {truncated ? (
                <div className="fup__sheet-note">
                    Showing the first {Math.min(sheet.totalRows, MAX_ROWS)} of {sheet.totalRows} rows
                    {sheet.totalColumns > MAX_COLUMNS ? ` and ${MAX_COLUMNS} of ${sheet.totalColumns} columns` : ""}.
                    Download the file to see everything.
                </div>
            ) : null}
            {state.sheets.length > 1 ? (
                <div className="fup__sheet-tabs" role="tablist" aria-label="Sheets">
                    {state.sheets.map((s, i) => (
                        <button
                            key={s.name + i}
                            type="button"
                            role="tab"
                            aria-selected={i === active}
                            className={classNames("fup__sheet-tab", { "fup__sheet-tab--active": i === active })}
                            onClick={() => setActive(i)}
                        >
                            {s.name}
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
