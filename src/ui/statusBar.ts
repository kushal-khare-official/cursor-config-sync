import * as vscode from 'vscode';

export class StatusBarManager {
  public readonly item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.command = 'cursorConfigSync.sync';
    this.setIdle();
    this.item.show();
  }

  setIdle(): void {
    this.item.text = '$(cloud) Config Sync';
    this.item.tooltip = 'Click to sync Cursor config';
    this.item.backgroundColor = undefined;
  }

  setSyncing(): void {
    this.item.text = '$(sync~spin) Syncing...';
    this.item.tooltip = 'Syncing configuration...';
  }

  setSynced(role: string): void {
    this.item.text = `$(check) ${role}`;
    this.item.tooltip = `Synced as: ${role}. Click to re-sync.`;
    this.item.backgroundColor = undefined;
  }

  setError(): void {
    this.item.text = '$(error) Sync Failed';
    this.item.tooltip = 'Click to retry sync';
    this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
  }
}
