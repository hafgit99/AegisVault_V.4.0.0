# Aegis CLI Usage Guide (EN)

Date: April 1, 2026  
Version: Aegis CLI v1 (compatible with Aegis Vault 4.2.x)

## 1. Overview

Aegis CLI lets you manage your vault from the command line through the secure desktop bridge.

Core capabilities:

- CLI-desktop pairing (`pair`)
- Status checks (`status`)
- Entry listing/search (`list`)
- Entry retrieval (`get`)
- Entry create/update/delete/restore
- Trash cleanup
- Bilingual output (`--lang tr|en`)

## 2. Prerequisites

- Aegis desktop app is installed and running.
- Native bridge is available.
- Run commands from project root:

```bash
npm run cli -- help
```

Note: On first run, CLI creates a local config file:

- Windows: `C:\Users\<user>\.aegis-vault\cli-config.json`
- macOS/Linux: `~/.aegis-vault/cli-config.json`

## 3. Security Model (Short)

- Requests are signed with ECDSA P-256.
- Desktop verifies CLI identity and signature.
- Mutating commands are blocked while vault is locked.
- `pair` establishes a persistent trust relationship.

## 4. Quick Start

```bash
# 1) Help
npm run cli -- help

# 2) Pair
npm run cli -- pair

# 3) Check status
npm run cli -- status

# 4) List entries
npm run cli -- list --limit 25
```

## 5. Command Reference

## 5.1 help

Shows usage and command list.

```bash
npm run cli -- help
```

## 5.2 pair

Creates CLI-to-desktop pairing (first step).

```bash
npm run cli -- pair
```

## 5.3 status

Shows pairing and vault status.

```bash
npm run cli -- status
```

Output fields:

- `paired`: whether CLI is paired
- `isUnlocked`: whether vault is unlocked
- `entryCount`: entry count

## 5.4 language

Reads desktop UI language via bridge.

```bash
npm run cli -- language
```

## 5.5 list

Lists entries with optional filters/search.

```bash
npm run cli -- list --limit 50
npm run cli -- list --query github
npm run cli -- list --category General
npm run cli -- list --scope trash
npm run cli -- list --searchScope title
```

Supported options:

- `--query <text>`
- `--category <category>`
- `--scope active|trash`
- `--searchScope all|title|username|tags`
- `--limit <number>` (recommended 1-200)
- `--json` (raw JSON output)

## 5.6 get <id>

Fetches a single entry by ID.

```bash
npm run cli -- get 12
```

## 5.7 add

Creates a new vault entry.

```bash
npm run cli -- add --title "GitHub" --username "user@example.com" --pass "StrongPass123!" --website "https://github.com"
```

Options:

- Required: `--title`, `--pass`
- Optional: `--username`, `--website`, `--category`, `--tags`

Comma-separated tags:

```bash
npm run cli -- add --title "Mail" --pass "..." --tags "work,email,critical"
```

## 5.8 update <id>

Updates an existing entry (only provided fields are changed).

```bash
npm run cli -- update 12 --pass "NewStrongPass!"
npm run cli -- update 12 --title "GitHub Personal" --tags "personal,dev"
```

## 5.9 delete <id>

Moves entry to trash (not hard delete).

```bash
npm run cli -- delete 12
```

## 5.10 restore <id>

Restores entry from trash.

```bash
npm run cli -- restore 12
```

## 5.11 empty-trash

Permanently empties trash.

```bash
npm run cli -- empty-trash
```

## 5.12 unpair

Removes CLI pairing.

```bash
npm run cli -- unpair
```

## 6. Language Options (CLI Output)

Switch CLI output language per command:

```bash
npm run cli -- status --lang tr
npm run cli -- status --lang en
```

Use with:

- `list`, `get`, `add`, `update`, `delete`, `restore`, `empty-trash`, `pair`, `status`

## 7. JSON Output for Automation

Use `--json` for scripts:

```bash
npm run cli -- list --limit 10 --json
npm run cli -- get 12 --json
```

PowerShell example:

```powershell
$raw = npm run cli -- list --limit 10 --json
$obj = $raw | ConvertFrom-Json
$obj.data | Format-Table id,title,username,website
```

## 8. Troubleshooting

## 8.1 Pairing required error

Symptom:

- `Run aegis-cli pair before this operation.`

Fix:

1. `npm run cli -- pair`
2. Retry command

## 8.2 `VAULT_LOCKED`

Symptom:

- List/CRUD commands fail with lock-related error

Fix:

1. Open Aegis desktop
2. Unlock vault
3. Retry command

## 8.3 `FORBIDDEN_EXTENSION_ID`

Symptom:

- Bridge allowlist rejection

Fix:

1. Check native host allowlist setup
2. Optionally set `AEGIS_CLI_EXTENSION_ID` for a valid ID

## 8.4 `NATIVE_BRIDGE_TIMEOUT` / `NATIVE_BRIDGE_EOF`

Symptom:

- Bridge timeout/disconnect

Fix:

1. Ensure desktop app is running
2. Restart native bridge
3. Retry

## 9. Advanced Notes

- Use a custom CLI identity:

```bash
npm run cli -- status --extensionId "aegisvault-cli@local"
```

- Show trash entries only:

```bash
npm run cli -- list --scope trash --limit 200
```

- Quick search:

```bash
npm run cli -- list --query "github"
```

## 10. Recommended Daily Flow

1. `pair` (one-time)
2. `status` (session start)
3. `list --query ...`
4. `add` or `update`
5. `delete` / `restore` when needed
