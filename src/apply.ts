import * as vscode from 'vscode';
import * as path from 'path';
import { runGit } from './git';
import { resolveResourceUri } from './selection';

function isPatchFile(uri: vscode.Uri): boolean {
  const lower = uri.fsPath.toLowerCase();
  return lower.endsWith('.patch') || lower.endsWith('.diff');
}

/**
 * Applies a `.patch` / `.diff` file to its workspace folder with `git apply`.
 * Prompts for the file when the command is not invoked on one.
 */
export async function applyPatch(
  resource?: vscode.Uri | vscode.SourceControlResourceState
): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage(
      'Patchr: Please open a workspace folder first.'
    );
    return;
  }

  let selectedUri = resolveResourceUri(resource);

  if (!selectedUri || !isPatchFile(selectedUri)) {
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

  try {
    await runGit(['apply', patchFilePath], cwd);
  } catch (err: any) {
    vscode.window.showErrorMessage(
      `Patchr: Failed to apply patch. ${err.message || err}`
    );
    return;
  }

  vscode.window.showInformationMessage(
    `Successfully applied patch from ${path.basename(patchFilePath)}!`
  );
}
