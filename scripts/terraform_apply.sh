#!/usr/bin/env bash
# Terraform apply helper. Applies tfplan if present; otherwise runs apply directly.
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

# Init to ensure plugins/backends present (idempotent)
terraform init -backend-config=backend.hcl

if [ -f tfplan ]; then
  terraform apply -auto-approve tfplan
else
  terraform apply -auto-approve
fi

