import { CSSProperties, ReactElement } from "react";
import { ActionValue, EditableFileValue, FileValue } from "mendix";

import { FileUploadPlusContainerProps } from "../typings/FileUploadPlusProps";
import { FileUploadPlusUI } from "./components/FileUploadPlusUI";

import "./ui/FileUploadPlus.css";

type Props = FileUploadPlusContainerProps & { class?: string; style?: CSSProperties };

function run(action: ActionValue | undefined): void {
    if (action?.canExecute && !action.isExecuting) {
        action.execute();
    }
}

export function FileUploadPlus(props: Props): ReactElement {
    const imageMode = props.mode === "image";
    const source: EditableFileValue<FileValue> | undefined = imageMode ? props.imageSource : props.fileSource;
    const maxMb = Number(props.maxFileSizeMb?.toString() ?? 0);

    return (
        <FileUploadPlusUI
            id={props.id}
            name={props.name}
            className={props.class}
            style={props.style}
            tabIndex={props.tabIndex}
            source={source}
            imageMode={imageMode}
            accept={props.accept || (imageMode ? "image/*" : "")}
            maxBytes={maxMb > 0 ? Math.round(maxMb * 1024 * 1024) : 0}
            showPreview={props.showPreview}
            previewHeight={props.previewHeight}
            showDocumentPreview={props.showDocumentPreview}
            documentPreviewHeight={props.documentPreviewHeight}
            documentPreviewInitial={props.documentPreviewInitial}
            dropzoneText={props.dropzoneText?.value}
            enableDragDrop={props.enableDragDrop}
            enablePaste={props.enablePaste}
            enableUrlImport={props.enableUrlImport}
            confirmReplace={props.confirmReplace}
            replaceMessage={props.replaceMessage?.value}
            allowClear={props.allowClear}
            confirmClear={props.confirmClear}
            clearMessage={props.clearMessage?.value}
            saving={!!props.onFileSelected?.isExecuting || !!props.onSave?.isExecuting}
            canSave={!!props.onSave}
            saveCaption={props.saveCaption?.value}
            onSave={() => run(props.onSave)}
            canClearStored={!!props.onClear}
            onFileSelected={() => run(props.onFileSelected)}
            onUploadSuccess={() => run(props.onUploadSuccess)}
            onUploadFailure={() => run(props.onUploadFailure)}
            onClear={() => run(props.onClear)}
        />
    );
}
