import * as vscode from 'vscode';
import { AuthService } from '../services/authService.js';
import { Platform } from '../types/index.js';

export class SetupWizard {
  constructor(private authService: AuthService) {}

  async run(): Promise<void> {
    const platform = await vscode.window.showQuickPick(
      [
        { label: 'GitLab', description: 'Self-hosted GitLab', value: 'gitlab' as Platform },
        { label: 'GitHub', description: 'Self-hosted GitHub Enterprise', value: 'github' as Platform },
      ],
      { placeHolder: 'Select your Git platform' }
    );
    if (!platform) { return; }

    const instanceUrl = await vscode.window.showInputBox({
      prompt: 'Enter the base URL of your instance',
      placeHolder: 'https://gitlab.mycompany.com',
      validateInput: (v) => {
        try { new URL(v); return null; }
        catch { return 'Please enter a valid URL'; }
      },
    });
    if (!instanceUrl) { return; }

    const repoPath = await vscode.window.showInputBox({
      prompt: 'Enter the repository path',
      placeHolder: 'org/cursor-configs',
      validateInput: (v) => v.includes('/') ? null : 'Format: owner/repo',
    });
    if (!repoPath) { return; }

    const username = await vscode.window.showInputBox({
      prompt: 'Enter your username or email (for role lookup)',
      placeHolder: 'jane.doe',
    });
    if (!username) { return; }

    const pat = await vscode.window.showInputBox({
      prompt: 'Enter your Personal Access Token',
      password: true,
      placeHolder: 'glpat-xxxxxxxxxxxx',
    });
    if (!pat) { return; }

    const config = vscode.workspace.getConfiguration('cursorConfigSync');
    await config.update('platform', platform.value, vscode.ConfigurationTarget.Global);
    await config.update('instanceUrl', instanceUrl, vscode.ConfigurationTarget.Global);
    await config.update('repoPath', repoPath, vscode.ConfigurationTarget.Global);
    await config.update('username', username, vscode.ConfigurationTarget.Global);

    await this.authService.storePat(pat);

    vscode.window.showInformationMessage(
      'Cursor Config Sync configured! Run "Cursor Config Sync: Sync Now" to pull your config.'
    );
  }
}
