import * as vscode from 'vscode';
import * as path from 'path';

export function formatFilename(inputName: string): string {
  let name = inputName.trim();
  if (!name) {
    return name;
  }

  const config = vscode.workspace.getConfiguration('patchr');
  const appendPatchExtension = config.get<boolean>('appendPatchExtension', true);
  const slugifyFilename = config.get<boolean>('slugifyFilename', true);

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

  if (
    appendPatchExtension &&
    !name.toLowerCase().endsWith('.patch') &&
    !name.toLowerCase().endsWith('.diff')
  ) {
    name = `${name}.patch`;
  }

  return name;
}
