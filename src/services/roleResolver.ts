import { Assignments, GitProvider } from '../types/index.js';
import { Logger } from '../utils/logger.js';

export class RoleResolver {
  constructor(
    private provider: GitProvider,
    private logger: Logger,
  ) {}

  async resolveRoles(username: string): Promise<string[]> {
    const raw = await this.provider.getFileContent('assignments.json');
    const assignments: Assignments = JSON.parse(raw);

    const roles =
      assignments[username] ??
      this.findCaseInsensitive(assignments, username);

    if (!roles || roles.length === 0) {
      throw new Error(
        `No roles assigned to "${username}" in assignments.json. Contact your admin to add your username or email.`,
      );
    }

    this.logger.info(`Resolved roles for "${username}": ${roles.join(', ')}`);
    return roles;
  }

  private findCaseInsensitive(assignments: Assignments, username: string): string[] | undefined {
    const lower = username.toLowerCase();
    for (const key of Object.keys(assignments)) {
      if (key.toLowerCase() === lower) {
        return assignments[key];
      }
    }
    return undefined;
  }
}
