import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { EditableFileValue, FileValue } from "mendix";

/**
 * idle     nothing selected in this session
 * pending  file handed to the platform with setValue; it is sent to the server when the page's
 *          form is submitted (Save changes), which `saving` reports while it runs
 * success  the stored file changed after a save
 * error    rejected (client-side or platform validation) or the save did not store the file
 */
export type Phase = "idle" | "pending" | "success" | "error";

type Outcome = "selected" | "success" | "failure";

export interface UploadState {
    phase: Phase;
    /** File picked in this session (kept for the local preview and retry). */
    localFile?: File;
    /** Object URL for the local preview of `localFile`. */
    localPreviewUrl?: string;
    message?: string;
    /** True when the same file can be sent again (the save did not store it). */
    retryable?: boolean;
    /** Uri of the stored file when the file was selected, to detect that the upload happened. */
    startUri?: string;
    /** The save action was seen running for this selection. */
    sawSaving?: boolean;
    /** Increments per selection; keys timers and outcomes. */
    attempt: number;
    /** Last outcome; the event effect fires the matching action once per attempt. */
    outcome?: { kind: Outcome; attempt: number };
    /** State to return to when a client-side rejection is dismissed (e.g. a still-pending selection). */
    resume?: UploadState;
}

interface Callbacks {
    onSelected(): void;
    onSuccess(): void;
    onFailure(): void;
}

/** After the save action finishes, how long to wait for the new file uri before reporting failure. */
const SAVE_SETTLE_MS = 8_000;

type Source = EditableFileValue<FileValue> | undefined;

function finish(state: UploadState, phase: Phase, kind: Outcome, extra: Partial<UploadState> = {}): UploadState {
    return { ...state, phase, message: undefined, ...extra, outcome: { kind, attempt: state.attempt } };
}

/**
 * Works out the next state from the current props.
 *
 * In Mendix 11.x `setValue(file)` only stores the selection; the platform uploads it in the form's
 * submit step (Save changes). A FileDocument without contents reports status "unavailable", so that
 * is not an error. The upload is detected when the value becomes available with a new uri.
 */
function derive(state: UploadState, source: Source, saving: boolean): UploadState {
    if (state.phase !== "pending") {
        return state;
    }
    if (source?.validation) {
        return finish(state, "error", "failure", { message: source.validation, retryable: false });
    }
    const uri = source?.status === "available" ? source.value?.uri : undefined;
    if (uri && uri !== state.startUri) {
        return finish(state, "success", "success");
    }
    if (saving && !state.sawSaving) {
        return { ...state, sawSaving: true };
    }
    return state;
}

export interface UploadControls {
    state: UploadState;
    select(file: File): void;
    discard(): void;
    reject(message: string, file?: File): void;
    dismiss(): void;
}

export function useUploadState(source: Source, saving: boolean, callbacks: Callbacks): UploadControls {
    const [state, setState] = useState<UploadState>({ phase: "idle", attempt: 0 });

    // Adjust state while rendering when the value props move on (React's recommended alternative
    // to setState in an effect). `derive` returns the same object when nothing changes.
    const next = derive(state, source, saving);
    if (next !== state) {
        setState(next);
    }

    const callbacksRef = useRef(callbacks);
    useLayoutEffect(() => {
        callbacksRef.current = callbacks;
    });

    // Fire the configured action once per outcome.
    const outcomeKey = state.outcome ? `${state.outcome.kind}:${state.outcome.attempt}` : undefined;
    useEffect(() => {
        if (!outcomeKey) {
            return;
        }
        const kind = outcomeKey.split(":")[0] as Outcome;
        if (kind === "selected") {
            callbacksRef.current.onSelected();
        } else if (kind === "success") {
            callbacksRef.current.onSuccess();
        } else {
            callbacksRef.current.onFailure();
        }
    }, [outcomeKey]);

    // The save ran but the stored file did not change: the page save failed or did not include this object.
    const saveFinished = state.phase === "pending" && !!state.sawSaving && !saving;
    useEffect(() => {
        if (!saveFinished) {
            return;
        }
        const attempt = state.attempt;
        const timer = window.setTimeout(
            () =>
                setState(s =>
                    s.attempt !== attempt || s.phase !== "pending"
                        ? s
                        : finish(s, "error", "failure", {
                              message: "The file was not uploaded. Check the page for validation errors and try again.",
                              retryable: true
                          })
                ),
            SAVE_SETTLE_MS
        );
        return () => window.clearTimeout(timer);
    }, [saveFinished, state.attempt]);

    // Revoke object URLs when they are replaced or the widget unmounts.
    useEffect(() => {
        const url = state.localPreviewUrl;
        return () => {
            if (url) {
                URL.revokeObjectURL(url);
            }
        };
    }, [state.localPreviewUrl]);

    const select = useCallback(
        (file: File) => {
            if (!source) {
                return;
            }
            source.setValue(file);
            setState(s => {
                const attempt = s.attempt + 1;
                return {
                    phase: "pending",
                    localFile: file,
                    localPreviewUrl:
                        s.localFile === file && s.localPreviewUrl ? s.localPreviewUrl : URL.createObjectURL(file),
                    startUri: source.status === "available" ? source.value?.uri : undefined,
                    sawSaving: false,
                    attempt,
                    outcome: { kind: "selected", attempt }
                };
            });
        },
        [source]
    );

    /** Drops a selection that has not been uploaded yet. Stored contents are not affected. */
    const discard = useCallback(() => {
        source?.setValue(undefined);
        setState(s => ({ phase: "idle", attempt: s.attempt + 1, outcome: s.outcome }));
    }, [source]);

    /** Show a client-side rejection (wrong type, too large, URL import failed) without touching the value. */
    const reject = useCallback((message: string, file?: File) => {
        setState(s => {
            const attempt = s.attempt + 1;
            return {
                phase: "error",
                message,
                retryable: false,
                localFile: file ?? s.localFile,
                localPreviewUrl: file ? undefined : s.localPreviewUrl,
                attempt,
                outcome: { kind: "failure", attempt },
                resume: s.phase === "pending" ? s : s.resume
            };
        });
    }, []);

    const dismiss = useCallback(() => {
        if (source?.validation) {
            // The platform still holds the rejected file; drop it so the page can be saved again.
            source.setValue(undefined);
        }
        setState(s =>
            s.resume && !source?.validation
                ? { ...s.resume, attempt: s.attempt, outcome: s.outcome }
                : { phase: "idle", attempt: s.attempt, outcome: s.outcome }
        );
    }, [source]);

    return { state, select, discard, reject, dismiss };
}
