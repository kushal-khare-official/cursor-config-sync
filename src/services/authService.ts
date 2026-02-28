import * as vscode from 'vscode';
import { SECRETS } from '../utils/constants.js';

export class AuthService {
  constructor(private secrets: vscode.SecretStorage) {}

  async storePat(pat: string): Promise<void> {
    await this.secrets.store(SECRETS.PAT_KEY, pat);
  }

  async getPat(): Promise<string | undefined> {
    return this.secrets.get(SECRETS.PAT_KEY);
  }

  async deletePat(): Promise<void> {
    await this.secrets.delete(SECRETS.PAT_KEY);
  }
}
