import * as vscode from 'vscode';
import { AuthService } from './services/authService.js';
import { ConfigSyncer } from './services/configSyncer.js';
import { DiffService } from './services/diffService.js';
import { StatusBarManager } from './ui/statusBar.js';
import { SetupWizard } from './ui/setupWizard.js';
import { Logger } from './utils/logger.js';
import { COMMANDS } from './utils/constants.js';

let statusBar: StatusBarManager;

export function activate(context: vscode.ExtensionContext) {
  const logger = new Logger();
  const authService = new AuthService(context.secrets);
  const syncer = new ConfigSyncer(authService, logger);
  const diffService = new DiffService(syncer);
  const setupWizard = new SetupWizard(authService);
  statusBar = new StatusBarManager();

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.SETUP, () => setupWizard.run()),
    vscode.commands.registerCommand(COMMANDS.SYNC, () => runSync(syncer, statusBar, logger)),
    vscode.commands.registerCommand(COMMANDS.PREVIEW, () => diffService.showPreview()),
    vscode.commands.registerCommand(COMMANDS.SHOW_LOG, () => logger.show()),
    statusBar.item,
    logger,
  );

  const config = vscode.workspace.getConfiguration('cursorConfigSync');
  if (config.get<boolean>('autoSyncOnOpen')) {
    runSync(syncer, statusBar, logger);
  }
}

async function runSync(
  syncer: ConfigSyncer,
  bar: StatusBarManager,
  logger: Logger,
): Promise<void> {
  bar.setSyncing();
  try {
    const result = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'Syncing Cursor config...' },
      () => syncer.sync(),
    );
    bar.setSynced(result.role);
    vscode.window.showInformationMessage(
      `Cursor Config Sync: ${result.filesWritten.length} files synced for role "${result.role}".`,
    );
    if (result.errors.length > 0) {
      logger.warn(`Sync completed with ${result.errors.length} error(s):`);
      for (const e of result.errors) {
        logger.error(`  ${e.file}: ${e.message}`);
      }
    }
  } catch (err: unknown) {
    bar.setError();
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(msg);
    vscode.window.showErrorMessage(`Sync failed: ${msg}`);
  }
}

export function deactivate() {}
