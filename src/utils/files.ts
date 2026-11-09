const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|bmp|webp|svg|avif|ico)$/i;

export function isImageName(name: string | undefined): boolean {
    return !!name && IMAGE_EXTENSIONS.test(name);
}

export function isImageFile(file: File): boolean {
    return file.type.startsWith("image/") || isImageName(file.name);
}

export function isPdfName(name: string | undefined): boolean {
    return !!name && /\.pdf$/i.test(name);
}

export function isPdfFile(file: File): boolean {
    return file.type === "application/pdf" || isPdfName(file.name);
}

const SPREADSHEET_EXTENSIONS = /\.(xlsx|xlsm|csv)$/i;

/** Spreadsheets the preview can read: .xlsx/.xlsm (Office Open XML) and .csv. */
export function isSpreadsheetName(name: string | undefined): boolean {
    return !!name && SPREADSHEET_EXTENSIONS.test(name);
}

/** Upper-case extension for the file-type badge, e.g. "PDF"; empty when there is none. */
export function fileExtension(name: string): string {
    const match = /\.([a-z0-9]{1,5})$/i.exec(name);
    return match ? match[1].toUpperCase() : "";
}

/** Colour group for the file-type badge. */
export function fileKind(name: string): "pdf" | "image" | "doc" | "sheet" | "slides" | "archive" | "other" {
    const ext = fileExtension(name).toLowerCase();
    if (ext === "pdf") {
        return "pdf";
    }
    if (isImageName(name)) {
        return "image";
    }
    if (["doc", "docx", "odt", "rtf", "txt", "md"].includes(ext)) {
        return "doc";
    }
    if (["xls", "xlsx", "ods", "csv"].includes(ext)) {
        return "sheet";
    }
    if (["ppt", "pptx", "odp"].includes(ext)) {
        return "slides";
    }
    if (["zip", "7z", "rar", "gz", "tar"].includes(ext)) {
        return "archive";
    }
    return "other";
}

/**
 * Mendix file URLs download as an attachment by default; `target=inline` makes the runtime serve the
 * file for display (the platform's own "show in browser" option does the same).
 */
export function inlineFileUrl(uri: string): string {
    if (/[?&]target=/.test(uri)) {
        return uri;
    }
    return `${uri}${uri.includes("?") ? "&" : "?"}target=inline`;
}

/** Matches a file against an HTML `accept` string (".pdf", "image/*", "application/json", ...). */
export function matchesAccept(file: File, accept: string): boolean {
    const tokens = accept
        .split(",")
        .map(t => t.trim().toLowerCase())
        .filter(Boolean);
    if (tokens.length === 0) {
        return true;
    }
    const name = file.name.toLowerCase();
    const type = file.type.toLowerCase();
    return tokens.some(token => {
        if (token.startsWith(".")) {
            return name.endsWith(token);
        }
        if (token.endsWith("/*")) {
            return type.startsWith(token.slice(0, -1));
        }
        return type === token;
    });
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MIME_EXTENSIONS: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "image/bmp": "bmp",
    "application/pdf": "pdf"
};

function extensionFor(type: string): string {
    return MIME_EXTENSIONS[type] ?? type.split("/")[1]?.split("+")[0] ?? "bin";
}

/** Clipboard screenshots arrive as "image.png"; give them a unique, recognisable name. */
export function renamePastedFile(file: File): File {
    const generic = !file.name || /^image\.\w+$/i.test(file.name);
    if (!generic) {
        return file;
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    return new File([file], `pasted-${stamp}.${extensionFor(file.type)}`, { type: file.type });
}

export function firstFileFromClipboard(data: DataTransfer | null): File | undefined {
    if (!data) {
        return undefined;
    }
    if (data.files.length > 0) {
        return data.files[0];
    }
    for (const item of Array.from(data.items)) {
        if (item.kind === "file") {
            const file = item.getAsFile();
            if (file) {
                return file;
            }
        }
    }
    return undefined;
}

export class UrlImportError extends Error {}

/**
 * Downloads a URL in the browser and wraps it in a File. Only works when the remote server sends
 * CORS headers that allow this origin; otherwise the browser blocks the response (see README).
 */
export async function fetchFileFromUrl(rawUrl: string, signal?: AbortSignal): Promise<File> {
    let url: URL;
    try {
        url = new URL(rawUrl.trim(), window.location.href);
    } catch {
        throw new UrlImportError("That is not a valid URL.");
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
        throw new UrlImportError("Only http(s) URLs are supported.");
    }
    let response: Response;
    try {
        response = await fetch(url.href, { mode: "cors", credentials: "omit", signal });
    } catch (e) {
        if ((e as Error).name === "AbortError") {
            throw e;
        }
        throw new UrlImportError(
            "The file could not be downloaded. The site probably does not allow cross-origin downloads (CORS). Download it and upload it instead."
        );
    }
    if (!response.ok) {
        throw new UrlImportError(`The server responded with ${response.status} ${response.statusText}.`);
    }
    const blob = await response.blob();
    const type = blob.type || response.headers.get("content-type")?.split(";")[0] || "application/octet-stream";
    const lastSegment = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() ?? "");
    const name = lastSegment && lastSegment.includes(".") ? lastSegment : `download.${extensionFor(type)}`;
    return new File([blob], name, { type });
}
