import * as vscode from 'vscode';
import { AuthService } from './authService.js';
import { RoleResolver } from './roleResolver.js';
import { ManifestReader } from './manifestReader.js';
import { ConfigWriter } from './configWriter.js';
import { createProvider } from '../providers/providerFactory.js';
import { GitProvider, MergedConfig, Platform, SyncResult } from '../types/index.js';
import { Logger } from '../utils/logger.js';

export class ConfigSyncer {
  private syncing = false;

  constructor(
    private authService: AuthService,
    private logger: Logger,
  ) {}

  async sync(): Promise<SyncResult> {
    if (this.syncing) {
      throw new Error('A sync is already in progress.');
    }
    this.syncing = true;
    try {
      return await this.doSync();
    } finally {
      this.syncing = false;
    }
  }

  async fetchMergedConfig(): Promise<MergedConfig> {
    const { provider, roles, manifestReader, manifest } = await this.resolveContext();
    return this.buildMergedConfig(provider, roles, manifestReader, manifest);
  }

  private async doSync(): Promise<SyncResult> {
    const { provider, roles, manifestReader, manifest } = await this.resolveContext();
    const merged = await this.buildMergedConfig(provider, roles, manifestReader, manifest);

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      throw new Error('No workspace folder open.');
    }

    const writer = new ConfigWriter(workspaceRoot, this.logger);
    const result = await writer.writeAll(merged);
    result.role = roles.join(', ');
    return result;
  }

  private async resolveContext() {
    const config = vscode.workspace.getConfiguration('cursorConfigSync');
    const platform = config.get<Platform>('platform')!;
    const instanceUrl = config.get<string>('instanceUrl')!;
    const repoPath = config.get<string>('repoPath')!;
    const branch = config.get<string>('branch', 'main');
    const username = config.get<string>('username')!;

    if (!instanceUrl || !repoPath || !username) {
      throw new Error('Extension not configured. Run "Cursor Config Sync: Setup" first.');
    }

    const pat = await this.authService.getPat();
    if (!pat) {
      throw new Error('No PAT stored. Run "Cursor Config Sync: Setup" first.');
    }

    const provider = createProvider(platform, instanceUrl, repoPath, pat, branch);
    const isValid = await provider.validateAuth();
    if (!isValid) {
      throw new Error('Authentication failed. Check your PAT and instance URL.');
    }

    const manifestReader = new ManifestReader(provider, this.logger);
    const roleResolver = new RoleResolver(provider, this.logger);

    const manifest = await manifestReader.readManifest();
    const roles = await roleResolver.resolveRoles(username);

    return { provider, roles, manifestReader, manifest };
  }

  private async buildMergedConfig(
    provider: GitProvider,
    roles: string[],
    manifestReader: ManifestReader,
    manifest: { roles: Record<string, { path?: string }> },
  ): Promise<MergedConfig> {
    const merged: MergedConfig = {
      rules: [],
      commands: [],
      skills: [],
      hooks: null,
      mcp: null,
    };

    // Load shared config first (baseline)
    await this.loadRoleConfig(provider, 'shared', merged);

    // Load each assigned role (later roles override earlier by filename)
    for (const role of roles) {
      const rolePath = manifestReader.getRolePath(role, manifest);
      await this.loadRoleConfig(provider, rolePath, merged);
    }

    return merged;
  }

  private async loadRoleConfig(
    provider: GitProvider,
    rolePath: string,
    merged: MergedConfig,
  ): Promise<void> {
    for (const configType of ['rules', 'commands', 'skills'] as const) {
      try {
        const dirPrefix = `${rolePath}/${configType}/`;
        const files = await provider.getDirectoryContents(`${rolePath}/${configType}`);
        for (const file of files) {
          // For skills, preserve subfolder structure (e.g. "my-skill/SKILL.MD")
          // For rules/commands, use just the basename (flat)
          const relativePath = configType === 'skills' && file.path.startsWith(dirPrefix)
            ? file.path.slice(dirPrefix.length)
            : file.path.split('/').pop()!;

          const existing = merged[configType].findIndex(f => f.path === relativePath);
          if (existing >= 0) {
            merged[configType][existing] = { path: relativePath, content: file.content };
            this.logger.info(`Overriding ${configType}/${relativePath} from ${rolePath}`);
          } else {
            merged[configType].push({ path: relativePath, content: file.content });
          }
        }
      } catch {
        // directory doesn't exist for this role, skip
      }
    }

    // hooks.json: last role wins
    try {
      const hooksRaw = await provider.getFileContent(`${rolePath}/hooks.json`);
      merged.hooks = JSON.parse(hooksRaw);
    } catch {
      // no hooks for this role
    }

    // mcp.json: merge mcpServers keys
    try {
      const mcpRaw = await provider.getFileContent(`${rolePath}/mcp.json`);
      const mcpData = JSON.parse(mcpRaw);
      if (!merged.mcp) {
        merged.mcp = { mcpServers: {} };
      }
      if (mcpData.mcpServers) {
        const overriddenKeys = Object.keys(mcpData.mcpServers).filter(
          k => k in merged.mcp!.mcpServers,
        );
        if (overriddenKeys.length > 0) {
          this.logger.warn(
            `MCP server(s) overridden by ${rolePath}: ${overriddenKeys.join(', ')}`,
          );
        }
        Object.assign(merged.mcp.mcpServers, mcpData.mcpServers);
      }
    } catch {
      // no mcp for this role
    }
  }
}
