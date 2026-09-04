# Patchr

Create, save, and apply Git `.patch` files directly in VS Code.

## Features

- **Export patches**: Save staged changes (`git diff --cached`), unstaged changes (`git diff`), all changes (`git diff HEAD`), changes from a single file, or changes from every file in a folder.
- **Apply patches**: Apply `.patch` or `.diff` files to your workspace using `git apply`.
- **Context menus**: Export and apply patches from the Command Palette, Source Control view, File Explorer, or Editor tabs.

## Usage

### Export a Patch

From the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`):
- `Patchr: Save Staged Changes to Patch File`
- `Patchr: Save Unstaged Changes to Patch File`
- `Patchr: Save All Changes (Staged & Unstaged) to Patch File`
- `Patchr: Save File Changes to Patch File`
- `Patchr: Save Folder Changes to Patch File`

Or use context menus:
- **Source Control**: Click `⋯` in the SCM title bar, or right-click **Staged Changes** / **Changes**.
- **Source Control (tree view)**: Right-click a folder and choose **Patchr: Save Folder Changes to Patch File** to export every changed file under it. Multi-selecting files and choosing **Patchr: Save File Changes to Patch File** exports just those files.
- **Explorer / Editor**: Right-click any file and choose **Patchr: Save File Changes to Patch File**, or right-click a folder and choose **Patchr: Save Folder Changes to Patch File**.

### Apply a Patch

- Run `Patchr: Apply Patch File` from the Command Palette and select a `.patch` or `.diff` file.
- Or right-click any `.patch` / `.diff` file in the Explorer or editor tab and choose **Patchr: Apply Patch File**.

## Settings

| Setting | Default | Description |
| :--- | :--- | :--- |
| `patchr.appendPatchExtension` | `true` | Automatically append `.patch` to filenames. |
| `patchr.slugifyFilename` | `true` | Replace spaces and special characters with dashes (`-`). |

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
