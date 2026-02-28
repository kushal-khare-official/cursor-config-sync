export type Platform = 'github' | 'gitlab';

export interface SyncSettings {
  platform: Platform;
  instanceUrl: string;
  repoPath: string;
  branch: string;
  autoSyncOnOpen: boolean;
  username: string;
}

export interface Manifest {
  roles: Record<string, RoleDefinition>;
}

export interface RoleDefinition {
  path?: string;
  description?: string;
  includes?: ConfigType[];
}

export type ConfigType = 'rules' | 'commands' | 'skills' | 'hooks' | 'mcp';

export interface Assignments {
  [usernameOrEmail: string]: string[];
}

export interface RemoteFile {
  path: string;
  content: string;
}

export interface GitProvider {
  validateAuth(): Promise<boolean>;
  getFileContent(filePath: string, ref?: string): Promise<string>;
  listDirectory(dirPath: string, ref?: string): Promise<string[]>;
  getDirectoryContents(dirPath: string, ref?: string): Promise<RemoteFile[]>;
}

export interface SyncResult {
  role: string;
  filesWritten: string[];
  filesSkipped: string[];
  errors: SyncError[];
}

export interface SyncError {
  file: string;
  message: string;
}

export interface DiffEntry {
  localPath: string;
  status: 'added' | 'modified' | 'deleted' | 'unchanged';
  remoteContent?: string;
  localContent?: string;
}

export interface MergedConfig {
  rules: RemoteFile[];
  commands: RemoteFile[];
  skills: RemoteFile[];
  hooks: Record<string, unknown> | null;
  mcp: { mcpServers: Record<string, unknown> } | null;
}
