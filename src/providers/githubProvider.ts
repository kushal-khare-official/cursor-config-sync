import { GitProvider, RemoteFile } from '../types/index.js';

export class GitHubProvider implements GitProvider {
  private baseUrl: string;

  constructor(
    instanceUrl: string,
    private repoPath: string,
    private pat: string,
    private branch: string,
  ) {
    this.baseUrl = instanceUrl.includes('github.com')
      ? 'https://api.github.com'
      : `${instanceUrl.replace(/\/+$/, '')}/api/v3`;
  }

  private async request<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `token ${this.pat}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    if (!res.ok) {
      throw new Error(`GitHub API ${res.status}: ${res.statusText} (${endpoint})`);
    }
    return res.json() as Promise<T>;
  }

  async validateAuth(): Promise<boolean> {
    try {
      await this.request('/user');
      return true;
    } catch {
      return false;
    }
  }

  async getFileContent(filePath: string, ref?: string): Promise<string> {
    const branch = ref ?? this.branch;
    const data = await this.request<{ content: string; encoding: string }>(
      `/repos/${this.repoPath}/contents/${filePath}?ref=${branch}`,
    );
    if (data.encoding === 'base64') {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    return data.content;
  }

  async listDirectory(dirPath: string, ref?: string): Promise<string[]> {
    const branch = ref ?? this.branch;
    const data = await this.request<Array<{ path: string }>>(
      `/repos/${this.repoPath}/contents/${dirPath}?ref=${branch}`,
    );
    return data.map(entry => entry.path);
  }

  async getDirectoryContents(dirPath: string, ref?: string): Promise<RemoteFile[]> {
    const branch = ref ?? this.branch;
    const treeData = await this.request<{
      tree: Array<{ path: string; type: string }>;
    }>(`/repos/${this.repoPath}/git/trees/${branch}?recursive=1`);

    const normalizedDir = dirPath.replace(/\/+$/, '');
    const blobs = treeData.tree.filter(
      entry => entry.type === 'blob' && entry.path.startsWith(`${normalizedDir}/`),
    );

    const files: RemoteFile[] = [];
    for (const entry of blobs) {
      const content = await this.getFileContent(entry.path, branch);
      files.push({ path: entry.path, content });
    }
    return files;
  }
}
