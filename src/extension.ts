import * as vscode from 'vscode';
import { execFile } from 'child_process';
import * as path from 'path';

/**
 * Normalizes and formats the user-provided filename according to extension settings.
 */
export function formatFilename(inputName: string): string {
  let name = inputName.trim();
  if (!name) {
    return name;
  }

  const config = vscode.workspace.getConfiguration('patchr');
  const appendPatchExtension = config.get<boolean>('appendPatchExtension', true);
  const slugifyFilename = config.get<boolean>('slugifyFilename', true);

  // 1. Slugify spaces and special characters if enabled
  if (slugifyFilename) {
    const ext = path.extname(name);
    const baseName = ext ? name.slice(0, -ext.length) : name;

    const slugifiedBase = baseName
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

    const cleanBase = slugifiedBase || 'changes';
    name = ext ? `${cleanBase}${ext}` : cleanBase;
  }

  // 2. Append .patch extension if enabled and not already ending in .patch or .diff
  if (
    appendPatchExtension &&
    !name.toLowerCase().endsWith('.patch') &&
    !name.toLowerCase().endsWith('.diff')
  ) {
    name = `${name}.patch`;
  }

  return name;
}

/**
 * Helper to run git diff command and save output to workspace.
 *
 * @param gitArgs      Arguments passed to `git diff` (already split, no shell quoting needed).
 * @param defaultFileName Suggested patch filename.
 * @param noChangesMsg  Message shown when the diff is empty.
 * @param folder        Workspace folder to run git in. When omitted, the user is asked
 *                      to pick one if the workspace contains several folders.
 */
async function generateAndSaveDiff(
  gitArgs: string[],
  defaultFileName: string,
  noChangesMsg: string,
  folder?: vscode.WorkspaceFolder
) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage(
      'Patchr: Please open a workspace folder first.'
    );
    return;
  }

  let targetFolder = folder ?? workspaceFolders[0];
  if (!folder && workspaceFolders.length > 1) {
    const picked = await vscode.window.showWorkspaceFolderPick({
      placeHolder: 'Select workspace folder for the patch file',
    });
    if (!picked) {
      return;
    }
    targetFolder = picked;
  }

  const cwd = targetFolder.uri.fsPath;

  const inputFileName = await vscode.window.showInputBox({
    prompt: 'Enter the filename to save the patch to',
    value: defaultFileName,
    valueSelection: [0, defaultFileName.length],
    validateInput: (value) => {
      if (!value || value.trim().length === 0) {
        return 'Filename cannot be empty';
      }
      if (value.includes('/') || value.includes('\\')) {
        return 'Filename should not include subdirectories or path separators';
      }
      return null;
    },
  });

  if (!inputFileName) {
    return;
  }

  const cleanFileName = formatFilename(inputFileName);

  execFile(
    'git',
    ['diff', ...gitArgs],
    { cwd, maxBuffer: 10 * 1024 * 1024 },
    async (error, stdout, stderr) => {
      if (error) {
        if (stderr.includes('not a git repository')) {
          vscode.window.showErrorMessage(
            'Patchr: The current workspace folder is not a Git repository.'
          );
        } else {
          vscode.window.showErrorMessage(
            `Patchr error: ${stderr || error.message}`
          );
        }
        return;
      }

      const diffContent = stdout;

      if (!diffContent || diffContent.trim().length === 0) {
        vscode.window.showWarningMessage(`Patchr: ${noChangesMsg}`);
        return;
      }

      const fileUri = vscode.Uri.file(path.join(cwd, cleanFileName));

      try {
        const encoder = new TextEncoder();
        await vscode.workspace.fs.writeFile(fileUri, encoder.encode(diffContent));

        const action = 'Open File';
        const choice = await vscode.window.showInformationMessage(
          `Saved patch to ${cleanFileName}!`,
          action
        );

        if (choice === action) {
          const doc = await vscode.workspace.openTextDocument(fileUri);
          await vscode.window.showTextDocument(doc);
        }
      } catch (err: any) {
        vscode.window.showErrorMessage(
          `Failed to write patch file: ${err.message || err}`
        );
      }
    }
  );
}

/**
 * Extracts a vscode.Uri from a single command argument (Explorer, SCM resource state, ...).
 * Returns undefined when the argument does not carry a Uri.
 */
function toUri(
  resource?: vscode.Uri | vscode.SourceControlResourceState | any
): vscode.Uri | undefined {
  if (resource instanceof vscode.Uri) {
    return resource;
  }
  if (resource && 'resourceUri' in resource && resource.resourceUri instanceof vscode.Uri) {
    return resource.resourceUri;
  }
  return undefined;
}

/**
 * Extracts a vscode.Uri from various command invocation sources (Explorer, SCM, Active Editor).
 */
function resolveResourceUri(
  resource?: vscode.Uri | vscode.SourceControlResourceState | any
): vscode.Uri | undefined {
  const uri = toUri(resource);
  if (uri) {
    return uri;
  }
  if (vscode.window.activeTextEditor) {
    return vscode.window.activeTextEditor.document.uri;
  }
  return undefined;
}

/**
 * Collects every Uri from the arguments VS Code passes to a context-menu command.
 *
 * VS Code passes one argument per selected resource. When the command is invoked on a
 * folder node in the Source Control tree view, it passes every resource under that folder.
 * Duplicates are removed and the original order is preserved.
 */
function collectResourceUris(args: unknown[]): vscode.Uri[] {
  const seen = new Set<string>();
  const uris: vscode.Uri[] = [];
  for (const arg of args.flat()) {
    const uri = toUri(arg);
    if (uri && !seen.has(uri.toString())) {
      seen.add(uri.toString());
      uris.push(uri);
    }
  }
  return uris;
}

/**
 * Returns the longest directory shared by every relative path, or '' for the root.
 */
function commonDirectory(relativePaths: string[]): string {
  const parts = relativePaths.map((p) => path.dirname(p).split(path.sep).filter(Boolean));
  if (parts.length === 0) {
    return '';
  }
  let common = parts[0];
  for (const segments of parts.slice(1)) {
    let i = 0;
    while (i < common.length && i < segments.length && common[i] === segments[i]) {
      i++;
    }
    common = common.slice(0, i);
  }
  return common.join(path.sep);
}

/**
 * Generates a `git diff HEAD` patch limited to the given files and saves it.
 */
async function saveFilesDiff(uris: vscode.Uri[]) {
  if (uris.length === 0) {
    vscode.window.showErrorMessage('Patchr: No file selected.');
    return;
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uris[0]);
  if (!workspaceFolder) {
    vscode.window.showErrorMessage(
      'Patchr: The selected file is not inside a workspace folder.'
    );
    return;
  }

  const relativePaths: string[] = [];
  for (const uri of uris) {
    const folder = vscode.workspace.getWorkspaceFolder(uri);
    if (!folder || folder.uri.toString() !== workspaceFolder.uri.toString()) {
      vscode.window.showErrorMessage(
        'Patchr: All selected files must belong to the same workspace folder.'
      );
      return;
    }
    relativePaths.push(path.relative(workspaceFolder.uri.fsPath, uri.fsPath));
  }

  let defaultFileName: string;
  let noChangesMsg: string;
  if (relativePaths.length === 1) {
    const baseName = path.parse(uris[0].fsPath).name;
    defaultFileName = `${baseName}-changes.patch`;
    noChangesMsg = `No changes found for "${relativePaths[0]}".`;
  } else {
    const dir = commonDirectory(relativePaths);
    const baseName = dir ? path.basename(dir) : 'selected';
    defaultFileName = `${baseName}-changes.patch`;
    noChangesMsg = dir
      ? `No changes found in folder "${dir}".`
      : `No changes found for the ${relativePaths.length} selected files.`;
  }

  await generateAndSaveDiff(
    ['HEAD', '--', ...relativePaths],
    defaultFileName,
    noChangesMsg,
    workspaceFolder
  );
}

export function activate(context: vscode.ExtensionContext) {
  // Command 1: Save Staged Changes
  const saveStagedHandler = async () => {
    await generateAndSaveDiff(
      ['--cached'],
      'staged-changes.patch',
      'No staged changes found in the repository.'
    );
  };

  // Command 2: Save Unstaged Changes
  const saveUnstagedHandler = async () => {
    await generateAndSaveDiff(
      [],
      'unstaged-changes.patch',
      'No unstaged changes found in the repository.'
    );
  };

  // Command 3: Save All Changes (HEAD)
  const saveAllHandler = async () => {
    await generateAndSaveDiff(
      ['HEAD'],
      'all-changes.patch',
      'No changes found (staged or unstaged) compared to HEAD.'
    );
  };

  // Command 4: Save Current Active / Selected File(s) Changes
  // Receives one argument per selected resource when invoked from a context menu.
  const saveCurrentFileHandler = async (...resources: unknown[]) => {
    let uris = collectResourceUris(resources);
    if (uris.length === 0) {
      const active = resolveResourceUri(undefined);
      if (active) {
        uris = [active];
      }
    }
    if (uris.length === 0) {
      vscode.window.showErrorMessage('Patchr: No active text file or file selected.');
      return;
    }
    await saveFilesDiff(uris);
  };

  // Command 5: Save Changes of every file under a folder in the Source Control view.
  // VS Code passes every resource state under the folder as arguments.
  const saveFolderHandler = async (...resources: unknown[]) => {
    const uris = collectResourceUris(resources);
    if (uris.length === 0) {
      vscode.window.showErrorMessage('Patchr: No changed files found in the selected folder.');
      return;
    }
    await saveFilesDiff(uris);
  };

  // Command 6: Apply Patch File
  const applyDiffHandler = async (
    resource?: vscode.Uri | vscode.SourceControlResourceState
  ) => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage(
        'Patchr: Please open a workspace folder first.'
      );
      return;
    }

    let selectedUri = resolveResourceUri(resource);

    // If invoked from Command Palette or without a valid .patch/.diff file, prompt for file
    if (
      !selectedUri ||
      (!selectedUri.fsPath.toLowerCase().endsWith('.patch') &&
        !selectedUri.fsPath.toLowerCase().endsWith('.diff'))
    ) {
      const uris = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
          'Patch Files': ['patch', 'diff'],
          'All Files': ['*'],
        },
        openLabel: 'Select Patch File to Apply',
      });

      if (!uris || uris.length === 0) {
        return;
      }
      selectedUri = uris[0];
    }

    const targetFolder =
      vscode.workspace.getWorkspaceFolder(selectedUri) || workspaceFolders[0];
    const cwd = targetFolder.uri.fsPath;
    const patchFilePath = selectedUri.fsPath;

    execFile(
      'git',
      ['apply', patchFilePath],
      { cwd, maxBuffer: 10 * 1024 * 1024 },
      async (error, stdout, stderr) => {
        if (error) {
          vscode.window.showErrorMessage(
            `Patchr: Failed to apply patch. ${stderr || error.message}`
          );
          return;
        }

        const fileName = path.basename(patchFilePath);
        vscode.window.showInformationMessage(
          `Successfully applied patch from ${fileName}!`
        );
      }
    );
  };

  // Register patchr.* commands
  context.subscriptions.push(
    vscode.commands.registerCommand('patchr.saveStagedDiff', saveStagedHandler),
    vscode.commands.registerCommand('patchr.saveUnstagedDiff', saveUnstagedHandler),
    vscode.commands.registerCommand('patchr.saveAllDiff', saveAllHandler),
    vscode.commands.registerCommand('patchr.saveCurrentFileDiff', saveCurrentFileHandler),
    vscode.commands.registerCommand('patchr.saveFolderDiff', saveFolderHandler),
    vscode.commands.registerCommand('patchr.applyDiff', applyDiffHandler)
  );
}

export function deactivate() {}
