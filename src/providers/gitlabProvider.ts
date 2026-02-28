import { GitProvider, RemoteFile } from '../types/index.js';

export class GitLabProvider implements GitProvider {
  private baseUrl: string;
  private projectId: string;

  constructor(
    instanceUrl: string,
    repoPath: string,
    private pat: string,
    private branch: string,
  ) {
    this.baseUrl = `${instanceUrl.replace(/\/+$/, '')}/api/v4`;
    this.projectId = encodeURIComponent(repoPath);
  }

  private async request<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const res = await fetch(url, {
      headers: { 'PRIVATE-TOKEN': this.pat },
    });
    if (!res.ok) {
      throw new Error(`GitLab API ${res.status}: ${res.statusText} (${endpoint})`);
    }
    return res.json() as Promise<T>;
  }

  private async paginatedRequest<T>(endpoint: string): Promise<T[]> {
    const results: T[] = [];
    let page = 1;
    const separator = endpoint.includes('?') ? '&' : '?';

    while (true) {
      const url = `${this.baseUrl}${endpoint}${separator}per_page=100&page=${page}`;
      const res = await fetch(url, {
        headers: { 'PRIVATE-TOKEN': this.pat },
      });
      if (!res.ok) {
        throw new Error(`GitLab API ${res.status}: ${res.statusText} (${endpoint})`);
      }
      const data = (await res.json()) as T[];
      results.push(...data);

      const nextPage = res.headers.get('x-next-page');
      if (!nextPage || nextPage === '') {
        break;
      }
      page = parseInt(nextPage, 10);
    }
    return results;
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
    const encodedPath = encodeURIComponent(filePath);
    const url = `${this.baseUrl}/projects/${this.projectId}/repository/files/${encodedPath}/raw?ref=${branch}`;
    const res = await fetch(url, {
      headers: { 'PRIVATE-TOKEN': this.pat },
    });
    if (!res.ok) {
      throw new Error(`GitLab API ${res.status} for file ${filePath}`);
    }
    return res.text();
  }

  async listDirectory(dirPath: string, ref?: string): Promise<string[]> {
    const branch = ref ?? this.branch;
    const data = await this.paginatedRequest<{ path: string }>(
      `/projects/${this.projectId}/repository/tree?path=${encodeURIComponent(dirPath)}&ref=${branch}`,
    );
    return data.map(entry => entry.path);
  }

  async getDirectoryContents(dirPath: string, ref?: string): Promise<RemoteFile[]> {
    const branch = ref ?? this.branch;
    const data = await this.paginatedRequest<{ path: string; type: string }>(
      `/projects/${this.projectId}/repository/tree?path=${encodeURIComponent(dirPath)}&ref=${branch}&recursive=true`,
    );
    const blobs = data.filter(entry => entry.type === 'blob');

    const files: RemoteFile[] = [];
    for (const blob of blobs) {
      const content = await this.getFileContent(blob.path, branch);
      files.push({ path: blob.path, content });
    }
    return files;
  }
}
