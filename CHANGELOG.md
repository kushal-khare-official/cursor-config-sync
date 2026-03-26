# Changelog

All notable changes to Cursor Config Sync will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-03-26

### Fixed
- Skills are now synced into sub-folders preserving their directory structure instead of being flattened into the skills root. Each skill's folder (containing `SKILL.MD` and supporting files) is correctly created under `.cursor/skills/`.

## [0.1.0] - 2026-02-28

### Added
- Initial release
- Sync Cursor rules (`.mdc`), commands, skills, hooks, and MCP server config from a self-hosted GitLab or GitHub repository
- Role-based configuration: admin assigns roles to users via `assignments.json`
- Support for both **GitLab** (REST API v4 with pagination) and **GitHub Enterprise** (REST API v3, Git Trees API)
- `manifest.json` support to override default role folder paths
- `shared/` folder support for config applied to all roles as a baseline
- Merge strategies: file overwrite by name for rules/commands/skills, additive merge for MCP servers, last-role-wins for hooks
- **Setup wizard**: multi-step QuickPick for first-time configuration
- **PAT authentication**: stored securely in OS keychain via VS Code SecretStorage
- **Preview Changes**: diff view of what will change before syncing, using VS Code's built-in diff editor
- **Status bar**: shows sync state and current role; click to re-sync
- **Auto-sync on workspace open** (opt-in setting)
- **Sync lock**: prevents concurrent syncs from corrupting files
- Output channel logging with timestamps
