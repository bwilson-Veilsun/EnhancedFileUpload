/**
 * This file was generated from FileUploadPlus.xml
 * WARNING: All changes made to this file will be overwritten
 * @author Mendix Widgets Framework Team
 */
import { ActionValue, DynamicValue, EditableFileValue, EditableImageValue, WebImage } from "mendix";
import { Big } from "big.js";

export type ModeEnum = "image" | "file";

export type DocumentPreviewInitialEnum = "normal" | "minimized";

export interface FileUploadPlusContainerProps {
    name: string;
    tabIndex?: number;
    id: string;
    mode: ModeEnum;
    imageSource?: EditableImageValue<WebImage>;
    fileSource?: EditableFileValue;
    accept: string;
    maxFileSizeMb: Big;
    showPreview: boolean;
    previewHeight: number;
    showDocumentPreview: boolean;
    documentPreviewHeight: number;
    documentPreviewInitial: DocumentPreviewInitialEnum;
    dropzoneText?: DynamicValue<string>;
    enableDragDrop: boolean;
    enablePaste: boolean;
    enableUrlImport: boolean;
    confirmReplace: boolean;
    replaceMessage?: DynamicValue<string>;
    allowClear: boolean;
    confirmClear: boolean;
    clearMessage?: DynamicValue<string>;
    onFileSelected?: ActionValue;
    onSave?: ActionValue;
    saveCaption?: DynamicValue<string>;
    onUploadSuccess?: ActionValue;
    onUploadFailure?: ActionValue;
    onClear?: ActionValue;
}

export interface FileUploadPlusPreviewProps {
    readOnly: boolean;
    renderMode: "design" | "xray" | "structure";
    translate: (text: string) => string;
    mode: ModeEnum;
    imageSource: { type: "static"; imageUrl: string; } | { type: "dynamic"; entity: string; } | null;
    fileSource: string;
    accept: string;
    maxFileSizeMb: number | null;
    showPreview: boolean;
    previewHeight: number | null;
    showDocumentPreview: boolean;
    documentPreviewHeight: number | null;
    documentPreviewInitial: DocumentPreviewInitialEnum;
    dropzoneText: string;
    enableDragDrop: boolean;
    enablePaste: boolean;
    enableUrlImport: boolean;
    confirmReplace: boolean;
    replaceMessage: string;
    allowClear: boolean;
    confirmClear: boolean;
    clearMessage: string;
    onFileSelected: {} | null;
    onSave: {} | null;
    saveCaption: string;
    onUploadSuccess: {} | null;
    onUploadFailure: {} | null;
    onClear: {} | null;
}
