# File Upload Plus

A Mendix pluggable web widget by VeilSun that replaces the native file/image uploader. It shows the stored
file name, previews a newly picked image immediately, gives the upload clear in-progress, success and
failure states, and adds drag-and-drop, clipboard paste and (optional) load-from-URL.

- Widget id: `veilsun.fileuploadplus.FileUploadPlus`
- Package: `veilsun.FileUploadPlus.mpk` (built to `dist/<version>/`)
- Requires Mendix **11.8+** (uses `allowUpload` on `file`/`image` properties). Built and checked against 11.14.
- Toolbox category: **Input elements → File Upload Plus**

## Placing it on a page

1. In Studio Pro, press **F4** (or *App → Synchronize App Directory*) so the new `.mpk` is picked up.
2. Add a **data view** whose object is the file to upload into:
   - Image mode: an entity that is (a specialization of) `System.Image`.
   - File mode: an entity that is (a specialization of) `System.FileDocument`.

   Usually this is a page that receives the object as a page parameter, or a data view that
   follows an association from another object (e.g. `Noodle → Noodle_Photo → Photo`).
3. Drag **File Upload Plus** into the data view.
4. On the **General** tab, set *Upload type* and select the object in **Image** or **File**. Pick the
   data view object or follow an association. A static image cannot be uploaded to, and Studio Pro
   shows an error if you pick one.
5. Optionally configure the restrictions, input methods, replace/clear behaviour and events (see below).
6. **Decide when the file is uploaded.** Mendix sends the file to the server when the page is saved
   (see [How uploading works](#how-uploading-works)). Either:
   - set **Events → On file selected** to **Save changes** to upload as soon as a file is chosen, or
   - set **Events → On save click** to **Save changes** to show a **Save** button next to **Discard**, so the user
     confirms the upload, or
   - leave both empty and let the user press the page's own **Save** button.

## Configuration

### General

| Property | Default | Notes |
| --- | --- | --- |
| Upload type | Image | `Image` uses the `image` property type; `File` uses the `file` property type. Only the matching source property is shown. |
| Image / File | – | The object to upload into (`allowUpload="true"`). Required for the selected mode. |
| Accepted types | empty | Same syntax as HTML `accept`: `image/*`, `.pdf,.docx`, `application/json`. Empty means `image/*` in Image mode and anything in File mode. Applies to every input method (picker, drop, paste, URL). |
| Max file size (MB) | 0 | Client-side limit for a fast, friendly error. 0 = no client limit. Server/runtime limits still apply. |
| Show preview | true | Thumbnail for images: the stored image, or the locally picked image while uploading. |
| Preview height (px) | 160 | Maximum preview height. |
| Show document preview | true | Shows PDFs and spreadsheets (`.xlsx`, `.xlsm`, `.csv`) in a preview panel below the drop zone. PDFs use the browser's built-in PDF viewer: the selected file straight away (from a local `blob:` URL), or the stored file (served with `target=inline`). Includes an **Open in new tab** link. |
| Document preview height (px) | 360 | Starting height of the PDF preview. Users can drag the bottom edge to resize it. |
| Document preview starts | Open | `Open` or `Minimized` (only the header bar shows until the user opens it). |
| Drop zone text | empty | Custom hint (text template). Empty builds a hint from the enabled input methods. |

### Input methods

| Property | Default | Notes |
| --- | --- | --- |
| Drag and drop | true | Drop a single file on the widget. Dropping several files is rejected with a message. |
| Clipboard paste | true | Ctrl/Cmd+V while the widget (or any element inside it) has focus. |
| Load from URL | false | Shows a URL field. Only works with CORS-enabled URLs; see the evaluation below. |

### Replace and clear (acceptance criterion 5)

| Property | Default | Behaviour |
| --- | --- | --- |
| Confirm replace | true | If a file is already stored, picking/dropping/pasting a new one shows an inline confirmation ("Replace *old* with *new*?") with **Replace** / **Cancel**. Nothing is uploaded until the user confirms. When off, the new file replaces the old one right away. |
| Replace confirmation text | empty | Custom text; empty uses the default shown above. |
| Show clear button | true | Shows **Clear** for a stored file, but **only when an On clear action is configured** (Studio Pro warns otherwise). The pluggable-widget API can't remove stored contents, so the On clear action does the actual removal. |
| Confirm clear | true | Inline **Remove** / **Cancel** confirmation before running On clear. |
| Clear confirmation text | empty | Custom text. |
| On clear | – | Runs when the user confirms Clear, e.g. a microflow that deletes the file object (and refreshes or closes the page) or replaces it with a new empty one. |

A file that is selected but not yet uploaded (pending) always gets a **Discard** button. It drops the selection
and leaves the stored file untouched.

### Events (acceptance criterion 4)

All three are standard Mendix `action` properties, so they support *Call a microflow*, *Call a nanoflow*,
*Show a page*, *Save changes*, *Close page*, and so on. The widget runs them only when `canExecute` is true and
the same action isn't already running.

| Property | Runs when |
| --- | --- |
| On file selected | A valid file has been chosen and handed to the platform. **Set it to Save changes to upload immediately.** |
| On save click | The user clicks the **Save** button, which appears next to **Discard** while a file is pending, and only when this action is set. Use **Save changes** (or a nanoflow that runs Save changes first) so the file is actually uploaded. The widget shows *Uploading…* while it runs. |
| Save button caption | Text template for the Save button. Empty uses "Save". |
| On upload success | The file has been stored on the server: after a save, the value comes back with a new URI. |
| On upload failure | The platform rejected the file (`validation` set), the save finished but the stored file didn't change within 8 s (e.g. other validation errors on the page blocked the save), **or** the widget rejected it client-side (wrong type, too big, URL could not be fetched). |
| On clear | The user confirmed Clear, see above. |

A common setup: **On file selected → Save changes**, and **On upload success → Call microflow** for follow-up work
(e.g. create a thumbnail record or refresh a parent).

### Common

Name, Tab index, **Label** (the usual form-group label), Visibility and Editability are supported. When the
object or attribute is read-only (access rules, Editability, or the data view is non-editable), the widget
shows the current file and preview but disables every input method and the clear button.

## States (acceptance criteria 1–3)

| State | What the user sees |
| --- | --- |
| Empty | Dashed drop zone, "No file selected", plus a hint for the enabled input methods. |
| Stored file | **File name** in bold (criterion 1) with a thumbnail if it's an image. The hint is still shown, so the user can replace the file. |
| Pending | Amber border and a "Ready to upload. The file is stored when the page is saved." badge. The **local preview** of the picked image appears straight away from an object URL (criterion 2), with the new file name and size. **Save** (when On save click is set) uploads it, and **Discard** drops the selection. |
| Uploading | Blue border, indeterminate progress bar and "Uploading…" badge while the On file selected action (Save changes) runs. Inputs are disabled. Mendix also shows its own progress indicator during the upload. |
| Success | Green border and "✔ Upload complete" badge. |
| Failure | Red border and "✖ *reason*" badge. **Retry** (re-selects the same file and runs On file selected again) when the save didn't store it, and **Dismiss** in every case. The stored file is untouched. |
| Dragging | Solid blue border and tinted background, with the hint changing to "Drop to upload". |

The status area is an `aria-live="polite"` region, confirmations use `role="alertdialog"`, the drop zone is a
keyboard-operable `role="button"` (Enter/Space opens the file picker), and the progress animation respects
`prefers-reduced-motion`.

### Why the progress bar is indeterminate

The pluggable-widget API exposes no upload progress events, and the upload itself is done by the Mendix client
during the page save (below). A byte-accurate bar would mean posting the file ourselves to Mendix's internal,
undocumented `/file` endpoint, bypassing the platform's validation and security, so we deliberately did not do it.

### File-type badge and document preview

Non-image files show a coloured badge with the file extension (PDF red, Word/text blue, Excel/CSV green,
PowerPoint orange, archives brown, other grey) instead of a generic icon.

PDFs also get a full preview below the drop zone, using the browser's built-in viewer in an `<iframe>`, with
`#toolbar=0&navpanes=0&view=FitH` for a clean, fit-to-width look. Its header bar shows the file name and:

- **Open in new tab**.
- **Minimize / show** (chevron): folds the preview down to its header bar, and back.
- **Expand** (↗↙): full-window view over a dimmed backdrop. **Exit full view** (↘↖), **Esc** or a click on the
  backdrop returns to normal, and focus goes back to the Expand button. The full view is rendered in a portal on
  `<body>`, so a transformed parent (e.g. a popup page layout) can't trap it. While it's open, a placeholder
  line holds its place in the form. On narrow screens (≤ 576 px) it fills the whole screen.
- **Resize**: drag the bottom-right corner of the normal preview to change its height (CSS `resize: vertical`;
  minimum 120 px).

Notes:

- Desktop Chrome, Edge, Firefox and Safari render it. **Android Chrome has no inline PDF viewer** and shows an
  empty or download frame, so use **Open in new tab** there. iOS Safari shows the first page only.
- A strict Content-Security-Policy needs `frame-src 'self' blob:` (or `child-src`) for the preview to load.
- Word and PowerPoint files aren't previewed: browsers can't render them, and sending them to an online viewer
  (e.g. Office Online) would leak the file to a third party. That also only works for publicly reachable URLs.

### Spreadsheet preview (.xlsx, .xlsm, .csv)

Spreadsheets open in the same panel, with the same minimize, expand and resize controls, as a read-only table:

- Excel-style column letters and row numbers that stay in view while scrolling, and sheet tabs along the bottom
  for workbooks with several sheets.
- The first **200 rows × 50 columns** of each sheet. A note says when a sheet is larger, and the header link
  becomes **Download**.
- Works for the selected file before upload (read directly from the `File`) and for the stored file (fetched
  from the Mendix file URL with the user's session).
- Values are shown as plain values: numbers use the browser's locale, and dates are formatted as dates. Excel
  number formats (currency symbols, percentages, custom formats), colours, merged cells, formulas and charts are
  not reproduced. A formula shows its last calculated value.
- Cell contents are rendered as React text, never as HTML, so a crafted spreadsheet can't inject markup.
- Works on mobile too, because it doesn't depend on a built-in viewer.

Implementation: `.xlsx`/`.xlsm` are parsed in the browser with
[read-excel-file](https://www.npmjs.com/package/read-excel-file) (MIT, ~50 KB in the bundle, maintained). CSV uses
a small built-in parser (quoted fields, `""` escapes, BOM, and `;` delimiter detection for European exports).

**Not supported:** legacy `.xls` (BIFF) and `.ods`. Those need SheetJS. Its current, patched releases are only
published on SheetJS's own CDN (the npm-registry copy, 0.18.5, has known security issues when parsing untrusted
files), and installing from that CDN was blocked by this environment's permission policy. To add them, approve
installing `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` and swap the parser in `SpreadsheetPreview.tsx`.
Expect roughly +400 KB of bundle.

**CSP:** for `.xlsx` files over 512 KB the unzip library (fflate) decompresses in a Web Worker created from a
`blob:` URL. If the app sets a strict Content-Security-Policy, allow `worker-src blob:`.
- For a real thumbnail image of page 1 (e.g. on mobile), the alternative is bundling Mozilla's pdf.js
  (`pdfjs-dist`). It adds roughly 1 MB plus a web worker to the widget, so we chose the zero-dependency
  built-in viewer for now.

The native file input is hidden with the `hidden` attribute and an inline `display: none`, so theme rules for
`input[type=file]` can't bring back the browser's "Choose File / No file chosen" control. Clicking the drop zone
(or Enter/Space on it) still opens the file picker.

## How uploading works

Verified against the Mendix 11.14 client (`mxclientsystem/mxui/mxui.js`):

1. `EditableFileValue.setValue(file)` does **not** upload. It runs the property's validators and stores the file
   as the *selected file* for that object in the client.
2. The page's form registers a `submit` listener. When the form is committed, which is what **Save changes**
   does (`FormBase.commit` publishes `submit`, then `commit`), the client calls `saveDocument(guid, name, …, file)`
   and shows its standard progress indicator.
3. After the save, the object's `changedDate`/`HasContents` change, so the file value comes back with a new URI.
   The widget uses that to switch to **Success**.
4. A `System.FileDocument` without contents reports `status: "unavailable"` (there is no URI yet). That is normal
   for a new object and not an error.
5. `setValue(undefined)` only clears the selection. It can't remove contents that are already stored, which is
   why Clear goes through an action.

Practical consequences:

- Selecting a file alone doesn't store it. Use **On file selected → Save changes** for immediate upload, or a
  Save button on the page.
- A **Call microflow** button does not trigger the form `submit`, so it won't upload a pending file. Use
  **Save changes** (or *Save changes* followed by your microflow).
- If the page can't be saved (validation errors elsewhere on the page), the file stays pending. After 8 s the
  widget shows a failure with **Retry**.

## Acceptance criterion 6: drag-and-drop, clipboard paste and load-from-URL

### Drag-and-drop: implemented

- Native HTML5 drag events on the widget root. A drag counter keeps the highlight from flickering over child
  elements, and only drags that carry files (`dataTransfer.types` includes `Files`) are accepted.
- Single-file only, matching the single file/image property. Multiple files are rejected with a message. For
  multi-file upload, use Mendix's **File Uploader** widget (datasource-based) instead.
- The same validation (type, size) and replace-confirmation run for dropped files as for picked files.
- Folders can't be uploaded. The browser hands over an empty or unreadable `File`, and the upload fails with a
  message.

### Clipboard paste: implemented

- Listens for `paste` on the widget root, so it works whenever focus is inside the widget (click or Tab to the
  drop zone, then Ctrl/Cmd+V). Pasting elsewhere on the page is **not** captured on purpose: a global listener
  would hijack paste in other inputs and could upload into the wrong widget when several are on a page.
- Reads `clipboardData.files`, falling back to `clipboardData.items` with `kind === "file"`. This covers
  screenshots (Print Screen / Win+Shift+S / Cmd+Ctrl+Shift+4), images copied from most image editors, and files
  copied in Windows Explorer / macOS Finder (Chromium and Firefox; Safari support for copied Finder files is
  limited).
- Clipboard screenshots arrive named `image.png`. The widget renames them to `pasted-YYYY-MM-DDTHH-MM-SS.png`, so
  the stored file name is meaningful and unique.
- Images copied from a web page usually reach the clipboard as HTML or a URL, not as a file. Browsers only expose
  them as a file sometimes ("Copy image" in Chrome does; dragging or copying the selection doesn't). Text-only
  pastes are ignored and fall through to the browser, so pasting a URL into the URL field still works.
- We did not use the async Clipboard API (`navigator.clipboard.read()`), for example for a "Paste" button. It
  needs a permission prompt in Chromium, isn't available in Firefox for images without a flag, and needs a
  secure context. The `paste` event needs no permission and works everywhere.

### Load from URL: implemented behind a toggle (off by default), with significant limits

How it works: `fetch(url, { mode: "cors", credentials: "omit" })` → `Blob` → `File`, named after the last path
segment, or `download.<ext>` from the content type. The result then goes through the same validation, replace
confirmation and upload as any other file.

Findings:

1. **CORS is the blocker.** The browser can only read the response if the remote server sends
   `Access-Control-Allow-Origin` for the app's origin, or `*`. Many image hosts don't, including most
   websites, Google Images results and many CDNs. Public APIs and buckets that do send it (e.g. S3/Azure Blob
   storage with CORS configured, or your own servers) work. When it fails, the user gets a clear
   message: "The site probably does not allow cross-origin downloads (CORS). Download it and upload it instead."
2. **Security.** Fetching from the browser can only reach what the user's browser can reach, and it sends no
   cookies (`credentials: "omit"`), so it adds no SSRF risk to the server. Only `http(s)` URLs are accepted.
   Type and size limits are enforced *after* download (the size isn't known beforehand), so very large files are
   downloaded before they're rejected.
3. **Content-Security-Policy.** If the app's CSP sets `connect-src`, the remote host must be allowed there or
   the fetch is blocked. Check the app's CSP (e.g. *Runtime → Custom HTTP headers* or the hosting proxy) if URL
   import fails with a CSP error in the browser console.
4. **Mixed content.** An `http:` URL won't load in an app served over `https:`.

**Recommended server-side alternative** for reliable URL import from any host: add a nanoflow/microflow action
that takes the URL, downloads it in the runtime with a **Call REST service** activity (response handling →
store in a `System.FileDocument`/`System.Image`), and validates content type/size. Then hook that up as a button
next to the widget. This avoids CORS completely, but it *does* introduce SSRF risk: restrict allowed hosts/schemes
and block private IP ranges in the microflow. We didn't build it into the widget, because pluggable widgets
can't run server-side code without a configured microflow.

## Known limitations

- **Image mode file name:** the `image` property's value (`WebImage`) has an *optional* `name`. If the runtime
  doesn't provide it, the widget shows "Stored image" instead of the file name. If the file name must always show,
  use **File** mode bound to the `System.Image` specialization (it's a `System.FileDocument` too). The preview
  still works, because the widget previews any stored file whose name has an image extension.
- Single file per widget (by design, matching the property type).
- No byte-level progress (see above).
- Web only (`supportedPlatform="Web"`).

## Development

This is a standalone repository, using the standard
`@mendix/pluggable-widgets-tools` layout (`src/FileUploadPlus.xml`, `src/FileUploadPlus.tsx`,
`*.editorConfig.ts`, `*.editorPreview.tsx`, generated `typings/`).

```bash
npm install
npm run build      # dev build; also copies the .mpk to <projectPath>/widgets/
npm run release    # lint + production build -> dist/<version>/veilsun.FileUploadPlus.mpk (also copied to <projectPath>/widgets/)
npm run lint:fix
```

Build notes for this machine/repo:

- `@mendix/pluggable-widgets-tools` is pinned to **11.11.0**, because 11.12+ requires Node ≥ 22.18 and this
  machine has 22.17. Upgrade the tools when Node is upgraded.
- `overrides.shelljs = 0.8.5`: shelljs 0.10 (the tools' default) can't glob Windows backslash paths, so the
  build silently produced an `.mpk` **without `FileUploadPlus.xml` and `package.xml`**. Keep the override on
  Windows, or check the `.mpk` contents with `unzip -l` after upgrading.
- `optionalDependencies` includes `@napi-rs/lzma-win32-x64-msvc`, because npm sometimes skips that native
  binding (npm/cli#4828) and the build then fails with "Cannot find native binding". If a fresh `npm install`
  still leaves `node_modules/@napi-rs/lzma-win32-x64-msvc` missing (seen on this machine), delete `node_modules` and
  `package-lock.json` and install again, or extract `npm pack @napi-rs/lzma-win32-x64-msvc@1.5.3` into that folder.
- `config.projectPath` in `package.json` is the Mendix app used for testing (currently the Noodler checkout). Builds copy the
  `.mpk` into its `widgets/` folder; point it at another app, or remove it, as needed.

### File layout

```
src/
  FileUploadPlus.xml              widget definition (properties)
  FileUploadPlus.tsx              container: picks image/file source, wires actions
  components/FileUploadPlusUI.tsx UI, input methods, confirmations
  components/useUploadState.ts    upload lifecycle (pending/success/error) inferred from props
  utils/files.ts                  accept matching, paste/clipboard helpers, URL fetch
  components/DocumentPreview.tsx  preview panel: minimize / expand (portal overlay) / resize
  components/SpreadsheetPreview.tsx  .xlsx/.csv table preview (read-excel-file + utils/csv.ts)
  ui/FileUploadPlus.css           styles (fup__* BEM classes; override in your theme)
  FileUploadPlus.editorConfig.ts  Studio Pro property visibility, design-time checks, structure preview
  FileUploadPlus.editorPreview.tsx Studio Pro design-mode preview
```

### Styling

All classes are prefixed with `fup`. The state is on the root (`fup--idle | pending | uploading | success | error`,
plus `fup--dragging` and `fup--disabled`). Colours are CSS custom properties on `.fup` (`--fup-accent`,
`--fup-success`, `--fup-danger`, `--fup-pending`, `--fup-border`, …), so the theme can override them without touching the widget.
