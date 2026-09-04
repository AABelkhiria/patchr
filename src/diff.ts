import * as vscode from 'vscode';
import * as path from 'path';
import { runGit } from './git';
import { formatFilename } from './filename';

export interface DiffSpec {
  /** Arguments passed to `git diff` (already split, no shell quoting needed). */
  gitArgs: string[];
  /** Human-readable description of what is diffed, e.g. "staged changes". */
  label: string;
  defaultFileName: string;
  noChangesMsg: string;
  /**
   * Workspace folder to run git in. When omitted, the user is asked to pick one if the
   * workspace contains several folders.
   */
  folder?: vscode.WorkspaceFolder;
}

export type DiffOutput = (spec: DiffSpec) => Promise<void>;

export const STAGED_SPEC: DiffSpec = {
  gitArgs: ['--cached'],
  label: 'staged changes',
  defaultFileName: 'staged-changes.patch',
  noChangesMsg: 'No staged changes found in the repository.',
};

export const UNSTAGED_SPEC: DiffSpec = {
  gitArgs: [],
  label: 'unstaged changes',
  defaultFileName: 'unstaged-changes.patch',
  noChangesMsg: 'No unstaged changes found in the repository.',
};

export const ALL_SPEC: DiffSpec = {
  gitArgs: ['HEAD'],
  label: 'all changes',
  defaultFileName: 'all-changes.patch',
  noChangesMsg: 'No changes found (staged or unstaged) compared to HEAD.',
};

/** Returns undefined (after showing a message) when no folder can be chosen. */
async function resolveTargetFolder(
  folder?: vscode.WorkspaceFolder
): Promise<vscode.WorkspaceFolder | undefined> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage(
      'Patchr: Please open a workspace folder first.'
    );
    return undefined;
  }

  if (folder) {
    return folder;
  }
  if (workspaceFolders.length === 1) {
    return workspaceFolders[0];
  }
  return vscode.window.showWorkspaceFolderPick({
    placeHolder: 'Select workspace folder for the patch',
  });
}

/** Returns undefined (after showing a message) when git fails or the diff is empty. */
async function readDiff(spec: DiffSpec, cwd: string): Promise<string | undefined> {
  let diffContent: string;
  try {
    diffContent = await runGit(['diff', ...spec.gitArgs], cwd);
  } catch (err: any) {
    const message: string = err.message || String(err);
    if (message.includes('not a git repository')) {
      vscode.window.showErrorMessage(
        'Patchr: The current workspace folder is not a Git repository.'
      );
    } else {
      vscode.window.showErrorMessage(`Patchr error: ${message}`);
    }
    return undefined;
  }

  if (diffContent.trim().length === 0) {
    vscode.window.showWarningMessage(`Patchr: ${spec.noChangesMsg}`);
    return undefined;
  }
  return diffContent;
}

export async function saveDiff(spec: DiffSpec): Promise<void> {
  const targetFolder = await resolveTargetFolder(spec.folder);
  if (!targetFolder) {
    return;
  }
  const cwd = targetFolder.uri.fsPath;

  const inputFileName = await vscode.window.showInputBox({
    prompt: 'Enter the filename to save the patch to',
    value: spec.defaultFileName,
    valueSelection: [0, spec.defaultFileName.length],
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

  const diffContent = await readDiff(spec, cwd);
  if (diffContent === undefined) {
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

export async function copyDiff(spec: DiffSpec): Promise<void> {
  const targetFolder = await resolveTargetFolder(spec.folder);
  if (!targetFolder) {
    return;
  }

  const diffContent = await readDiff(spec, targetFolder.uri.fsPath);
  if (diffContent === undefined) {
    return;
  }

  try {
    await vscode.env.clipboard.writeText(diffContent);
    vscode.window.showInformationMessage(
      `Copied ${spec.label} to clipboard.`
    );
  } catch (err: any) {
    vscode.window.showErrorMessage(
      `Failed to copy to clipboard: ${err.message || err}`
    );
  }
}
