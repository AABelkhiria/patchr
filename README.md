# Patchr

Create, save, and apply Git `.patch` files directly in VS Code.

## Features

- **Export patches**: Save staged changes (`git diff --cached`), unstaged changes (`git diff`), all changes (`git diff HEAD`), changes from a single file, or changes from every file in a folder.
- **Copy to clipboard**: Every export command has a clipboard counterpart, so a diff can be pasted straight into a chat, an issue, or a code review.
- **Apply patches**: Apply `.patch` or `.diff` files, or a diff sitting on your clipboard, to your workspace using `git apply`.
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

### Copy a Diff to the Clipboard

Each export command has a **Copy ... to Clipboard** twin that puts the diff on the clipboard instead of writing a file:
- `Patchr: Copy Staged Changes to Clipboard`
- `Patchr: Copy Unstaged Changes to Clipboard`
- `Patchr: Copy All Changes (Staged & Unstaged) to Clipboard`
- `Patchr: Copy File Changes to Clipboard`
- `Patchr: Copy Folder Changes to Clipboard`

They appear in the same context menus as their **Save** counterparts.

### Apply a Patch

- Run `Patchr: Apply Patch File` from the Command Palette and select a `.patch` or `.diff` file.
- Or right-click any `.patch` / `.diff` file in the Explorer or editor tab and choose **Patchr: Apply Patch File**.
- Run `Patchr: Apply Patch from Clipboard` to apply a diff you copied from a chat, an issue, or a code review without saving it first.

## Settings

| Setting | Default | Description |
| :--- | :--- | :--- |
| `patchr.appendPatchExtension` | `true` | Automatically append `.patch` to filenames. |
| `patchr.slugifyFilename` | `true` | Replace spaces and special characters with dashes (`-`). |
| `patchr.includeBinary` | `true` | Include full binary content (`git diff --binary`) so patches touching binary files can be applied. |

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
