import { ReactElement } from "react";
import { FileUploadPlusPreviewProps } from "../typings/FileUploadPlusProps";

export function preview(props: FileUploadPlusPreviewProps): ReactElement {
    const methods = [
        props.enableDragDrop ? "Drag a file here" : undefined,
        props.enablePaste ? "paste (Ctrl+V)" : undefined,
        "or click to browse"
    ]
        .filter(Boolean)
        .join(", ");
    return (
        <div className="fup fup--idle">
            <div className="fup__dropzone">
                <span className="fup__icon">⬆</span>
                <div className="fup__body">
                    <div className="fup__filename">[{props.mode === "image" ? "Image" : "File"} name]</div>
                    <div className="fup__hint">{props.dropzoneText || methods}</div>
                </div>
            </div>
            {props.enableUrlImport ? (
                <div className="fup__url">
                    <input className="form-control" placeholder="https://example.com/image.png" disabled />
                </div>
            ) : null}
        </div>
    );
}

export function getPreviewCss(): string {
    return require("./ui/FileUploadPlus.css");
}
