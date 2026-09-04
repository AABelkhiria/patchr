import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { runGit } from './git';
import { resolveResourceUri, resolveTargetFolder } from './selection';

function isPatchFile(uri: vscode.Uri): boolean {
  const lower = uri.fsPath.toLowerCase();
  return lower.endsWith('.patch') || lower.endsWith('.diff');
}

function looksLikeDiff(text: string): boolean {
  return /^(diff --git |--- |\+\+\+ |@@ )/m.test(text);
}

/** Runs `git apply` and reports the outcome; `source` names the patch in messages. */
async function applyPatchFile(patchFilePath: string, cwd: string, source: string): Promise<void> {
  try {
    await runGit(['apply', patchFilePath], cwd);
  } catch (err: any) {
    vscode.window.showErrorMessage(
      `Patchr: Failed to apply patch from ${source}. ${err.message || err}`
    );
    return;
  }
  vscode.window.showInformationMessage(`Successfully applied patch from ${source}!`);
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
  await applyPatchFile(
    selectedUri.fsPath,
    targetFolder.uri.fsPath,
    path.basename(selectedUri.fsPath)
  );
}

/**
 * Applies the diff currently on the clipboard to the chosen workspace folder.
 */
export async function applyClipboardPatch(): Promise<void> {
  let text = await vscode.env.clipboard.readText();
  if (text.trim().length === 0) {
    vscode.window.showErrorMessage('Patchr: The clipboard is empty.');
    return;
  }
  if (!looksLikeDiff(text)) {
    vscode.window.showErrorMessage(
      'Patchr: The clipboard does not contain a unified diff.'
    );
    return;
  }

  const targetFolder = await resolveTargetFolder();
  if (!targetFolder) {
    return;
  }

  // git apply rejects a patch whose last line has no newline terminator.
  if (!text.endsWith('\n')) {
    text += '\n';
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'patchr-'));
  const tempFile = path.join(tempDir, 'clipboard.patch');
  try {
    await fs.writeFile(tempFile, text, 'utf8');
    await applyPatchFile(tempFile, targetFolder.uri.fsPath, 'clipboard');
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
