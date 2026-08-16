import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as path from 'path';

/**
 * Normalizes and formats the user-provided filename according to extension settings.
 */
export function formatFilename(inputName: string): string {
  let name = inputName.trim();
  if (!name) {
    return name;
  }

  const config = vscode.workspace.getConfiguration('diffly');
  const legacyConfig = vscode.workspace.getConfiguration('diff');

  const appendPatchExtension = config.get<boolean>(
    'appendPatchExtension',
    legacyConfig.get<boolean>(
      'appendPatchExtension',
      legacyConfig.get<boolean>('appendDiffExtension', true)
    )
  );

  const slugifyFilename = config.get<boolean>(
    'slugifyFilename',
    legacyConfig.get<boolean>('slugifyFilename', true)
  );

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
 */
async function generateAndSaveDiff(
  gitArgs: string,
  defaultFileName: string,
  noChangesMsg: string
) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage(
      'Diffly: Please open a workspace folder first.'
    );
    return;
  }

  let targetFolder = workspaceFolders[0];
  if (workspaceFolders.length > 1) {
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

  exec(
    `git diff ${gitArgs}`,
    { cwd, maxBuffer: 10 * 1024 * 1024 },
    async (error, stdout, stderr) => {
      if (error) {
        if (stderr.includes('not a git repository')) {
          vscode.window.showErrorMessage(
            'Diffly: The current workspace folder is not a Git repository.'
          );
        } else {
          vscode.window.showErrorMessage(
            `Diffly error: ${stderr || error.message}`
          );
        }
        return;
      }

      const diffContent = stdout;

      if (!diffContent || diffContent.trim().length === 0) {
        vscode.window.showWarningMessage(`Diffly: ${noChangesMsg}`);
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
 * Extracts a vscode.Uri from various command invocation sources (Explorer, SCM, Active Editor).
 */
function resolveResourceUri(
  resource?: vscode.Uri | vscode.SourceControlResourceState | any
): vscode.Uri | undefined {
  if (resource instanceof vscode.Uri) {
    return resource;
  }
  if (resource && 'resourceUri' in resource && resource.resourceUri instanceof vscode.Uri) {
    return resource.resourceUri;
  }
  if (vscode.window.activeTextEditor) {
    return vscode.window.activeTextEditor.document.uri;
  }
  return undefined;
}

export function activate(context: vscode.ExtensionContext) {
  // Command 1: Save Staged Changes
  const saveStagedHandler = async () => {
    await generateAndSaveDiff(
      '--cached',
      'staged-changes.patch',
      'No staged changes found in the repository.'
    );
  };

  // Command 2: Save Unstaged Changes
  const saveUnstagedHandler = async () => {
    await generateAndSaveDiff(
      '',
      'unstaged-changes.patch',
      'No unstaged changes found in the repository.'
    );
  };

  // Command 3: Save All Changes (HEAD)
  const saveAllHandler = async () => {
    await generateAndSaveDiff(
      'HEAD',
      'all-changes.patch',
      'No changes found (staged or unstaged) compared to HEAD.'
    );
  };

  // Command 4: Save Current Active / Selected File Changes
  const saveCurrentFileHandler = async (
    resource?: vscode.Uri | vscode.SourceControlResourceState
  ) => {
    const targetUri = resolveResourceUri(resource);
    if (!targetUri) {
      vscode.window.showErrorMessage('Diffly: No active text file or file selected.');
      return;
    }

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(targetUri);
    if (!workspaceFolder) {
      vscode.window.showErrorMessage(
        'Diffly: The selected file is not inside a workspace folder.'
      );
      return;
    }

    const relativeFilePath = path.relative(workspaceFolder.uri.fsPath, targetUri.fsPath);
    const baseName = path.parse(targetUri.fsPath).name;
    const defaultFileName = `${baseName}-changes.patch`;

    await generateAndSaveDiff(
      `HEAD -- "${relativeFilePath.replace(/"/g, '\\"')}"`,
      defaultFileName,
      `No changes found for file "${relativeFilePath}".`
    );
  };

  // Command 5: Apply Patch File
  const applyDiffHandler = async (
    resource?: vscode.Uri | vscode.SourceControlResourceState
  ) => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage(
        'Diffly: Please open a workspace folder first.'
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

    exec(
      `git apply "${patchFilePath.replace(/"/g, '\\"')}"`,
      { cwd, maxBuffer: 10 * 1024 * 1024 },
      async (error, stdout, stderr) => {
        if (error) {
          vscode.window.showErrorMessage(
            `Diffly: Failed to apply patch. ${stderr || error.message}`
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

  // Register diffly.* commands and legacy diff.* aliases
  context.subscriptions.push(
    vscode.commands.registerCommand('diffly.saveStagedDiff', saveStagedHandler),
    vscode.commands.registerCommand('diffly.saveUnstagedDiff', saveUnstagedHandler),
    vscode.commands.registerCommand('diffly.saveAllDiff', saveAllHandler),
    vscode.commands.registerCommand('diffly.saveCurrentFileDiff', saveCurrentFileHandler),
    vscode.commands.registerCommand('diffly.applyDiff', applyDiffHandler),

    // Legacy aliases
    vscode.commands.registerCommand('diff.saveStagedDiff', saveStagedHandler),
    vscode.commands.registerCommand('diff.saveUnstagedDiff', saveUnstagedHandler),
    vscode.commands.registerCommand('diff.saveAllDiff', saveAllHandler),
    vscode.commands.registerCommand('diff.saveCurrentFileDiff', saveCurrentFileHandler),
    vscode.commands.registerCommand('diff.applyDiff', applyDiffHandler)
  );
}

export function deactivate() {}
