import { ReactElement, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import classNames from "classnames";
import { SpreadsheetPreview } from "./SpreadsheetPreview";

export type PreviewSize = "normal" | "minimized" | "expanded";

export interface DocumentPreviewProps {
    kind: "pdf" | "sheet";
    /** URL to display (PDF) or download (spreadsheet). */
    src: string;
    /** The locally selected file, when previewing before upload. */
    file?: File;
    name: string;
    height: number;
    initialSize: "normal" | "minimized";
}

function ExpandIcon(): ReactElement {
    return (
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
            <path
                d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="square"
            />
        </svg>
    );
}

function CollapseIcon(): ReactElement {
    return (
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
            <path
                d="M20 10h-6V4M14 10l7-7M4 14h6v6M10 14l-7 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="square"
            />
        </svg>
    );
}

function ChevronIcon({ up }: { up: boolean }): ReactElement {
    return (
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
            <path
                d={up ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

/**
 * PDF preview in the browser's built-in viewer, with minimize/restore, expand to a full-window
 * overlay (Esc or backdrop click closes it) and a drag handle to resize the normal view.
 */
export function DocumentPreview(props: DocumentPreviewProps): ReactElement {
    const [size, setSize] = useState<PreviewSize>(props.initialSize);
    const expandButton = useRef<HTMLButtonElement>(null);
    const collapseButton = useRef<HTMLButtonElement>(null);
    const wasExpanded = useRef(false);

    useEffect(() => {
        if (size !== "expanded") {
            if (wasExpanded.current) {
                wasExpanded.current = false;
                expandButton.current?.focus();
            }
            return;
        }
        wasExpanded.current = true;
        collapseButton.current?.focus();
        const onKey = (e: KeyboardEvent): void => {
            if (e.key === "Escape") {
                setSize("normal");
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [size]);

    const expanded = size === "expanded";
    const minimized = size === "minimized";
    const frameSrc = `${props.src}#toolbar=0&navpanes=0&view=FitH`;
    const isSheet = props.kind === "sheet";

    const panel = (
        <div
            className="fup__document-panel"
            role={expanded ? "dialog" : undefined}
            aria-modal={expanded ? true : undefined}
            aria-label={expanded ? `Preview of ${props.name}` : undefined}
        >
            <div className="fup__document-header">
                <span className="fup__document-title" title={props.name}>
                    {props.name}
                </span>
                <a
                    className="fup__document-tool fup__document-open"
                    href={props.src}
                    {...(isSheet ? { download: props.name } : { target: "_blank", rel: "noopener noreferrer" })}
                >
                    {isSheet ? "Download" : "Open in new tab"}
                </a>
                {!expanded ? (
                    <button
                        type="button"
                        className="fup__document-tool"
                        onClick={() => setSize(minimized ? "normal" : "minimized")}
                        aria-expanded={!minimized}
                        aria-label={minimized ? "Show preview" : "Minimize preview"}
                        title={minimized ? "Show preview" : "Minimize preview"}
                    >
                        <ChevronIcon up={!minimized} />
                    </button>
                ) : null}
                {expanded ? (
                    <button
                        ref={collapseButton}
                        type="button"
                        className="fup__document-tool"
                        onClick={() => setSize("normal")}
                        aria-label="Exit full view"
                        title="Exit full view (Esc)"
                    >
                        <CollapseIcon />
                    </button>
                ) : (
                    <button
                        ref={expandButton}
                        type="button"
                        className="fup__document-tool"
                        onClick={() => setSize("expanded")}
                        aria-label="Expand preview"
                        title="Expand preview"
                    >
                        <ExpandIcon />
                    </button>
                )}
            </div>
            {minimized ? null : (
                <div className="fup__document-body" style={expanded ? undefined : { height: props.height }}>
                    {isSheet ? (
                        <SpreadsheetPreview
                            file={props.file}
                            url={props.file ? undefined : props.src}
                            name={props.name}
                        />
                    ) : (
                        <iframe className="fup__document-frame" src={frameSrc} title={`Preview of ${props.name}`} />
                    )}
                </div>
            )}
        </div>
    );

    if (!expanded) {
        return <div className={classNames("fup__document", `fup__document--${size}`)}>{panel}</div>;
    }

    // Portal to <body> so a transformed ancestor (e.g. a popup layout) cannot trap the fixed overlay.
    return (
        <div className="fup__document fup__document--placeholder">
            <div className="fup__document-placeholder">Showing {props.name} in full view</div>
            {createPortal(
                <div className="fup fup--portal">
                    <div className="fup__document fup__document--expanded">
                        <div className="fup__document-backdrop" onClick={() => setSize("normal")} />
                        {panel}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
