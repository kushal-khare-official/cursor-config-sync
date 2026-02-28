# Cursor Config Sync

A VS Code / Cursor extension that syncs Cursor IDE configuration — rules, commands, skills, hooks, and MCP servers — from a self-hosted GitLab or GitHub repository based on roles assigned to each user by an admin.

## Table of Contents

- [How It Works](#how-it-works)
- [Admin Setup](#admin-setup)
  - [1. Create the Config Repository](#1-create-the-config-repository)
  - [2. Define Roles](#2-define-roles)
  - [3. Assign Users to Roles](#3-assign-users-to-roles)
  - [4. Add Shared Config (Optional)](#4-add-shared-config-optional)
  - [5. Customize with a Manifest (Optional)](#5-customize-with-a-manifest-optional)
- [User Setup](#user-setup)
  - [1. Install the Extension](#1-install-the-extension)
  - [2. Run Setup](#2-run-setup)
  - [3. Sync Your Config](#3-sync-your-config)
  - [4. Enable Auto-Sync (Optional)](#4-enable-auto-sync-optional)
- [Commands](#commands)
- [Extension Settings](#extension-settings)
- [Merge Strategy](#merge-strategy)
- [Creating a Personal Access Token](#creating-a-personal-access-token)
  - [GitLab](#gitlab)
  - [GitHub Enterprise](#github-enterprise)
- [Developer Guide](#developer-guide)
  - [Prerequisites](#prerequisites)
  - [Getting Started](#getting-started)
  - [Project Structure](#project-structure)
  - [Architecture](#architecture)
  - [Building](#building)
  - [Debugging](#debugging)
  - [Packaging](#packaging)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## How It Works

1. An **admin** creates a Git repository on a self-hosted GitLab or GitHub instance containing Cursor configuration organized by role (e.g. `frontend-dev`, `backend-dev`, `devops`).
2. The admin maps usernames to roles in an `assignments.json` file.
3. Each **user** installs the extension, points it at the config repo, and runs sync.
4. The extension fetches the user's assigned role, downloads the corresponding config files, and writes them into the workspace's `.cursor/` directory.

---

## Admin Setup

### 1. Create the Config Repository

Create a new repository on your self-hosted GitLab or GitHub instance (e.g. `org/cursor-configs`). Structure it like this:

```
cursor-configs/
  assignments.json
  manifest.json          # optional
  shared/                # optional, applied to all roles
    rules/
      code-style.mdc
    commands/
      review.md
  roles/
    frontend-dev/
      rules/
        react-patterns.mdc
        css-standards.mdc
      commands/
        component-gen.md
      skills/
        a11y-check.md
      hooks.json
      mcp.json
    backend-dev/
      rules/
        api-design.mdc
        db-conventions.mdc
      commands/
        migration.md
      mcp.json
    devops/
      rules/
        infra-standards.mdc
      hooks.json
      mcp.json
```

Each role folder can contain any combination of:

| Folder / File | Cursor Location | Description |
|---|---|---|
| `rules/*.mdc` | `.cursor/rules/` | AI behavior rules scoped by glob patterns |
| `commands/*.md` | `.cursor/commands/` | Slash commands triggered with `/` |
| `skills/*.md` | `.cursor/skills/` | On-demand playbooks the agent loads when relevant |
| `hooks.json` | `.cursor/hooks.json` | Scripts that run before/after agent events |
| `mcp.json` | `.cursor/mcp.json` | MCP server definitions |

### 2. Define Roles

Roles are defined by convention — each subfolder under `roles/` is a role name. No extra configuration is needed.

### 3. Assign Users to Roles

Create `assignments.json` in the repository root. Map each username or email to one or more roles:

```json
{
  "jane.doe": ["frontend-dev"],
  "john.smith": ["backend-dev", "devops"],
  "alice": ["frontend-dev"],
  "bob@company.com": ["backend-dev"]
}
```

- Each user can have **multiple roles**. Configs from all assigned roles are merged.
- Username lookup is **case-insensitive**.

### 4. Add Shared Config (Optional)

Place files in a `shared/` folder at the repository root. These are applied to **all users regardless of role** and serve as a baseline. Role-specific files override shared files when they have the same filename.

```
shared/
  rules/
    code-style.mdc       # applied to everyone
    security.mdc          # applied to everyone
```

### 5. Customize with a Manifest (Optional)

By default, the extension looks for role config under `roles/<role-name>/`. To customize this, create a `manifest.json` in the repo root:

```json
{
  "roles": {
    "frontend-dev": {
      "path": "teams/frontend",
      "description": "Frontend development team"
    },
    "backend-dev": {
      "path": "teams/backend",
      "description": "Backend development team"
    },
    "devops": {
      "description": "DevOps and infrastructure"
    }
  }
}
```

- `path` overrides the default folder location for a role.
- If `path` is omitted, the convention `roles/<role-name>/` is used.
- If no `manifest.json` exists at all, the extension uses the folder convention for all roles.

---

## User Setup

### 1. Install the Extension

**Option A — From .vsix file (recommended for internal distribution):**

1. Get the `.vsix` file from your admin.
2. In Cursor/VS Code, open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`).
3. Run `Extensions: Install from VSIX...` and select the file.

**Option B — From source (for developers):**

```bash
git clone <this-repo>
cd cursor-config-sync
npm install
npm run compile
# Then press F5 in VS Code to launch the Extension Development Host
```

### 2. Run Setup

1. Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`).
2. Run **Cursor Config Sync: Setup**.
3. Follow the prompts:
   - **Platform**: GitLab or GitHub
   - **Instance URL**: Your self-hosted instance URL (e.g. `https://gitlab.mycompany.com`)
   - **Repository path**: `org/cursor-configs` (owner/repo format)
   - **Username**: Your username or email as it appears in `assignments.json`
   - **Personal Access Token**: A PAT with repo read access (see [Creating a Personal Access Token](#creating-a-personal-access-token))

Your PAT is stored securely in your OS keychain (macOS Keychain / Windows Credential Vault / Linux libsecret) via VS Code's SecretStorage API. It is never written to any settings file.

### 3. Sync Your Config

1. Open the Command Palette.
2. Run **Cursor Config Sync: Sync Now**.
3. The extension will:
   - Authenticate with your Git instance
   - Look up your assigned role(s)
   - Download shared + role-specific config
   - Write files into your workspace's `.cursor/` directory

You can also click the **Config Sync** button in the status bar (bottom right) to trigger a sync.

To preview what will change before syncing, run **Cursor Config Sync: Preview Changes**.

### 4. Enable Auto-Sync (Optional)

To automatically sync every time you open a workspace, add this to your VS Code/Cursor settings:

```json
{
  "cursorConfigSync.autoSyncOnOpen": true
}
```

---

## Commands

| Command | Description |
|---|---|
| `Cursor Config Sync: Setup` | Configure the extension (platform, URL, repo, credentials) |
| `Cursor Config Sync: Sync Now` | Pull and apply config for your assigned role(s) |
| `Cursor Config Sync: Preview Changes` | Show a diff of what will change before syncing |
| `Cursor Config Sync: Show Log` | Open the extension's output log |

---

## Extension Settings

These can be set via the setup wizard or manually in `settings.json`:

| Setting | Type | Default | Description |
|---|---|---|---|
| `cursorConfigSync.platform` | `"github"` \| `"gitlab"` | `"gitlab"` | Git hosting platform |
| `cursorConfigSync.instanceUrl` | `string` | `""` | Base URL of your self-hosted instance |
| `cursorConfigSync.repoPath` | `string` | `""` | Repository path (`owner/repo`) |
| `cursorConfigSync.branch` | `string` | `"main"` | Branch to sync from |
| `cursorConfigSync.username` | `string` | `""` | Your username or email for role lookup |
| `cursorConfigSync.autoSyncOnOpen` | `boolean` | `false` | Auto-sync when a workspace opens |

---

## Merge Strategy

When multiple roles are assigned or when both shared and role-specific config exist, the extension merges them using these rules:

| Config Type | Strategy | Details |
|---|---|---|
| `rules/*.mdc` | Overwrite by filename | If `shared/` and a role both have `style.mdc`, the role version wins. Unique files from both are kept. |
| `commands/*.md` | Overwrite by filename | Same as rules. |
| `skills/*.md` | Overwrite by filename | Same as rules. |
| `hooks.json` | Last role wins | The hooks from the last role in your assignment list completely replace earlier ones. |
| `mcp.json` | Merge by server key | MCP server entries are merged across all roles. Same server name in a later role overrides the earlier definition. **Local-only servers** (defined in your workspace but not in any remote config) are preserved. |

**Processing order**: `shared/` is loaded first, then each assigned role in the order they appear in `assignments.json`. Later entries override earlier ones for same-named files.

---

## Creating a Personal Access Token

### GitLab

1. Go to your GitLab instance → **User Settings** → **Access Tokens**.
2. Create a new token with the `read_api` scope.
3. Copy the token (it starts with `glpat-`).

### GitHub Enterprise

1. Go to your GitHub instance → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**.
2. Create a new token with the `repo` scope (or `read:contents` for fine-grained tokens).
3. Copy the token.

---

## Developer Guide

### Prerequisites

- Node.js 18+
- npm 9+
- VS Code or Cursor IDE

### Getting Started

```bash
# Clone the repository
git clone <repo-url>
cd cursor-config-sync

# Install dependencies
npm install

# Type-check
npm run lint

# Build
npm run compile
```

### Project Structure

```
src/
  extension.ts              # Entry point — registers commands, wires dependencies
  types/index.ts            # All shared TypeScript interfaces and types
  providers/
    githubProvider.ts        # GitHub REST API client (supports Enterprise)
    gitlabProvider.ts        # GitLab REST API v4 client (with pagination)
    providerFactory.ts       # Factory — creates the right provider from settings
  services/
    authService.ts           # PAT storage/retrieval via VS Code SecretStorage
    roleResolver.ts          # Reads assignments.json, resolves user's role(s)
    manifestReader.ts        # Reads manifest.json (or falls back to convention)
    configSyncer.ts          # Orchestrator — fetch, merge, write (with sync lock)
    configWriter.ts          # Writes merged config into .cursor/ directory
    diffService.ts           # Computes diffs and opens VS Code's diff editor
  ui/
    statusBar.ts             # Status bar item — idle / syncing / synced / error
    setupWizard.ts           # Multi-step QuickPick for first-time configuration
  utils/
    logger.ts                # Output channel wrapper
    constants.ts             # Command IDs, secret keys, config directory names
```

### Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌───────────────┐
│  extension.ts│────>│  SetupWizard     │────>│  AuthService   │
│  (commands)  │     │  (UI flow)       │     │  (SecretStorage│
└──────┬───────┘     └──────────────────┘     └───────────────┘
       │
       v
┌──────────────┐     ┌──────────────────┐     ┌───────────────┐
│ ConfigSyncer │────>│  ProviderFactory │────>│ GitHubProvider │
│ (orchestrator│     │                  │     │ GitLabProvider │
└──────┬───────┘     └──────────────────┘     └───────────────┘
       │
       ├───> ManifestReader  (reads manifest.json)
       ├───> RoleResolver    (reads assignments.json)
       └───> ConfigWriter    (writes to .cursor/)
```

Key design decisions:
- **No runtime dependencies** — uses Node.js built-in `fetch()` (Node 18+) for HTTP.
- **Provider pattern** — `GitProvider` interface with GitHub and GitLab implementations. Adding a new platform means implementing one interface.
- **Sync lock** — `ConfigSyncer` uses a boolean flag to prevent concurrent syncs.
- **esbuild** — bundles everything into a single `dist/extension.js` (25kb).

### Building

```bash
# One-time build
npm run compile

# Watch mode (rebuilds on file changes)
npm run watch

# Type-check only (no output)
npm run lint
```

### Debugging

1. Open the project in VS Code / Cursor.
2. Press `F5` to launch the Extension Development Host.
3. In the new window, open the Command Palette and run any `Cursor Config Sync` command.
4. Breakpoints set in `src/` files will be hit.
5. View extension logs via **Cursor Config Sync: Show Log**.

### Packaging

```bash
# Install vsce if you haven't
npm install -g @vscode/vsce

# Build and package into a .vsix file
npm run compile
npx vsce package

# This produces cursor-config-sync-0.1.0.vsix
# Distribute this file to your team
```

To install the `.vsix` in Cursor/VS Code:
```
Extensions panel → ··· menu → Install from VSIX...
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| "Extension not configured" | Run **Cursor Config Sync: Setup** first. |
| "No PAT stored" | Re-run setup and enter your Personal Access Token. |
| "Authentication failed" | Verify your PAT is valid and has `read_api` (GitLab) or `repo` (GitHub) scope. Check the instance URL. |
| "No roles assigned" | Ask your admin to add your username to `assignments.json` in the config repository. |
| "No workspace folder open" | Open a folder/workspace in Cursor before syncing. |
| Sync completed with errors | Run **Cursor Config Sync: Show Log** to see detailed error messages. |
| SSL certificate errors | Your self-hosted instance may use a custom CA. Set the `NODE_EXTRA_CA_CERTS` environment variable to your CA bundle path before launching Cursor. |

---

## License

MIT
