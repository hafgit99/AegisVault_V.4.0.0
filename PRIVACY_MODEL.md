# Aegis Vault Privacy Model

Last updated: 2026-05-07

Aegis Vault is designed around local-first privacy. The default posture is that vault contents remain on the user's device and optional online integrations are scoped, visible, and user-controlled.

## Privacy Principles

- Store and decrypt vault data locally.
- Avoid sending plaintext secrets to third-party services.
- Make networked checks optional and explain their data exposure.
- Prefer k-anonymity and scoped metadata over raw secret transmission.
- Give the user site-level control over autofill behavior.
- Separate identity, alias, passkey, crypto, and sharing contexts in the UI.

## Data Categories

| Category            | Examples                                     | Default handling                               |
| ------------------- | -------------------------------------------- | ---------------------------------------------- |
| Vault secrets       | Passwords, TOTP seeds, notes, crypto secrets | Encrypted locally                              |
| Site metadata       | Domain, title, username, category            | Encrypted in vault; limited extension exposure |
| Passkey metadata    | RP ID, origin, credential ID                 | Visible for local audit; encrypted in vault    |
| Alias data          | Masked email, provider, rotation state       | Encrypted locally; provider API optional       |
| HIBP check material | Password hash prefix/range query             | Optional k-anonymity mode                      |
| Sync payload        | Encrypted vault envelope                     | Relay receives ciphertext                      |
| Backup artifacts    | Encrypted or plaintext export files          | User-controlled local files                    |

## Browser Extension Privacy

The WXT browser extension is a high-sensitivity boundary because it runs near arbitrary web pages.

Controls:

- Domain-scoped credential lookup.
- Site autofill policy: allow, ask, or block.
- HTTPS/insecure-page review before filling sensitive fields.
- User confirmation for risky fill contexts.
- Friendly passkey/WebAuthn error messages without exposing unnecessary secret data.
- Chrome and Firefox builds use the same extension manifest version source.

The extension should not expose the full vault to a page. It should only handle the minimum records needed for the active domain and action.

## HIBP And Breach Checks

HIBP support should operate in a privacy-preserving way:

- Prefer k-anonymity range checks.
- Do not send plaintext passwords.
- Make HIBP activation clear in privacy/security settings.
- Allow users to keep breach checks disabled when strict offline privacy is required.

## Alias Privacy

Aegis includes alias privacy tooling for masked email workflows:

- provider profile management
- alias generation and notes
- exposure/risk tracking
- rotation recommendations
- provider API support where configured

Provider APIs are optional. Users should understand that alias providers may process alias metadata according to their own policies.

## Sync Relay Privacy

The optional relay model is zero-knowledge by design:

- Relay stores/transports encrypted envelopes.
- Client controls encryption/decryption.
- Relay should not receive master passwords or plaintext vault records.
- Pairing and sequence/replay controls are part of the device trust model.

See [docs/2026-03-25_AEGIS_SYNC_PROTOCOL_V1_TR.md](docs/2026-03-25_AEGIS_SYNC_PROTOCOL_V1_TR.md).

## Crypto Vault Privacy

Crypto public addresses can reveal balances and transaction history on public blockchains. Even watch-only data should be treated as sensitive metadata.

Recommended handling:

- Use labels and notes carefully.
- Avoid storing unnecessary real-world identity context.
- Verify addresses externally before sending funds.
- Prefer watch-only mode unless encrypted recovery custody is required.

## User Controls

Aegis privacy controls should continue to support:

- dark/light UI without hiding risk labels
- Turkish/English language support
- site-level autofill policy
- alias privacy panel
- HIBP privacy mode toggle
- encrypted backup preference
- manual approval for sensitive actions

## Residual Privacy Risks

- A malicious operating system or browser can observe user actions.
- Public blockchain addresses are inherently linkable.
- Alias provider and HIBP network access may reveal limited metadata.
- Plaintext exports are user-controlled and can leak if stored insecurely.
- Web pages may change forms to trick autofill, so site policy controls remain important.
