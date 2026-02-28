import { Platform, GitProvider } from '../types/index.js';
import { GitHubProvider } from './githubProvider.js';
import { GitLabProvider } from './gitlabProvider.js';

export function createProvider(
  platform: Platform,
  instanceUrl: string,
  repoPath: string,
  pat: string,
  branch: string,
): GitProvider {
  switch (platform) {
    case 'github':
      return new GitHubProvider(instanceUrl, repoPath, pat, branch);
    case 'gitlab':
      return new GitLabProvider(instanceUrl, repoPath, pat, branch);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
