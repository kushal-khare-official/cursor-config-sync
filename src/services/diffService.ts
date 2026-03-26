import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { ConfigSyncer } from './configSyncer.js';
import { DiffEntry, RemoteFile } from '../types/index.js';

const REMOTE_SCHEME = 'cursor-config-sync-remote';

export class DiffService {
  private contentProvider: RemoteContentProvider;

  constructor(private syncer: ConfigSyncer) {
    this.contentProvider = new RemoteContentProvider();
    vscode.workspace.registerTextDocumentContentProvider(REMOTE_SCHEME, this.contentProvider);
  }

  async showPreview(): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      vscode.window.showErrorMessage('No workspace folder open.');
      return;
    }

    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'Computing diff...' },
      async () => {
        const merged = await this.syncer.fetchMergedConfig();
        const diffs: DiffEntry[] = [];

        for (const configType of ['rules', 'commands', 'skills'] as const) {
          for (const remoteFile of merged[configType]) {
            const relativePath = remoteFile.path;
            const localPath = path.join(workspaceRoot, '.cursor', configType, relativePath);
            await this.comparePaths(
              `.cursor/${configType}/${relativePath}`,
              localPath,
              remoteFile.content,
              diffs,
            );
          }
        }

        if (merged.hooks) {
          const localPath = path.join(workspaceRoot, '.cursor', 'hooks.json');
          await this.comparePaths(
            '.cursor/hooks.json',
            localPath,
            JSON.stringify(merged.hooks, null, 2),
            diffs,
          );
        }

        if (merged.mcp) {
          const localPath = path.join(workspaceRoot, '.cursor', 'mcp.json');
          await this.comparePaths(
            '.cursor/mcp.json',
            localPath,
            JSON.stringify(merged.mcp, null, 2),
            diffs,
          );
        }

        if (diffs.length === 0) {
          vscode.window.showInformationMessage('Everything is up to date. No changes to sync.');
          return;
        }

        const items = diffs.map(d => ({
          label: `${d.status === 'added' ? '$(diff-added)' : '$(diff-modified)'} ${d.localPath}`,
          description: d.status,
          diff: d,
        }));

        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: `${diffs.length} file(s) will change. Select to view diff.`,
        });

        if (selected && selected.diff.remoteContent) {
          const remotePath = selected.diff.localPath;
          this.contentProvider.setContent(remotePath, selected.diff.remoteContent);
          const remoteUri = vscode.Uri.parse(`${REMOTE_SCHEME}:${remotePath}`);

          if (selected.diff.status === 'added') {
            await vscode.workspace.openTextDocument(remoteUri);
            await vscode.window.showTextDocument(remoteUri);
          } else {
            const localUri = vscode.Uri.file(
              path.join(workspaceRoot, selected.diff.localPath),
            );
            await vscode.commands.executeCommand(
              'vscode.diff',
              localUri,
              remoteUri,
              `${selected.diff.localPath} (local vs remote)`,
            );
          }
        }
      },
    );
  }

  private async comparePaths(
    relativePath: string,
    localPath: string,
    remoteContent: string,
    diffs: DiffEntry[],
  ): Promise<void> {
    let localContent: string | undefined;
    try {
      localContent = await fs.readFile(localPath, 'utf-8');
    } catch {
      // file does not exist locally
    }

    if (!localContent) {
      diffs.push({ localPath: relativePath, status: 'added', remoteContent });
    } else if (localContent !== remoteContent) {
      diffs.push({ localPath: relativePath, status: 'modified', remoteContent, localContent });
    }
  }
}

class RemoteContentProvider implements vscode.TextDocumentContentProvider {
  private contents = new Map<string, string>();

  setContent(path: string, content: string): void {
    this.contents.set(path, content);
  }

  provideTextDocumentContent(uri: vscode.Uri): string {
    return this.contents.get(uri.path) ?? '';
  }
}
