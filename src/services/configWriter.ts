import * as path from 'path';
import * as fs from 'fs/promises';
import { RemoteFile, SyncResult, MergedConfig } from '../types/index.js';
import { Logger } from '../utils/logger.js';

export class ConfigWriter {
  private cursorDir: string;

  constructor(
    private workspaceRoot: string,
    private logger: Logger,
  ) {
    this.cursorDir = path.join(workspaceRoot, '.cursor');
  }

  async writeAll(merged: MergedConfig): Promise<SyncResult> {
    const result: SyncResult = {
      role: '',
      filesWritten: [],
      filesSkipped: [],
      errors: [],
    };

    await this.ensureDir(path.join(this.cursorDir, 'rules'));
    await this.ensureDir(path.join(this.cursorDir, 'commands'));
    await this.ensureDir(path.join(this.cursorDir, 'skills'));

    for (const file of merged.rules) {
      await this.writeFile('rules', file, result);
    }
    for (const file of merged.commands) {
      await this.writeFile('commands', file, result);
    }
    for (const file of merged.skills) {
      await this.writeFile('skills', file, result);
    }

    if (merged.hooks) {
      try {
        const hookPath = path.join(this.cursorDir, 'hooks.json');
        await fs.writeFile(hookPath, JSON.stringify(merged.hooks, null, 2), 'utf-8');
        result.filesWritten.push('.cursor/hooks.json');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push({ file: '.cursor/hooks.json', message: msg });
      }
    }

    if (merged.mcp) {
      try {
        const mcpPath = path.join(this.cursorDir, 'mcp.json');
        let existing: Record<string, unknown> = {};
        try {
          const raw = await fs.readFile(mcpPath, 'utf-8');
          existing = JSON.parse(raw);
        } catch {
          // no existing mcp.json
        }

        if (!existing.mcpServers || typeof existing.mcpServers !== 'object') {
          existing.mcpServers = {};
        }
        Object.assign(
          existing.mcpServers as Record<string, unknown>,
          merged.mcp.mcpServers,
        );

        await fs.writeFile(mcpPath, JSON.stringify(existing, null, 2), 'utf-8');
        result.filesWritten.push('.cursor/mcp.json');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push({ file: '.cursor/mcp.json', message: msg });
      }
    }

    return result;
  }

  private async writeFile(subdir: string, file: RemoteFile, result: SyncResult): Promise<void> {
    const basename = file.path.split('/').pop()!;
    const targetPath = path.join(this.cursorDir, subdir, basename);
    try {
      await fs.writeFile(targetPath, file.content, 'utf-8');
      result.filesWritten.push(`.cursor/${subdir}/${basename}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push({ file: `.cursor/${subdir}/${basename}`, message: msg });
    }
  }

  private async ensureDir(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }
}
