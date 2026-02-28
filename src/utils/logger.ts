import * as vscode from 'vscode';

export class Logger implements vscode.Disposable {
  private channel: vscode.OutputChannel;

  constructor() {
    this.channel = vscode.window.createOutputChannel('Cursor Config Sync');
  }

  info(msg: string): void {
    this.channel.appendLine(`[INFO  ${this.timestamp()}] ${msg}`);
  }

  warn(msg: string): void {
    this.channel.appendLine(`[WARN  ${this.timestamp()}] ${msg}`);
  }

  error(msg: string): void {
    this.channel.appendLine(`[ERROR ${this.timestamp()}] ${msg}`);
  }

  show(): void {
    this.channel.show();
  }

  dispose(): void {
    this.channel.dispose();
  }

  private timestamp(): string {
    return new Date().toISOString().slice(11, 23);
  }
}
