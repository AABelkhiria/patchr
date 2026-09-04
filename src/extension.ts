import * as vscode from 'vscode';
import {
  ALL_SPEC,
  DiffOutput,
  STAGED_SPEC,
  UNSTAGED_SPEC,
  copyDiff,
  saveDiff,
} from './diff';
import {
  collectResourceUris,
  filesDiffSpec,
  selectedOrActiveFileUris,
} from './selection';
import { applyClipboardPatch, applyPatch } from './apply';

export { formatFilename } from './filename';

/** Context menus pass one argument per selected resource; the palette passes none. */
function currentFileHandler(output: DiffOutput) {
  return async (...resources: unknown[]) => {
    const uris = selectedOrActiveFileUris(resources);
    if (uris.length === 0) {
      vscode.window.showErrorMessage('Patchr: No active text file or file selected.');
      return;
    }
    const spec = filesDiffSpec(uris);
    if (spec) {
      await output(spec);
    }
  };
}

/** VS Code passes every resource state under the folder as arguments. */
function folderHandler(output: DiffOutput) {
  return async (...resources: unknown[]) => {
    const uris = collectResourceUris(resources);
    if (uris.length === 0) {
      vscode.window.showErrorMessage('Patchr: No changed files found in the selected folder.');
      return;
    }
    const spec = filesDiffSpec(uris);
    if (spec) {
      await output(spec);
    }
  };
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('patchr.saveStagedDiff', () => saveDiff(STAGED_SPEC)),
    vscode.commands.registerCommand('patchr.saveUnstagedDiff', () => saveDiff(UNSTAGED_SPEC)),
    vscode.commands.registerCommand('patchr.saveAllDiff', () => saveDiff(ALL_SPEC)),
    vscode.commands.registerCommand('patchr.saveCurrentFileDiff', currentFileHandler(saveDiff)),
    vscode.commands.registerCommand('patchr.saveFolderDiff', folderHandler(saveDiff)),
    vscode.commands.registerCommand('patchr.copyStagedDiff', () => copyDiff(STAGED_SPEC)),
    vscode.commands.registerCommand('patchr.copyUnstagedDiff', () => copyDiff(UNSTAGED_SPEC)),
    vscode.commands.registerCommand('patchr.copyAllDiff', () => copyDiff(ALL_SPEC)),
    vscode.commands.registerCommand('patchr.copyCurrentFileDiff', currentFileHandler(copyDiff)),
    vscode.commands.registerCommand('patchr.copyFolderDiff', folderHandler(copyDiff)),
    vscode.commands.registerCommand('patchr.applyDiff', applyPatch),
    vscode.commands.registerCommand('patchr.applyClipboardDiff', applyClipboardPatch)
  );
}

export function deactivate() {}
