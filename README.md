# Patchr

Generate and save Git patches (`.patch`) directly from VS Code — via Command Palette, Source Control view, Explorer context menu, or the editor.

## Features

- **Export Staged, Unstaged, or All Changes**: Generate `.patch` files for staged changes (`git diff --cached`), unstaged working tree changes (`git diff`), all changes combined (`git diff HEAD`), or for a specific file.
- **Apply Patch Files**: Apply any `.patch` or `.diff` file directly to your workspace repository using `git apply`.
- **Command Palette Integration**: Easily access via `Cmd + Shift + P` (macOS) or `Ctrl + Shift + P` (Windows/Linux).
- **Source Control (SCM) View Actions**: Export staged/unstaged changes or apply patches directly from the SCM title menu. Right-click a resource group (Staged Changes, Changes) or individual file for contextual actions.
- **Explorer Context Menu**: Right-click any `.patch` or `.diff` file in the Explorer to apply it. Right-click any file to export its changes as a patch.
- **Editor Context Menu**: Right-click inside a file editor or on its tab to save changes or apply a patch.
- **Interactive Filename Prompt**: Suggests sensible defaults (e.g., `staged-changes.patch`), customizable on export.
- **Workspace File Output**: Saves `.patch` files directly into your open workspace root directory.
- **Quick Open**: Offers a one-click notification action to open and view the generated `.patch` file immediately.

## Extension Settings

This extension contributes the following settings:

* `patchr.appendPatchExtension`: Automatically append `.patch` extension to the filename if not provided (default: `true`).
* `patchr.slugifyFilename`: Automatically replace spaces and special characters with dashes (`-`) in the filename (default: `true`).

## Usage

### Exporting Patch Files
Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) and choose any of the available export commands:
- **`Patchr: Save Staged Changes to Patch File`**: Exports staged Git changes (`git diff --cached`).
- **`Patchr: Save Unstaged Changes to Patch File`**: Exports unstaged working directory changes (`git diff`).
- **`Patchr: Save All Changes (Staged & Unstaged) to Patch File`**: Exports all modified code (`git diff HEAD`).
- **`Patchr: Save File Changes to Patch File`**: Exports changes for the active or selected file.

### Applying a Patch File
1. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`).
2. Search for **`Patchr: Apply Patch File`** and press `Enter`.
3. Select the `.patch` or `.diff` file from your file system.
4. The patch will be applied to your repository using `git apply`.

**Or** right-click a `.patch` / `.diff` file in the Explorer or editor tab and select **Patchr: Apply Patch File**.

### From the Source Control View
- Click the **⋯** menu in the Source Control title bar to access all export and apply commands.
- Right-click on **Staged Changes** or **Changes** groups for contextual export.
- Right-click on an individual file in the SCM view to export just that file's changes.

## Development & Debugging

1. Open this repository in VS Code:
   ```bash
   code /Users/ash/repos/diff
   ```
2. Press `F5` to open a new **Extension Development Host** window with the extension loaded.
3. In the new window, press `Cmd+Shift+P` and test `Patchr: Save Staged Changes to Patch File`.

## Packaging (.vsix)

To package the extension locally into a `.vsix` file:

```bash
bun run package
```

## Automated Release Process

Releases to the Visual Studio Marketplace are automated via GitHub Actions:

1. Merge your changes into the `main` branch.
2. Go to **GitHub** → **Actions** → **Release Extension**.
3. Click **Run workflow**.
4. Choose the release type: `patch`, `minor`, or `major` (default is `patch`).
5. Click **Run workflow**.

GitHub Actions will automatically:
- Calculate the next version using `AABelkhiria/next-version@v2`.
- Update `package.json` version.
- Validate, compile, and package the VSIX.
- Publish the extension under publisher `AshBelkhiria` on the Visual Studio Marketplace.
- Tag the release in Git (`vX.Y.Z`) and push the tag.
- Attach the `.vsix` as a workflow artifact.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
