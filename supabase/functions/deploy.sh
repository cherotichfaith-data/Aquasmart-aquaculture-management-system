#!/usr/bin/env bash
# Deploy all AquaSmart Edge Functions to Production and/or Kimbwela Farm
# Usage:
#   ./deploy.sh                     — deploy to production (linked project)
#   ./deploy.sh --project kimbwela  — deploy to Kimbwela Farm project ref
#   ./deploy.sh --all               — deploy to both projects
#
# Prerequisites: supabase CLI installed and authenticated (`supabase login`)
# Project refs:
#   Production:    dxihivdoxulrwxdwiemh
#   Kimbwela Farm: zakmibzkuvwlzrkgfmvx

set -euo pipefail

PROD_REF="dxihivdoxulrwxdwiemh"
KF_REF="zakmibzkuvwlzrkgfmvx"

FUNCTIONS=(
  parse-preview
  normalize
  normalize-water
  normalize-feeding
  normalize-mortality
  normalize-sampling
  normalize-harvest
  normalize-transfer
)

deploy_to() {
  local project_ref="$1"
  echo ""
  echo "=== Deploying to project: $project_ref ==="
  for fn in "${FUNCTIONS[@]}"; do
    echo "  → Deploying $fn..."
    supabase functions deploy "$fn" --project-ref "$project_ref"
    echo "    ✓ $fn deployed"
  done
  echo "=== All functions deployed to $project_ref ==="
}

case "${1:-}" in
  --all)
    deploy_to "$PROD_REF"
    deploy_to "$KF_REF"
    ;;
  --project)
    deploy_to "${2:-$PROD_REF}"
    ;;
  --kimbwela)
    deploy_to "$KF_REF"
    ;;
  *)
    deploy_to "$PROD_REF"
    ;;
esac
