# Change Log

All notable changes to the **Patchr** extension will be documented in this file.

Check [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) for recommendations on how to structure this file.

## [0.2.0] - 2026-09-04

### Added
- Command `Patchr: Save Folder Changes to Patch File`: right-click a folder in the Source Control tree view or the Explorer to save a patch of every changed file under it.
- Multi-selecting files in the Source Control view or Explorer and running `Patchr: Save File Changes to Patch File` now exports all selected files into one patch.

### Changed
- Git is now invoked with an argument list instead of a shell string, so file paths with spaces or special characters no longer need escaping.

### Fixed
- `Patchr: Save File Changes to Patch File` no longer appears in the context menu of `.patch` and `.diff` files; only `Patchr: Apply Patch File` is offered there.

## [0.0.1] - 2026-08-13

### Added
- Initial release of **Diff** extension.
- Command `Diff: Save Staged Changes to File` accessible via `Cmd+Shift+P` / `Ctrl+Shift+P`.
- Interactive filename prompt with `staged_changes.diff` default.
- Workspace file output and quick-open notification banner.
- Packaging setup via `npm run package`.
