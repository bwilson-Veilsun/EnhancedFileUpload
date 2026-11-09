import { FileUploadPlusPreviewProps } from "../typings/FileUploadPlusProps";

export type Platform = "web" | "desktop";

export type Properties = PropertyGroup[];

type PropertyGroup = {
    caption: string;
    propertyGroups?: PropertyGroup[];
    properties?: Property[];
};

type Property = {
    key: string;
    caption: string;
    description?: string;
    objectHeaders?: string[];
    objects?: ObjectProperties[];
    properties?: Properties[];
};

type ObjectProperties = {
    properties: PropertyGroup[];
    captions?: string[];
};

export type Problem = {
    property?: string;
    severity?: "error" | "warning" | "deprecation";
    message: string;
    studioMessage?: string;
    url?: string;
    studioUrl?: string;
};

function hideProperties(groups: Properties, keys: string[]): void {
    for (const group of groups) {
        if (group.properties) {
            group.properties = group.properties.filter(p => !keys.includes(p.key));
        }
        if (group.propertyGroups) {
            hideProperties(group.propertyGroups, keys);
        }
    }
}

export function getProperties(values: FileUploadPlusPreviewProps, defaultProperties: Properties): Properties {
    const hidden: string[] = [values.mode === "image" ? "fileSource" : "imageSource"];
    if (!values.showPreview) {
        hidden.push("previewHeight");
    }
    if (!values.onSave) {
        hidden.push("saveCaption");
    }
    if (!values.showDocumentPreview) {
        hidden.push("documentPreviewHeight", "documentPreviewInitial");
    }
    if (!values.confirmReplace) {
        hidden.push("replaceMessage");
    }
    if (!values.allowClear) {
        hidden.push("confirmClear", "clearMessage", "onClear");
    } else if (!values.confirmClear) {
        hidden.push("clearMessage");
    }
    hideProperties(defaultProperties, hidden);
    return defaultProperties;
}

export function check(values: FileUploadPlusPreviewProps): Problem[] {
    const problems: Problem[] = [];
    if (values.mode === "image" && !values.imageSource) {
        problems.push({
            property: "imageSource",
            message: "Select the System.Image (specialization) to upload into."
        });
    }
    if (values.mode === "file" && !values.fileSource) {
        problems.push({
            property: "fileSource",
            message: "Select the System.FileDocument (specialization) to upload into."
        });
    }
    if (values.mode === "image" && values.imageSource?.type === "static") {
        problems.push({
            property: "imageSource",
            message: "A static image cannot be uploaded to. Use a dynamic image (an object from the data view)."
        });
    }
    if (values.allowClear && !values.onClear) {
        problems.push({
            property: "onClear",
            severity: "warning",
            message:
                "Show clear button needs an On clear action (e.g. a microflow that deletes the file object). Without it the Clear button is hidden."
        });
    }
    if (values.maxFileSizeMb !== null && values.maxFileSizeMb < 0) {
        problems.push({ property: "maxFileSizeMb", message: "Max file size cannot be negative." });
    }
    return problems;
}

export function getPreview(values: FileUploadPlusPreviewProps, isDarkMode: boolean): object {
    const border = isDarkMode ? "#6B707B" : "#B4B6BC";
    const text = isDarkMode ? "#DEDEDE" : "#6B707B";
    return {
        type: "Container",
        borders: true,
        borderRadius: 6,
        borderWidth: 1,
        padding: 12,
        children: [
            {
                type: "Text",
                content: `⬆ File Upload Plus (${values.mode === "image" ? "image" : "file"})`,
                fontColor: text,
                bold: true
            },
            {
                type: "Text",
                content: [
                    values.enableDragDrop ? "drag & drop" : "",
                    values.enablePaste ? "paste" : "",
                    values.enableUrlImport ? "URL" : "",
                    "browse"
                ]
                    .filter(Boolean)
                    .join(" · "),
                fontColor: border,
                fontSize: 8
            }
        ]
    };
}
