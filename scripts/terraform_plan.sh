#!/usr/bin/env bash
# Terraform plan helper that treats exit code 2 (changes present) as success and writes plan.txt
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TF_DIR="$ROOT_DIR/terraform"

cd "$TF_DIR"

# Ensure backend config exists
if [ ! -f backend.hcl ]; then
  if [ -f backend.hcl.example ]; then
    cp backend.hcl.example backend.hcl
  fi
fi

# Init and validate
terraform init -backend-config=backend.hcl
terraform validate

# Run plan with detailed exit code; treat 0 and 2 as success
set +e
terraform plan -out=tfplan -detailed-exitcode
CODE=$?
set -e

if [ "$CODE" -eq 1 ]; then
  echo "Terraform plan failed (exit 1)." >&2
  exit 1
fi

# Create human-readable plan
terraform show -no-color tfplan > plan.txt

# Exit 0 whether changes (2) or not (0)
exit 0

