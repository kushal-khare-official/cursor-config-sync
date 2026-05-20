## Cursor Cloud specific instructions

This is a **VS Code / Cursor IDE extension** (TypeScript, esbuild, zero runtime dependencies). There is no backend, database, or Docker involved.

### Key commands

| Task | Command |
|---|---|
| Install deps | `npm ci` |
| Type-check (lint) | `npm run lint` |
| Build | `npm run compile` |
| Watch (dev) | `npm run watch` |
| Package `.vsix` | `npx vsce package --no-git-tag-version` |

### Caveats

- The `vscode` module is only available inside the VS Code extension host. You **cannot** `require()` the built `dist/extension.js` from a plain Node.js process; it will throw `MODULE_NOT_FOUND` for `vscode`. This is expected.
- There is **no test framework** in this repo (no `test/` directory, no test runner). Validation is limited to `npm run lint` (TypeScript type-check) and `npm run compile` (esbuild bundle).
- The extension communicates with external GitLab/GitHub APIs using Node.js built-in `fetch()`. End-to-end testing requires a real Git instance with a config repo and a PAT — this is not feasible in a headless cloud agent environment.
- `.vsix` packaging with `npx vsce package --no-git-tag-version` is the best available "hello world" proof that the extension builds correctly end-to-end.
