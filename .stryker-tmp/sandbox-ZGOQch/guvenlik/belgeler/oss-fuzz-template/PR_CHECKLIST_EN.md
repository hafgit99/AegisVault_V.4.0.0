# OSS-Fuzz PR Checklist (Aegis Vault)

## Before opening PR

- [ ] `project.yaml` has valid maintainer emails.
- [ ] `language` is set to `javascript`.
- [ ] `Dockerfile` clones the correct public repository.
- [ ] `build.sh` finishes successfully in local OSS-Fuzz helper run.
- [ ] Fuzz targets are focused on parser/decoder/adapter logic (not UI/runtime-only code).
- [ ] Harnesses handle expected parser exceptions without exiting the process.
- [ ] Initial corpus exists for each fuzz target.

## Local validation commands (from OSS-Fuzz checkout)

```bash
python3 infra/helper.py build_image aegis-vault
python3 infra/helper.py build_fuzzers aegis-vault
python3 infra/helper.py check_build aegis-vault
python3 infra/helper.py run_fuzzer aegis-vault import_csv_fuzz
```

## PR description template

Title:
`Add Aegis Vault (JavaScript) to OSS-Fuzz`

Body:

1. Project summary and security relevance.
2. Attack surface covered by fuzz targets.
3. Local helper outputs (`build_fuzzers`, `check_build`, `run_fuzzer`).
4. Maintainer contact and triage commitment.
