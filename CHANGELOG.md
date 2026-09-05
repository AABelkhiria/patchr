# Change Log

All notable changes to **Patchr** are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-09-05

### Added
- **Copy to clipboard.** Every export command has a clipboard twin: `Copy Staged Changes`, `Copy Unstaged Changes`, `Copy All Changes`, `Copy File Changes`, and `Copy Folder Changes`. They live in the same context menus as the save commands and skip the filename prompt.
- **Apply from clipboard.** `Patchr: Apply Patch from Clipboard` applies a unified diff copied from a chat, an issue, or a code review without saving it to a file first.
- **Binary files.** Diffs are generated with `--binary`, so patches touching images or other binary files apply cleanly instead of failing on a `Binary files differ` stub. Controlled by the new `patchr.includeBinary` setting (default on).
- **Untracked files.** New, not-yet-added files are appended to unstaged, all-changes, file, and folder patches as "new file" hunks. Ignored files are never included. Controlled by the new `patchr.includeUntracked` setting (default on). The **Untracked Changes** group in Source Control now offers the unstaged save and copy commands.

### Changed
- Commands now wait for git to finish before resolving, so failures are reported reliably.

### Fixed
- The **Staged Changes** group context menu showed no Patchr commands. The menu matched a resource group named `staged`, but the built-in Git extension calls it `index`.
- A brand-new file no longer reports "No changes found" when exported on its own.

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
