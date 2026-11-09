# Changelog

All notable changes to this widget are documented here. Versions follow [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-11-09

### Added

- Single file/image upload bound to a `System.FileDocument` / `System.Image` specialization (Mendix 11.8+, `allowUpload`).
- Stored file name, instant local preview, and distinct pending / uploading / success / failure states.
- Drag-and-drop, clipboard paste and optional load-from-URL, with client-side type and size checks.
- Replace confirmation; Clear (via an On clear action) and Discard for pending selections.
- Events: On file selected, On save click (Save button), On upload success, On upload failure, On clear.
- File-type badges, PDF preview (built-in viewer) and spreadsheet preview (.xlsx, .xlsm, .csv) in a panel that can be
  minimized, expanded to full view and resized.
