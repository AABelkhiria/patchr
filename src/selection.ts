import * as vscode from 'vscode';
import * as path from 'path';
import { DiffSpec } from './diff';

export function toUri(
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

/** Like toUri, but falls back to the active editor's document. */
export function resolveResourceUri(
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
export function collectResourceUris(args: unknown[]): vscode.Uri[] {
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

export function selectedOrActiveFileUris(resources: unknown[]): vscode.Uri[] {
  const uris = collectResourceUris(resources);
  if (uris.length > 0) {
    return uris;
  }
  const active = resolveResourceUri(undefined);
  return active ? [active] : [];
}

/** Returns '' when the paths share no directory below the root. */
export function commonDirectory(relativePaths: string[]): string {
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

/** Returns undefined (after showing a message) when the selection is not usable. */
export function filesDiffSpec(uris: vscode.Uri[]): DiffSpec | undefined {
  if (uris.length === 0) {
    vscode.window.showErrorMessage('Patchr: No file selected.');
    return undefined;
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uris[0]);
  if (!workspaceFolder) {
    vscode.window.showErrorMessage(
      'Patchr: The selected file is not inside a workspace folder.'
    );
    return undefined;
  }

  const relativePaths: string[] = [];
  for (const uri of uris) {
    const folder = vscode.workspace.getWorkspaceFolder(uri);
    if (!folder || folder.uri.toString() !== workspaceFolder.uri.toString()) {
      vscode.window.showErrorMessage(
        'Patchr: All selected files must belong to the same workspace folder.'
      );
      return undefined;
    }
    relativePaths.push(path.relative(workspaceFolder.uri.fsPath, uri.fsPath));
  }

  let label: string;
  let defaultFileName: string;
  let noChangesMsg: string;
  if (relativePaths.length === 1) {
    const baseName = path.parse(uris[0].fsPath).name;
    label = `changes for "${relativePaths[0]}"`;
    defaultFileName = `${baseName}-changes.patch`;
    noChangesMsg = `No changes found for "${relativePaths[0]}".`;
  } else {
    const dir = commonDirectory(relativePaths);
    const baseName = dir ? path.basename(dir) : 'selected';
    label = dir
      ? `changes in folder "${dir}"`
      : `changes for ${relativePaths.length} files`;
    defaultFileName = `${baseName}-changes.patch`;
    noChangesMsg = dir
      ? `No changes found in folder "${dir}".`
      : `No changes found for the ${relativePaths.length} selected files.`;
  }

  return {
    gitArgs: ['HEAD', '--', ...relativePaths],
    label,
    defaultFileName,
    noChangesMsg,
    folder: workspaceFolder,
  };
}
