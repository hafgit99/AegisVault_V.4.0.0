# OSS-Fuzz Submission Templates (Aegis Vault)

These files are ready-to-edit templates for creating a new project submission in the `google/oss-fuzz` repository.

## Files

1. `project.yaml.template`
2. `Dockerfile.template`
3. `build.sh.template`
4. `PR_CHECKLIST_EN.md`

## How to use

1. Fork `https://github.com/google/oss-fuzz`.
2. Create directory: `projects/aegis-vault/`.
3. Copy template files into that directory and remove `.template` suffix.
4. Adjust maintainer email, repository URL, and fuzz target names.
5. Build and test locally with OSS-Fuzz helper scripts before opening PR.

## References

- OSS-Fuzz JavaScript integration guide: `https://google.github.io/oss-fuzz/getting-started/new-project-guide/javascript-lang/`
- OSS-Fuzz getting started: `https://google.github.io/oss-fuzz/getting-started/`
