# Crypto Vault Security Model

Last updated: 2026-05-07

Crypto Vault is a secure record domain inside Aegis Vault for crypto asset documentation and custody notes. It is not a live wallet, hot wallet, trading tool, or transaction signing engine.

## Product Decision

Aegis intentionally implements:

- Crypto Vault + watch-only records
- encrypted seed/private key custody when explicitly selected
- address and chain metadata validation
- backup/export preservation
- phishing-aware copy warnings

Aegis intentionally does not implement:

- live private-key signing
- transaction broadcast
- swap/trading
- custody of funds on a server
- automatic balance authority from a hosted backend

## Custody Modes

| Mode         | Stored data                                  | Default | Risk  |
| ------------ | -------------------------------------------- | ------- | ----- |
| Watch-only   | Public address, chain, xpub/ypub/zpub, notes | Yes     | Lower |
| Vault secret | Encrypted seed phrase or private key         | No      | High  |

Watch-only mode is recommended. Secret mode is for users who knowingly want Aegis to store recovery material inside the encrypted vault.

## Security Controls

- Watch-only security banner clarifies that private keys are not required.
- Secret mode requires explicit user selection.
- Chain/address validation warns on network mismatch.
- xpub/ypub/zpub values are treated as extended public keys, not spend authority.
- Address copy actions include phishing/clipboard warnings.
- Backup/export warnings distinguish watch-only records from encrypted secret records.
- Import/export tests include crypto wallet record preservation.
- Mutation testing for the crypto wallet domain has an 80% break threshold.

## Supported Record Semantics

Crypto Vault records may include:

- wallet name
- chain/network
- public address
- custody mode
- derivation path
- xpub/ypub/zpub or public tracking key
- manual balance notes
- risk/custody notes
- encrypted seed/private key material when selected

## Threats And Mitigations

| Threat                                  | Mitigation                                                                |
| --------------------------------------- | ------------------------------------------------------------------------- |
| User mistakes Aegis for a hot wallet    | UI states "no signing/broadcast"; watch-only default                      |
| Wrong-chain address is saved            | Format validation and chain mismatch warning                              |
| Clipboard substitution malware          | Phishing warning after copy; user must verify external wallet destination |
| Plaintext export leaks seed/private key | Explicit plaintext export warning; encrypted backup recommended           |
| Backup loses crypto metadata            | Canonical backup/import coverage includes crypto wallet fields            |
| xpub misunderstood as private key       | Extended public key labels and watch-only explanatory text                |

## Backup And Export Rules

Encrypted backups should preserve both watch-only and secret records.

Plaintext exports are high risk when they contain:

- seed phrases
- private keys
- derivation paths tied to recovery material
- notes that reveal storage locations

Users should delete plaintext exports immediately after migration.

## Future Live Wallet Boundary

If Aegis ever introduces live wallet functionality, it should be a separate product/security domain with:

- dedicated transaction signing threat model
- hardware-wallet-first design
- transaction simulation and allowlist controls
- chain-specific parser tests
- independent audit before release

Until then, Crypto Vault must remain non-signing and watch-only by default.
