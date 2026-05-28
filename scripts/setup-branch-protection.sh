#!/usr/bin/env bash
# ==============================================================================
# Setup branch protection rules for CoopWork repo
#
# Requires: GitHub CLI (gh) authenticated with repo admin access
# Usage: ./scripts/setup-branch-protection.sh <owner/repo>
# Example: ./scripts/setup-branch-protection.sh MeuOrg/coopwork
# ==============================================================================

set -euo pipefail

REPO="${1:-}"
if [[ -z "$REPO" ]]; then
  echo "Usage: $0 <owner/repo>"
  exit 1
fi

BRANCH="main"

echo "Setting up branch protection for ${REPO}:${BRANCH}..."

gh api \
  --method PUT \
  "/repos/${REPO}/branches/${BRANCH}/protection" \
  --field required_status_checks='{"strict":true,"contexts":["Lint","Type-check","Build"]}' \
  --field enforce_admins=false \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
  --field restrictions=null \
  --field allow_force_pushes=false \
  --field allow_deletions=false \
  --field required_conversation_resolution=true

echo "✅ Branch protection configured:"
echo "   - Required status checks: Lint, Type-check, Build"
echo "   - Require 1 review approval"
echo "   - Dismiss stale reviews on new push"
echo "   - No force pushes allowed"
echo "   - Require conversation resolution"
