#!/bin/bash -eu

cd "$SRC/aegis-vault"

# Install dependencies required by parser and transformation code.
npm ci --ignore-scripts

# Copy fuzz harnesses into repository checkout to keep paths stable for compile_javascript_fuzzer.
mkdir -p "$SRC/aegis-vault/oss_fuzz_targets"
cp -r "$SRC/fuzz_targets/." "$SRC/aegis-vault/oss_fuzz_targets/"

# Build TypeScript sources used by fuzz harnesses.
npx tsc -b

# Compile JavaScript fuzzers.
# IMPORTANT:
# - Keep fuzz target names stable once submitted.
# - Ensure each harness validates input length and catches expected parse exceptions.
compile_javascript_fuzzer aegis-vault oss_fuzz_targets/import_csv_fuzz.cjs
compile_javascript_fuzzer aegis-vault oss_fuzz_targets/import_json_fuzz.cjs
compile_javascript_fuzzer aegis-vault oss_fuzz_targets/canonical_adapters_fuzz.cjs
compile_javascript_fuzzer aegis-vault oss_fuzz_targets/qr_sync_payload_fuzz.cjs

# Optional: include dictionaries if added later.
# cp "$SRC/fuzz_targets/dictionaries/csv.dict" "$OUT/"
