import { GitProvider, Manifest } from '../types/index.js';
import { Logger } from '../utils/logger.js';

const DEFAULT_MANIFEST: Manifest = { roles: {} };

export class ManifestReader {
  constructor(
    private provider: GitProvider,
    private logger: Logger,
  ) {}

  async readManifest(): Promise<Manifest> {
    try {
      const raw = await this.provider.getFileContent('manifest.json');
      return JSON.parse(raw) as Manifest;
    } catch {
      this.logger.info('No manifest.json found; using folder convention only.');
      return DEFAULT_MANIFEST;
    }
  }

  getRolePath(roleName: string, manifest: Manifest): string {
    const def = manifest.roles[roleName];
    if (def?.path) {
      return def.path.replace(/\/+$/, '');
    }
    return `roles/${roleName}`;
  }
}
