import {
    ChangeEvent,
    ClipboardEvent,
    CSSProperties,
    DragEvent,
    FormEvent,
    ReactElement,
    useRef,
    useState
} from "react";
import classNames from "classnames";
import { EditableFileValue, FileValue } from "mendix";
import { useUploadState } from "./useUploadState";
import { DocumentPreview } from "./DocumentPreview";
import {
    UrlImportError,
    fetchFileFromUrl,
    firstFileFromClipboard,
    fileExtension,
    fileKind,
    formatBytes,
    inlineFileUrl,
    isImageFile,
    isImageName,
    isPdfFile,
    isPdfName,
    isSpreadsheetName,
    matchesAccept,
    renamePastedFile
} from "../utils/files";

export interface FileUploadPlusUIProps {
    id: string;
    name: string;
    className?: string;
    style?: CSSProperties;
    tabIndex?: number;
    source?: EditableFileValue<FileValue>;
    imageMode: boolean;
    accept: string;
    maxBytes: number;
    showPreview: boolean;
    previewHeight: number;
    showDocumentPreview: boolean;
    documentPreviewHeight: number;
    documentPreviewInitial: "normal" | "minimized";
    dropzoneText?: string;
    enableDragDrop: boolean;
    enablePaste: boolean;
    enableUrlImport: boolean;
    confirmReplace: boolean;
    replaceMessage?: string;
    allowClear: boolean;
    confirmClear: boolean;
    clearMessage?: string;
    /** The "On file selected" action is running (typically Save changes, which performs the upload). */
    saving: boolean;
    /** Whether an "On clear" action is configured; only an action can remove a stored file. */
    canClearStored: boolean;
    /** Whether an "On save click" action is configured; shows the Save button for a pending file. */
    canSave: boolean;
    saveCaption?: string;
    onSave(): void;
    onFileSelected(): void;
    onUploadSuccess(): void;
    onUploadFailure(): void;
    onClear(): void;
}

type Confirmation = { kind: "replace"; file: File } | { kind: "clear" };

export function FileUploadPlusUI(props: FileUploadPlusUIProps): ReactElement {
    const { source, imageMode } = props;
    const inputRef = useRef<HTMLInputElement>(null);
    const dragDepth = useRef(0);
    const [dragging, setDragging] = useState(false);
    const [confirmation, setConfirmation] = useState<Confirmation>();
    const [url, setUrl] = useState("");
    const [fetchingUrl, setFetchingUrl] = useState(false);

    const { state, select, discard, reject, dismiss } = useUploadState(source, props.saving, {
        onSelected: props.onFileSelected,
        onSuccess: props.onUploadSuccess,
        onFailure: props.onUploadFailure
    });

    // An empty FileDocument reports "unavailable"; only an available value is a stored file.
    const stored = source?.status === "available" ? source.value : undefined;
    const hasStoredFile = !!stored?.uri;
    const uploading = state.phase === "pending" && props.saving;
    const view = uploading ? "uploading" : state.phase;
    const busy = uploading || fetchingUrl;
    const disabled = !source || source.readOnly || busy;
    const hasPendingFile = state.phase === "pending" || (state.phase === "error" && state.retryable);

    // ---- Input handling --------------------------------------------------------------------

    function validate(file: File): string | undefined {
        if (!matchesAccept(file, props.accept)) {
            return `"${file.name}" is not an accepted file type (${props.accept}).`;
        }
        if (props.maxBytes > 0 && file.size > props.maxBytes) {
            return `"${file.name}" is ${formatBytes(file.size)}; the maximum is ${formatBytes(props.maxBytes)}.`;
        }
        return undefined;
    }

    function handleFile(file: File | undefined): void {
        if (!file || disabled) {
            return;
        }
        const error = validate(file);
        if (error) {
            reject(error, file);
            return;
        }
        if (hasStoredFile && props.confirmReplace) {
            setConfirmation({ kind: "replace", file });
            return;
        }
        select(file);
    }

    function onInputChange(e: ChangeEvent<HTMLInputElement>): void {
        handleFile(e.target.files?.[0]);
        // Reset so selecting the same file again still fires a change event.
        e.target.value = "";
    }

    function openPicker(): void {
        if (!disabled) {
            inputRef.current?.click();
        }
    }

    function onDragEnter(e: DragEvent): void {
        if (!props.enableDragDrop || disabled || !Array.from(e.dataTransfer.types).includes("Files")) {
            return;
        }
        e.preventDefault();
        dragDepth.current += 1;
        setDragging(true);
    }

    function onDragOver(e: DragEvent): void {
        if (props.enableDragDrop && !disabled && Array.from(e.dataTransfer.types).includes("Files")) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
        }
    }

    function onDragLeave(): void {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) {
            setDragging(false);
        }
    }

    function onDrop(e: DragEvent): void {
        if (!props.enableDragDrop) {
            return;
        }
        e.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        if (e.dataTransfer.files.length > 1) {
            reject("Only one file can be uploaded here. Drop a single file.");
            return;
        }
        handleFile(e.dataTransfer.files[0]);
    }

    function onPaste(e: ClipboardEvent): void {
        if (!props.enablePaste || disabled) {
            return;
        }
        // Text-only clipboard content (e.g. into the URL field) is left to the browser.
        const file = firstFileFromClipboard(e.clipboardData);
        if (!file) {
            return;
        }
        e.preventDefault();
        handleFile(renamePastedFile(file));
    }

    async function onUrlSubmit(e: FormEvent): Promise<void> {
        e.preventDefault();
        if (!url.trim() || disabled) {
            return;
        }
        setFetchingUrl(true);
        try {
            const file = await fetchFileFromUrl(url);
            setUrl("");
            handleFile(file);
        } catch (err) {
            reject(err instanceof UrlImportError ? err.message : "The file could not be downloaded.");
        } finally {
            setFetchingUrl(false);
        }
    }

    // ---- Confirmations -------------------------------------------------------------------------

    function requestClear(): void {
        if (props.confirmClear) {
            setConfirmation({ kind: "clear" });
        } else {
            props.onClear();
        }
    }

    function confirm(): void {
        if (confirmation?.kind === "replace") {
            select(confirmation.file);
        } else if (confirmation?.kind === "clear") {
            props.onClear();
        }
        setConfirmation(undefined);
    }

    // ---- Rendering ---------------------------------------------------------------------------

    const showLocal = !!state.localPreviewUrl && (state.phase === "pending" || state.phase === "success");
    const displayName =
        state.phase === "pending" || state.phase === "success" || (state.phase === "error" && state.localFile)
            ? state.localFile?.name
            : stored?.name ?? (hasStoredFile ? (imageMode ? "Stored image" : "Stored file") : undefined);

    let previewSrc: string | undefined;
    if (props.showPreview) {
        if (showLocal && state.localFile && isImageFile(state.localFile)) {
            previewSrc = state.localPreviewUrl;
        } else if (state.phase !== "pending" && hasStoredFile && (imageMode || isImageName(stored?.name))) {
            previewSrc = stored?.uri;
        }
    }

    // PDFs use the browser's built-in viewer; spreadsheets are parsed and shown as a table.
    let document: { kind: "pdf" | "sheet"; src: string; file?: File } | undefined;
    if (props.showDocumentPreview) {
        const local = showLocal ? state.localFile : undefined;
        if (local && state.localPreviewUrl && isPdfFile(local)) {
            document = { kind: "pdf", src: state.localPreviewUrl };
        } else if (local && state.localPreviewUrl && isSpreadsheetName(local.name)) {
            document = { kind: "sheet", src: state.localPreviewUrl, file: local };
        } else if (state.phase !== "pending" && stored?.uri && isPdfName(stored.name)) {
            document = { kind: "pdf", src: inlineFileUrl(stored.uri) };
        } else if (state.phase !== "pending" && stored?.uri && isSpreadsheetName(stored.name)) {
            document = { kind: "sheet", src: stored.uri };
        }
    }

    const defaultHint = [
        props.enableDragDrop ? "Drag a file here" : undefined,
        props.enablePaste ? "paste (Ctrl+V)" : undefined,
        "or click to browse"
    ]
        .filter(Boolean)
        .join(", ");

    const statusText: Record<string, string | undefined> = {
        pending: "Ready to upload. The file is stored when the page is saved.",
        uploading: "Uploading…",
        success: "Upload complete",
        error: state.message
    };

    return (
        <div
            id={props.id}
            className={classNames("fup", `fup--${view}`, props.className, {
                "fup--dragging": dragging,
                "fup--disabled": disabled && !busy
            })}
            style={props.style}
            onPaste={onPaste}
            onDragEnter={onDragEnter}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
        >
            <input
                ref={inputRef}
                className="fup__input"
                type="file"
                name={props.name}
                accept={props.accept || undefined}
                onChange={onInputChange}
                disabled={disabled}
                tabIndex={-1}
                aria-hidden="true"
                // Inline so theme rules for input[type=file] can't show the native "Choose File" control.
                hidden
                style={{ display: "none" }}
            />

            <div
                className="fup__dropzone"
                role="button"
                tabIndex={disabled ? -1 : props.tabIndex ?? 0}
                aria-disabled={disabled}
                aria-label={hasStoredFile ? `Replace ${displayName ?? "file"}` : "Upload a file"}
                onClick={openPicker}
                onKeyDown={e => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openPicker();
                    }
                }}
            >
                {previewSrc ? (
                    <img
                        className="fup__preview"
                        src={previewSrc}
                        alt={displayName ?? "Preview"}
                        style={{ maxHeight: props.previewHeight }}
                    />
                ) : displayName ? (
                    <span className={`fup__filetype fup__filetype--${fileKind(displayName)}`} aria-hidden="true">
                        {fileExtension(displayName) || "FILE"}
                    </span>
                ) : (
                    <span className="fup__icon" aria-hidden="true">
                        ⬆
                    </span>
                )}
                <div className="fup__body">
                    {displayName ? (
                        <div className="fup__filename" title={displayName}>
                            {displayName}
                            {state.localFile && state.phase !== "idle" ? (
                                <span className="fup__size"> ({formatBytes(state.localFile.size)})</span>
                            ) : null}
                        </div>
                    ) : (
                        <div className="fup__empty">No file selected</div>
                    )}
                    {!disabled ? (
                        <div className="fup__hint">
                            {dragging ? "Drop to upload" : props.dropzoneText || defaultHint}
                        </div>
                    ) : null}
                </div>
            </div>

            {document ? (
                <DocumentPreview
                    key={document.kind}
                    kind={document.kind}
                    src={document.src}
                    file={document.file}
                    name={displayName ?? "Document"}
                    height={props.documentPreviewHeight}
                    initialSize={props.documentPreviewInitial}
                />
            ) : null}

            {uploading ? (
                <div className="fup__progress" role="progressbar" aria-label={statusText.uploading}>
                    <div className="fup__progress-bar" />
                </div>
            ) : null}

            <div className="fup__status" role="status" aria-live="polite">
                {statusText[view] ? (
                    <span className={`fup__badge fup__badge--${view}`}>
                        <span aria-hidden="true">{view === "success" ? "✔ " : view === "error" ? "✖ " : ""}</span>
                        {statusText[view]}
                    </span>
                ) : null}
            </div>

            {confirmation ? (
                <div className="fup__confirm" role="alertdialog" aria-live="assertive">
                    <span className="fup__confirm-text">
                        {confirmation.kind === "replace"
                            ? props.replaceMessage ||
                              `Replace "${displayName ?? "the current file"}" with "${confirmation.file.name}"?`
                            : props.clearMessage || `Remove "${displayName ?? "the current file"}"?`}
                    </span>
                    <button type="button" className="btn btn-primary btn-sm" onClick={confirm} autoFocus>
                        {confirmation.kind === "replace" ? "Replace" : "Remove"}
                    </button>
                    <button type="button" className="btn btn-default btn-sm" onClick={() => setConfirmation(undefined)}>
                        Cancel
                    </button>
                </div>
            ) : null}

            <div className="fup__actions">
                {state.phase === "error" && state.retryable && state.localFile ? (
                    <button type="button" className="btn btn-default btn-sm" onClick={() => select(state.localFile!)}>
                        Retry
                    </button>
                ) : null}
                {state.phase === "error" ? (
                    <button type="button" className="btn btn-link btn-sm" onClick={dismiss}>
                        Dismiss
                    </button>
                ) : null}
                {props.canSave && state.phase === "pending" && !uploading ? (
                    <button
                        type="button"
                        className="btn btn-primary btn-sm fup__save"
                        onClick={props.onSave}
                        disabled={!source || source.readOnly}
                    >
                        {props.saveCaption || "Save"}
                    </button>
                ) : null}
                {hasPendingFile && !uploading ? (
                    <button type="button" className="btn btn-default btn-sm fup__discard" onClick={discard}>
                        Discard
                    </button>
                ) : null}
                {props.allowClear && props.canClearStored && hasStoredFile && !hasPendingFile && !confirmation ? (
                    <button
                        type="button"
                        className="btn btn-default btn-sm fup__clear"
                        onClick={requestClear}
                        disabled={disabled}
                    >
                        Clear
                    </button>
                ) : null}
            </div>

            {props.enableUrlImport ? (
                <form className="fup__url" onSubmit={onUrlSubmit}>
                    <input
                        type="url"
                        className="form-control"
                        placeholder="https://example.com/image.png"
                        aria-label="Load file from URL"
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        disabled={disabled}
                    />
                    <button type="submit" className="btn btn-default" disabled={disabled || !url.trim()}>
                        {fetchingUrl ? "Loading…" : "Load"}
                    </button>
                </form>
            ) : null}
        </div>
    );
}
