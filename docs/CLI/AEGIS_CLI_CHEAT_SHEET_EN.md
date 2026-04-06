# Aegis CLI Cheat Sheet (EN)

## Getting Started

```bash
npm run cli -- help
npm run cli -- pair
npm run cli -- status
```

## List and Search

```bash
npm run cli -- list --limit 25
npm run cli -- list --query github
npm run cli -- list --scope trash
npm run cli -- list --searchScope title
```

## Entry Operations

```bash
# Get
npm run cli -- get 12

# Add
npm run cli -- add --title "GitHub" --username "user@example.com" --pass "StrongPass123!" --website "https://github.com"

# Update
npm run cli -- update 12 --pass "NewStrongPass!"

# Delete / Restore
npm run cli -- delete 12
npm run cli -- restore 12
```

## Trash

```bash
npm run cli -- empty-trash
```

## Language and JSON

```bash
npm run cli -- status --lang tr
npm run cli -- status --lang en
npm run cli -- list --json
```

## Pairing

```bash
npm run cli -- unpair
npm run cli -- pair
```

## Common Errors

- `Run aegis-cli pair...`: run `pair` first.
- `VAULT_LOCKED`: unlock vault in desktop app.
- `NATIVE_BRIDGE_TIMEOUT`: verify app/bridge availability.
